<script setup>
import {ref, watchEffect} from "vue";
import * as zip from "@zip.js/zip.js";
import FileSaver from "file-saver";
import pako from 'pako';
import {store} from "../js/state.js";
import {generateFirmware} from "../js/firmware.js";

const DOWNLOAD_LOG_PREFIX = '[Download]'

watchEffect(buildFirmware)

let zipped = ref(false)
let fetchFailed = ref(false)
let fetchFailedMessage = ref('')

const files = {
  firmwareFiles: [],
  config: null,
  firmwareUrl: '',
  options: {}
}

async function buildFirmware() {
  if (store.currentStep === 3) {
    console.info(`${DOWNLOAD_LOG_PREFIX} buildFirmware:start`, {
      target: store.target?.target,
      platform: store.target?.config?.platform,
      version: store.version
    })
    try {
      const [binary, {config, firmwareUrl, options}] = await generateFirmware()

      files.firmwareFiles = binary
      files.firmwareUrl = firmwareUrl
      files.config = config
      files.options = options

      if (store.target.config.upload_methods.includes('zip') ||
          (store.targetType === 'vrx' && (store.vendor === 'hdzero-goggle' || store.vendor === 'hdzero-boxpro'))) { // or HDZero Goggles
        zipped.value = true
      }
      console.info(`${DOWNLOAD_LOG_PREFIX} buildFirmware:complete`, {
        fileCount: binary.length,
        firmwareUrl,
        zipped: zipped.value
      })
    } catch (error) {
      console.error(`${DOWNLOAD_LOG_PREFIX} buildFirmware:failed`, error)
      fetchFailedMessage.value = `Failed to fetch firmware files: ${error?.message ?? error}`
      fetchFailed.value = true
    }
  }
}

async function downloadFirmware() {
  console.info(`${DOWNLOAD_LOG_PREFIX} download:start`, {
    platform: store.target?.config?.platform,
    zipped: zipped.value,
    fileCount: files.firmwareFiles.length
  })
  if (store.target.config.platform === 'esp8285') {
    const bin = pako.gzip(files.firmwareFiles[files.firmwareFiles.length - 1].data)
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, 'firmware.bin.gz')
    console.info(`${DOWNLOAD_LOG_PREFIX} download:complete`, {output: 'firmware.bin.gz'})
  } else if (zipped.value) {
    // create zip file
    const zipper = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {bufferedWrite: true})
    await zipper.add('bootloader.bin', new Blob([files.firmwareFiles[0].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('partitions.bin', new Blob([files.firmwareFiles[1].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('boot_app0.bin', new Blob([files.firmwareFiles[2].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('firmware.bin', new Blob([files.firmwareFiles[3].data.buffer], {type: 'application/octet-stream'}).stream())
    FileSaver.saveAs(await zipper.close(), 'firmware.zip')
    console.info(`${DOWNLOAD_LOG_PREFIX} download:complete`, {output: 'firmware.zip'})
  } else {
    const bin = files.firmwareFiles[files.firmwareFiles.length - 1].data.buffer
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, 'firmware.bin')
    console.info(`${DOWNLOAD_LOG_PREFIX} download:complete`, {output: 'firmware.bin'})
  }
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Download Firmware File(s)</VCardTitle>
    <VCardText>The firmware file(s) have been configured for your <b>{{ store.target?.config?.product_name }}</b> with
      the specified options.
      <br/>
      To flash the firmware file to your device, put it into WiFi mode and connect to it via the browser
      then upload the <b>firmware.bin{{ store.target.config.platform === 'esp8285' ? '.gz' : '' }}</b> file on the
      <b>Update</b> tab.
    </VCardText>
    <VCardText v-if="store.target.config.platform === 'esp8285'">
      The firmware file <b>firmware.bin.gz</b> should be flashed as-is, do NOT decompress or unzip the file or you <i>will</i>
      receive an error.
    </VCardText>
    <VCardText v-else-if="zipped">
      The firmware files are contained in the <b>firmware.zip</b> file and should be extracted before being uploaded to
      the device for flashing.
    </VCardText>
    <br>
    <VBtn color="primary" @click="downloadFirmware()">Download</VBtn>

    <VSnackbar v-model="fetchFailed" vertical color="red-darken-3" content-class="td-error-snackbar">
      <div class="text-subtitle-1 pb-2">Firmware Fetch Failed</div>

      <p>{{ fetchFailedMessage }}</p>
      <template v-slot:actions>
        <VBtn variant="text" color="white" @click="fetchFailed = false">✕</VBtn>
      </template>
    </VSnackbar>
  </VContainer>
</template>
