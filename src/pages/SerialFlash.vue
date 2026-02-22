<script setup>
import {ref, watchPostEffect} from "vue";
import {resetState, store} from "../js/state.js";
import {generateFirmware} from "../js/firmware.js";
import {XmodemFlasher} from "../js/xmodem.js";
import {ESPFlasher} from "../js/espflasher.js";
import {MismatchError, WrongMCU} from "../js/error.js";

const SERIAL_FLASH_LOG_PREFIX = '[SerialFlash]'

watchPostEffect(async (onCleanup) => {
  onCleanup(closeDevice)
  if (store.currentStep === 3) {
    const ok = await buildFirmware()
    if (ok) {
      await connect()
    }
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
  console.info(`${SERIAL_FLASH_LOG_PREFIX} buildFirmware:start`, {
    target: store.target?.target,
    platform: store.target?.config?.platform,
    version: store.version
  })
  try {
    const [binary, {config, firmwareUrl, options, deviceType, radioType, txType}] = await generateFirmware()

    files.firmwareFiles = binary
    files.firmwareUrl = firmwareUrl
    files.config = config
    files.options = options
    files.deviceType = deviceType
    files.radioType = radioType
    files.txType = txType
    fullErase.value = false
    allowErase.value = !(store.target.config.platform.startsWith('esp32') && store.options.flashMethod === 'betaflight')
    console.info(`${SERIAL_FLASH_LOG_PREFIX} buildFirmware:complete`, {
      fileCount: binary.length,
      firmwareUrl,
      deviceType,
      flashMethod: store.options.flashMethod
    })
    return true
  } catch (error) {
    console.error(`${SERIAL_FLASH_LOG_PREFIX} buildFirmware:failed`, error)
    fetchFailedMessage.value = `Failed to fetch firmware files: ${error?.message ?? error}`
    fetchFailed.value = true
    return false
  }
}

let step = ref(1)
let enableFlash = ref(false)
let allowErase = ref(true)
let fullErase = ref(false)
let flashComplete = ref(false)
let failed = ref(false)
let log = ref([])
let newline = false
let selectingSerial = ref(false)

let noDevice = ref(false)
let fetchFailed = ref(false)
let fetchFailedMessage = ref('')
let flasher;
let device = null;

let progress = ref(0)
let progressText = ref('')

async function closeDevice() {
  console.debug(`${SERIAL_FLASH_LOG_PREFIX} closeDevice:start`)
  if (flasher) {
    try {
      await flasher.close()
    } catch (error) {
    }
    flasher = null
    device = null
  }
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
  console.debug(`${SERIAL_FLASH_LOG_PREFIX} closeDevice:complete`)
}

async function connect() {
  console.info(`${SERIAL_FLASH_LOG_PREFIX} connect:start`, {flashMethod: store.options.flashMethod})
  selectingSerial.value = true
  try {
    device = await navigator.serial.requestPort()
    device.ondisconnect = async (_p, _e) => {
      console.warn(`${SERIAL_FLASH_LOG_PREFIX} device:disconnected`)
      await closeDevice()
    }
  } catch {
    console.warn(`${SERIAL_FLASH_LOG_PREFIX} connect:no-device-selected`)
    await closeDevice()
    noDevice.value = true
  } finally {
    selectingSerial.value = false
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
      console.info(`${SERIAL_FLASH_LOG_PREFIX} connect:ready`, {
        platform: store.target?.config?.platform,
        deviceType: files.deviceType
      })
    } catch (e) {
      if (e instanceof MismatchError) {
        term.writeln('Target mismatch, flashing cancelled')
        failed.value = true
        enableFlash.value = true
        console.warn(`${SERIAL_FLASH_LOG_PREFIX} connect:mismatch`, {error: e?.message})
      } else if (e instanceof WrongMCU) {
        term.writeln(e.message)
        failed.value = true
        console.warn(`${SERIAL_FLASH_LOG_PREFIX} connect:wrong-mcu`, {error: e?.message})
      } else {
        console.error(`${SERIAL_FLASH_LOG_PREFIX} connect:failed`, e)
        term.writeln('Failed to connect to device, restart device and try again')
        failed.value = true
      }
    }
  }
}

async function another() {
  await closeDevice()
  await connect()
}

async function reset() {
  await closeDevice()
  resetState()
}

async function flash() {
  console.info(`${SERIAL_FLASH_LOG_PREFIX} flash:start`, {
    fullErase: fullErase.value,
    fileCount: files.firmwareFiles.length,
    platform: files.config?.platform
  })
  failed.value = false
  step.value++
  let lastProgressBucket = -1
  try {
    progressText.value = ''
    await flasher.flash(files.firmwareFiles, fullErase.value, (fileIndex, written, total) => {
      progressText.value = (fileIndex + 1) + ' of ' + (files.firmwareFiles.length)
      progress.value = Math.round(written / total * 100)
      const progressBucket = Math.floor(progress.value / 10)
      if (progressBucket > lastProgressBucket || progress.value === 100) {
        lastProgressBucket = progressBucket
        console.info(`${SERIAL_FLASH_LOG_PREFIX} flash:progress`, {
          fileIndex: fileIndex + 1,
          totalFiles: files.firmwareFiles.length,
          progress: progress.value
        })
      }
    })
    await flasher.close()
    flasher = null
    device = null
    flashComplete.value = true
    step.value++
    console.info(`${SERIAL_FLASH_LOG_PREFIX} flash:complete`)
  } catch (e) {
    console.error(`${SERIAL_FLASH_LOG_PREFIX} flash:failed`, e)
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
        <VBtn @click="connect" color="primary" :disabled="selectingSerial">Connect</VBtn>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Enter flashing mode" value="2" :hide-actions="true" :complete="step > 2"
                            :color="step > 2 ? 'green' : (failed ? 'red' : 'blue')">
        <template v-for="line in log">
          <VLabel>{{ line }}</VLabel>
          <br/>
        </template>
        <VContainer v-if="failed || enableFlash">
          <br/>
          <VRow v-if="enableFlash && allowErase">
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
              <VBtn v-if="flashComplete" @click="another" color="primary">Flash Another</VBtn>
            </VCol>
            <VCol>
              <VBtn v-if="flashComplete" @click="reset" color="secondary">Back to Start</VBtn>
            </VCol>
          </VRow>
        </VContainer>
      </VStepperVerticalItem>
    </VStepperVertical>

    <VSnackbar v-model="noDevice" vertical color="red-darken-3" content-class="td-error-snackbar">
      <div class="text-subtitle-1 pb-2">No Device Selected</div>

      <p>A serial device must be selected to perform flashing.</p>
      <template v-slot:actions>
        <VBtn variant="text" color="white" @click="noDevice = false">✕</VBtn>
      </template>
    </VSnackbar>

    <VSnackbar v-model="fetchFailed" vertical color="red-darken-3" content-class="td-error-snackbar">
      <div class="text-subtitle-1 pb-2">Firmware Fetch Failed</div>

      <p>{{ fetchFailedMessage }}</p>
      <template v-slot:actions>
        <VBtn variant="text" color="white" @click="fetchFailed = false">✕</VBtn>
      </template>
    </VSnackbar>
  </VContainer>
</template>
