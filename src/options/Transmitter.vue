<script setup>
import {ref, watch} from "vue";
import {VCheckbox, VTextField, VSelect, VCardTitle, VCardSubtitle, VRow, VCol} from "vuetify/components";
import {store} from "../state.js";
import {uidBytesFromText} from "../phrase.js";

const regions = [
  {value: 'fcc', title: 'FCC'},
  {value: 'lbt', title: 'LBT'}
]
const domains = [
  {value: 0, title: 'AU915'},
  {value: 1, title: 'FCC915'},
  {value: 2, title: 'EU868'},
  {value: 3, title: 'IN866'},
  {value: 4, title: 'AU433'},
  {value: 5, title: 'EU433'}
]
const melodyTypes = [
  {value: 0, title: 'Quiet, no beeps'},
  {value: 1, title: 'Just one beep'},
  {value: 2, title: 'No tune, just beeps'},
  {value: 3, title: 'Default tune'},
  {value: 4, title: 'Custom tune'}
]
const flashMethods = [
  {value: 'download', title: 'Local Download'},
  {value: 'uart', title: 'Serial UART'},
  {value: 'betaflight', title: 'Betaflight Passthrough'},
  {value: 'etx', title: 'EdgeTX Passthrough'},
  {value: 'passthru', title: 'Passthrough'},
  {value: 'wifi', title: 'WiFi'},
  {value: 'stlink', title: 'STLink'},
]
let bindPhrase = ref(null)
let region = ref('fcc')
let domain = ref(1)
let ssid = ref(null)
let password = ref(null)
let wifiOnInternal = ref(60)
let telemetryInterval = ref(240)
let uartInverted = ref(true)
let fanRuntime = ref(30)
let higherPower = ref(false)
let melodyType = ref(3)
let melodyTune = ref(null)
let flashMethod = ref(null)

function hasHighFrequency() {
  return store.radio && (store.radio.endsWith('2400') || store.radio.endsWith('dual'))
}

function hasLowFrequency() {
  return store.radio && (store.radio.endsWith('900') || store.radio.endsWith('dual'))
}

function has(feature) {
  return store.target?.config?.features?.includes(feature)
}

function getFlashMethods() {
  return flashMethods.filter(v => v.value==='download' || store.target?.config?.upload_methods?.includes(v.value))
}

let uid=ref('Bind Phrase')
function generateUID() {
  if (bindPhrase.value === '') uid.value='Bind Phrase'
  else uid.value = 'UID: ' + uidBytesFromText(bindPhrase.value)
}
</script>

<template>
  <VCardTitle>Transmitter Options</VCardTitle>
  <VCardSubtitle>Choose the hardware that you are flashing the firmware onto</VCardSubtitle>
  <br>
  <VTextField v-model="bindPhrase" :label="uid" density="comfortable" :oninput="generateUID"/>
  <VSelect v-model="region" label="Region" density="comfortable"
           :items="regions" v-if="hasHighFrequency()"/>
  <VSelect v-model="domain" label="Regulatory Domain" density="comfortable"
           :items="domains" v-if="hasLowFrequency()"/>
  <VTextField v-model="ssid" label="WiFi SSID" density="comfortable"
              v-if="store.target?.config?.platform!=='stm32'"/>
  <VTextField v-model="password" label="WiFi Password" density="comfortable"
              v-if="store.target?.config?.platform!=='stm32'"/>
  <VTextField v-model="wifiOnInternal" label='WiFi "auto on" interval (s)' density="comfortable"
              v-if="store.target?.config?.platform!=='stm32'"/>
  <VTextField v-model="telemetryInterval" label='TLM report interval (ms)' density="comfortable"
              v-if="store.target?.config?.platform!=='stm32'"/>
  <VCheckbox v-model="uartInverted" label="UART inverted" density="comfortable"
             v-if="store.target?.config?.platform==='stm32'"/>
  <VTextField v-model="fanRuntime" label='Fan runtime (s)' density="comfortable"
              v-if="has('fan')"/>
  <VTextField v-model="higherPower" label='Unlock higher power' density="comfortable"
              v-if="has('unlock-higher-power')"/>
  <VSelect v-model="melodyType" label="Beeper" density="comfortable"
           :items="melodyTypes" v-if="has('buzzer')"/>
  <VTextField v-model="melodyTune" label="Melody" density="comfortable"
              v-if="melodyType===4"/>
  <VSelect v-model="flashMethod" label="Flashing Method" density="comfortable"
           :items="getFlashMethods()"/>
</template>