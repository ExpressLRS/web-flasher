<script setup>
import {ref, watchEffect, nextTick} from "vue";
import * as zip from "@zip.js/zip.js";
import FileSaver from "file-saver";
import {store} from "../js/state.js";
import {generateFirmware} from "../js/firmware.js";
import CRC32 from "crc-32";

watchEffect(buildFirmware)

const files = {
  firmwareFiles: [],
  config: null,
  firmwareUrl: '',
  options: {}
}

const isPreparing = ref(false)
const preparingText = ref('Preparing your download… This may take a while.')

async function buildFirmware() {
  if (store.currentStep === 3) {
    const [binary, {config, firmwareUrl, options}] = await generateFirmware()

    files.firmwareFiles = binary
    files.firmwareUrl = firmwareUrl
    files.config = config
    files.options = options
  }
}

async function downloadFirmware() {
  try {
    isPreparing.value = true
    // Let the overlay render before heavy work begins
    await nextTick()

    if (store.target.config.platform === 'esp8285') {
      const buf = files.firmwareFiles[files.firmwareFiles.length - 1].data
      const { gzip } = await import('wasm-zopfli')
      const raw = await gzip(buf)
      // Zopfli may return a buffer with trailing bytes; trim to the exact GZIP end
      const footer = buildGzipFooter(buf)
      const sliced = sliceToGzipEnd(raw, footer)

      const data = new Blob([sliced], {type: 'application/octet-stream'})
      FileSaver.saveAs(data, 'firmware.bin.gz')
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
  } catch (e) {
    console.error('Failed: ', e)
  } finally {
    isPreparing.value = false
  }
}

// Compute the 8-byte GZIP footer for the original data: CRC32 (4 bytes LE) + ISIZE (4 bytes LE)
function buildGzipFooter(data) {
  const crc = CRC32.buf(data)
  const isize = data.length
  const out = new Uint8Array(8)
  const v = new DataView(out.buffer)
  v.setUint32(0, crc, true)
  v.setUint32(4, isize, true)
  return out
}

// Search backwards for the footer and slice the buffer to the exact gzip end
function sliceToGzipEnd(gzipBuf, footer) {
  const n = gzipBuf.length
  const m = footer.length
  outer: for (let i = n - m; i >= 0; i--) {
    for (let j = 0; j < m; j++) {
      if (gzipBuf[i + j] !== footer[j]) continue outer
    }
    return gzipBuf.slice(0, i + m)
  }
  return gzipBuf
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
  <VOverlay v-model="isPreparing" persistent scrim="rgba(0,0,0,0.75)" class="d-flex align-center justify-center">
    <VCard class="overlay-card text-primary" elevation="12">
      <div class="overlay-content">
        <div class="loader" aria-label="Loading"></div>
        <div class="preparing-text">{{ preparingText }}</div>
      </div>
    </VCard>
  </VOverlay>
</template>

<style scoped>
.overlay-card {
  max-width: 420px;
  width: calc(100% - 48px);
  padding: 24px;
  text-align: center;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* Content lives inside the card, so it doesn't need to fill the whole overlay */
  gap: 16px;
  text-align: center;
}

/* GIF-style dual ring spinner */
.loader {
  display: inline-block;
  width: 64px;
  height: 64px;
}
.loader:after {
  content: " ";
  display: block;
  width: 48px;
  height: 48px;
  margin: 8px auto;
  border-radius: 50%;
  border: 6px solid currentColor;
  border-color: currentColor transparent currentColor transparent;
  animation: loader-dual-ring 1.2s linear infinite;
}

@keyframes loader-dual-ring {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
