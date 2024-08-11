<script setup>
import {onMounted, reactive, watch} from "vue";
import * as zip from "@zip.js/zip.js";
import FileSaver from "file-saver";
import pako from 'pako';
import {store} from "../js/state.js";
import {generateFirmware} from "../js/firmware.js";
import {VCardSubtitle, VCardTitle} from "vuetify/components";

watch(() => store.currentStep, (_new, _old) => {
  if (_new === 4) buildFirmware()
})

onMounted(() => buildFirmware())

const files = reactive({
  firmwareFiles: [],
  config: null,
  firmwareUrl: '',
  options: {}
})

async function buildFirmware() {
  const [binary, {config, firmwareUrl, options}] = await generateFirmware()

  files.firmwareFiles = binary
  files.firmwareUrl = firmwareUrl
  files.config = config
  files.options = options
}

async function downloadFirmware() {
  if (store.target.config.platform === 'esp8285') {
    const bin = pako.gzip(files.firmwareFiles[files.firmwareFiles.length - 1].data)
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, 'firmware.bin.gz')
  } else if (store.target.config.upload_methods.includes('zip')) {
    // create zip file
    const zipper = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {bufferedWrite: true})
    await zipper.add('bootloader.bin', new Blob([files.firmwareFiles[0].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('partitions.bin', new Blob([files.firmwareFiles[1].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('boot_app0.bin', new Blob([files.firmwareFiles[2].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('firmware.bin', new Blob([files.firmwareFiles[3].data.buffer], {type: 'application/octet-stream'}).stream())
    FileSaver.saveAs(await zipper.close(), 'firmware.zip')
  } else {
    const bin = files.firmwareFiles[files.firmwareFiles.length - 1].data.buffer
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, 'firmware.bin')
  }
}
</script>

<template>
  <VCardTitle>Download Firmware File(s)</VCardTitle>
  <VCardSubtitle>The firmware file(s) have been configured for your <b>{{ store.target?.config?.product_name }}</b> with
    the specified options.
  </VCardSubtitle>
  <VCardText v-if="store.target.config.platform === 'esp8285'">
    The firmware file <b>firmware.bin.gz</b> should be flashed as-as, do NOT decompress or unzip the file or you <i>will</i> receive an error.
  </VCardText>
  <VCardText v-else-if="store.target.config.upload_methods.includes('zip')">
    The firmware files are contained in the <b>firmware.zip</b> file and should be extracted before being uploaded to the device for flashing.
  </VCardText>
  <br>
  <VBtn color="primary" @click="downloadFirmware()">Download</VBtn>
</template>
