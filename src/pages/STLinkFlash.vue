<script setup>
import {ref, watchPostEffect} from "vue";
import {resetState, store} from "../js/state.js";
import {generateFirmware} from "../js/firmware.js";
import {STLink} from "../js/stlink.js";

const STLINK_FLASH_LOG_PREFIX = '[STLinkFlash]'

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
  console.info(`${STLINK_FLASH_LOG_PREFIX} buildFirmware:start`, {
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
    console.info(`${STLINK_FLASH_LOG_PREFIX} buildFirmware:complete`, {
      fileCount: binary.length,
      firmwareUrl,
      deviceType
    })
    return true
  } catch (error) {
    console.error(`${STLINK_FLASH_LOG_PREFIX} buildFirmware:failed`, error)
    fetchFailedMessage.value = `Failed to fetch firmware files: ${error?.message ?? error}`
    fetchFailed.value = true
    return false
  }
}

let step = ref(1)
let enableFlash = ref(false)
let flashComplete = ref(false)
let failed = ref(false)
let log = ref([])
let newline = false

let noDevice = ref(false)
let fetchFailed = ref(false)
let fetchFailedMessage = ref('')
let device = null;

let progress = ref(0)
let progressText = ref('')

async function closeDevice() {
  console.debug(`${STLINK_FLASH_LOG_PREFIX} closeDevice:start`)
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
  console.debug(`${STLINK_FLASH_LOG_PREFIX} closeDevice:complete`)
}

async function connect() {
  console.info(`${STLINK_FLASH_LOG_PREFIX} connect:start`)
  try {
    if (device) await closeDevice()
    device = new STLink(term)
    await device.connect(store.target.config, async () => {
      await closeDevice()
    })
  } catch (e) {
    console.error(`${STLINK_FLASH_LOG_PREFIX} connect:failed`, e)
    term.writeln('Failed to connect to device, restart device and try again')
    failed.value = true
    noDevice.value = true
    return
  }

  step.value++
  enableFlash.value = true
  console.info(`${STLINK_FLASH_LOG_PREFIX} connect:ready`)
}

function reset() {
  closeDevice()
  resetState()
}

async function flash() {
  console.info(`${STLINK_FLASH_LOG_PREFIX} flash:start`, {fileCount: files.firmwareFiles.length})
  step.value++
  let lastProgressBucket = -1
  try {
    await device.flash(files.firmwareFiles, undefined, (fileIndex, written, total, msg) => {
      progressText.value = (fileIndex + 1) + ' of ' + (files.firmwareFiles.length) + ' (' + msg + ')'
      progress.value = Math.round(written / total * 100)
      const progressBucket = Math.floor(progress.value / 10)
      if (progressBucket > lastProgressBucket || progress.value === 100) {
        lastProgressBucket = progressBucket
        console.info(`${STLINK_FLASH_LOG_PREFIX} flash:progress`, {
          fileIndex: fileIndex + 1,
          totalFiles: files.firmwareFiles.length,
          progress: progress.value,
          message: msg
        })
      }
    })
    await device.close()
    device = null
    flashComplete.value = true
    step.value++
    console.info(`${STLINK_FLASH_LOG_PREFIX} flash:complete`)
  } catch (e) {
    console.error(`${STLINK_FLASH_LOG_PREFIX} flash:failed`, e)
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
        <div class="td-flash-log-wrap">
          <template v-for="line in log">
            <div class="td-flash-log-line">{{ line }}</div>
          </template>
        </div>
        <VBtn v-if="enableFlash && !failed" @click="flash" color="primary">Flash</VBtn>
        <VBtn v-if="enableFlash && failed" @click="flash" color="amber">Flash Anyway</VBtn>
        <VBtn v-if="failed" @click="closeDevice" color="red">Try Again</VBtn>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Flashing" value="3" :hide-actions="true" :complete="flashComplete"
                            :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
        <VRow>
          <VCol class="d-flex align-center flex-column flex-grow-0 flex-shrink-0">
            <VLabel>Flashing file {{ progressText }}</VLabel>
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
