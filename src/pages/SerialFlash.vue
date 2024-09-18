<script setup>
import {ref, watchPostEffect} from "vue";
import {resetState, store} from "../js/state.js";
import {generateFirmware} from "../js/firmware.js";
import {XmodemFlasher} from "../js/xmodem.js";
import {ESPFlasher} from "../js/espflasher.js";
import {MismatchError} from "../js/error.js";

watchPostEffect(async (onCleanup) => {
  onCleanup(closeDevice)
  if (store.currentStep === 3) {
    await buildFirmware()
    await connect()
  }
})

const files = {
  firmwareFiles: [],
  config: null,
  firmwareUrl: '',
  options: {},
  deviceType: null,
  radioType: undefined,
  txType: undefined
}

async function buildFirmware() {
  const [binary, {config, firmwareUrl, options, deviceType, radioType, txType}] = await generateFirmware()

  files.firmwareFiles = binary
  files.firmwareUrl = firmwareUrl
  files.config = config
  files.options = options
  files.deviceType = deviceType
  files.radioType = radioType
  files.txType = txType
  fullErase.value = false
}

let step = ref(1)
let enableFlash = ref(false)
let fullErase = ref(false)
let flashComplete = ref(false)
let failed = ref(false)
let log = ref([])
let newline = false

let noDevice = ref(false)
let flasher;
let device = null;

let progress = ref(0)
let progressText = ref('')

async function closeDevice() {
  if (device != null) {
    try {
      await device.close()
    } catch (error) {
    }
  }
  device = null
  enableFlash.value = false
  flashComplete.value = false
  failed.value = false
  step.value = 1
  log.value = []
  progress.value = 0
}

async function connect() {
  try {
    device = await navigator.serial.requestPort()
    device.ondisconnect = async (_p, _e) => {
      console.log("disconnected")
      await closeDevice()
    }
  } catch {
    await closeDevice()
    noDevice.value = true
  }

  if (device) {
    step.value++
    const method = store.options.flashMethod
    let term = {
      write: (e) => {
        if (newline) {
          log.value.push(e)
        } else {
          log.value[log.value.length - 1] = log.value[log.value.length - 1] + e
        }
        newline = false
      },
      writeln: (e) => {
        log.value.push(e)
        newline = true
      }
    }

    if (store.target.config.platform === 'stm32') {
      flasher = new XmodemFlasher(device, files.deviceType, method, files.config, files.options, files.firmwareUrl, term)
    } else {
      flasher = new ESPFlasher(device, files.deviceType, method, files.config, files.options, files.firmwareUrl, term)
    }
    try {
      await flasher.connect()
      enableFlash.value = true
    } catch (e) {
      if (e instanceof MismatchError) {
        term.writeln('Target mismatch, flashing cancelled')
        failed.value = true
        enableFlash.value = true
      } else {
        term.writeln('Failed to connect to device, restart device and try again')
        failed.value = true
      }
    }
  }
}

async function reset() {
  await closeDevice()
  resetState()
}

async function flash() {
  step.value++
  try {
    progressText.value = ''
    await flasher.flash(files.firmwareFiles, fullErase.value, (fileIndex, written, total) => {
      progressText.value = (fileIndex + 1) + ' of ' + (files.firmwareFiles.length)
      progress.value = Math.round(written / total * 100)
    })
    if (device != null) {
      await device.close()
    }
    device = null
    flashComplete.value = true
    step.value++
  } catch (e) {
    failed.value = true
  }
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Flash Firmware File(s)</VCardTitle>
    <VCardText>The firmware file(s) have been configured for your <b>{{ store.target?.config?.product_name }}</b> with
      the specified options.
    </VCardText>

    <VStepperVertical v-model="step" :hide-actions="true" flat>
      <VStepperVerticalItem title="Connect to serial UART" value="1" :hide-actions="true" :complete="step > 1"
                            :color="step > 1 ? 'green' : 'blue'">
        <VBtn @click="connect" color="primary">Connect</VBtn>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Enter flashing mode" value="2" :hide-actions="true" :complete="step > 2"
                            :color="step > 2 ? 'green' : (failed ? 'red' : 'blue')">
        <template v-for="line in log">
          <VLabel>{{ line }}</VLabel>
          <br/>
        </template>
        <VContainer v-if="failed || enableFlash">
          <br/>
          <VRow v-if="enableFlash">
            <VCheckbox v-model="fullErase" label="Full chip erase"/>
          </VRow>
          <VRow>
            <VCol v-if="enableFlash && !failed">
              <VBtn @click="flash" color="primary">Flash</VBtn>
            </VCol>
            <VCol v-if="enableFlash && failed">
              <VBtn @click="flash" color="amber">Flash Anyway</VBtn>
            </VCol>
            <VCol v-if="failed">
              <VBtn @click="closeDevice" color="red">Try Again</VBtn>
            </VCol>
          </VRow>
        </VContainer>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Flashing" value="3" :hide-actions="true" :complete="flashComplete"
                            :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
        <VRow>
          <VCol class="d-flex align-center flex-column flex-grow-0 flex-shrink-0">
            <VLabel v-if="progressText===''">Erasing flash, please wait...</VLabel>
            <VLabel v-else>Flashing file {{ progressText }}</VLabel>
            <br>
            <VProgressCircular :model-value="progress" :rotate="360" :size="100" :width="15"
                               :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
              <template v-slot:default> {{ progress }} %</template>
            </VProgressCircular>
            <div v-if="failed">
              <VLabel>Flash failed</VLabel>
            </div>
            <VBtn v-if="failed" @click="closeDevice" color="red">Try Again</VBtn>
          </VCol>
          <VCol cols="1" class="flex-grow-1 flex-shrink-0"/>
        </VRow>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Done" value="4" :hide-actions="true" :complete="flashComplete"
                            :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
        <VContainer>
          <VRow>
            <VCol>
              <VBtn v-if="flashComplete" @click="closeDevice" color="primary">Flash Another</VBtn>
            </VCol>
            <VCol>
              <VBtn v-if="flashComplete" @click="reset" color="secondary">Back to Start</VBtn>
            </VCol>
          </VRow>
        </VContainer>
      </VStepperVerticalItem>
    </VStepperVertical>

    <VSnackbar v-model="noDevice" vertical>
      <div class="text-subtitle-1 pb-2">No Device Selected</div>

      <p>A serial device must be selected to perform flashing.</p>
    </VSnackbar>
  </VContainer>
</template>
