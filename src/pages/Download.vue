<script setup>
import {watchEffect} from "vue";
import * as zip from "@zip.js/zip.js";
import FileSaver from "file-saver";
import { gzip } from "wasm-zopfli";
import {store} from "../js/state.js";
import {generateFirmware} from "../js/firmware.js";

watchEffect(buildFirmware)

const files = {
  firmwareFiles: [],
  config: null,
  firmwareUrl: '',
  options: {}
}

async function buildFirmware() {
  if (store.currentStep === 3) {
    const [binary, {config, firmwareUrl, options}] = await generateFirmware()

    files.firmwareFiles = binary
    files.firmwareUrl = firmwareUrl
    files.config = config
    files.options = options
  }
}

function trimZopfliBuffer(returnedBuf, originalSize) {
  // 1. Calculate the 4-byte ISIZE (Original length in Little Endian)
  const isize = originalSize % 0x100000000;
  const footer = new Uint8Array(4);
  new DataView(footer.buffer).setUint32(0, isize, true);

  // 2. Search backwards from the end of the buffer
  // We start searching from the end because the "garbage" is at the tail.
  for (let i = returnedBuf.length - 4; i >= 0; i--) {
    if (returnedBuf[i] === footer[0] &&
        returnedBuf[i + 1] === footer[1] &&
        returnedBuf[i + 2] === footer[2] &&
        returnedBuf[i + 3] === footer[3]) {

      // Found a potential match for the ISIZE.
      // The GZIP ends exactly here (at i + 4).
      return returnedBuf.slice(0, i + 4);
    }
  }
  return returnedBuf; // Fallback if not found
}

async function downloadFirmware() {
  if (store.target.config.platform === 'esp8285') {
    const buf = files.firmwareFiles[files.firmwareFiles.length - 1].data
    try {
      const raw = await gzip(buf)
      const cleanData = trimZopfliBuffer(raw, buf.length);
      const data = new Blob([cleanData], {type: 'application/octet-stream'})
      FileSaver.saveAs(data, 'firmware.bin.gz')
    } catch (e) {
      console.error("Failed: ", e)
    }
  } else if (store.target.config.upload_methods.includes('zip') ||
      (store.targetType === 'vrx' && store.vendor === 'hdzero-goggle')) { // or HDZero Goggles
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
    <VCardText v-else-if="store.target.config.upload_methods.includes('zip')">
      The firmware files are contained in the <b>firmware.zip</b> file and should be extracted before being uploaded to
      the device for flashing.
    </VCardText>
    <br>
    <VBtn color="primary" @click="downloadFirmware()">Download</VBtn>
  </VContainer>
</template>
