<script setup>
import {ref} from "vue";
import {VCheckbox, VTextField, VSelect, VCardTitle, VCardSubtitle} from "vuetify/components";
import {store} from "../state.js";
import BindPhraseInput from "../components/BindPhraseInput.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import MelodyInput from "../components/MelodyInput.vue";
import RFSelect from "../components/RFSelect.vue";

let uid = ref(null)
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

function has(feature) {
  return store.target?.config?.features?.includes(feature)
}
</script>

<template>
  <VCardTitle>Transmitter Options</VCardTitle>
  <VCardSubtitle>Choose the hardware that you are flashing the firmware onto</VCardSubtitle>
  <br>
  <BindPhraseInput v-model="uid"/>
  <RFSelect v-model:region="region" v-model:domain="domain" :radio="store.radio"/>
  <WiFiSettingsInput v-model:ssid="ssid" v-model:password="password" v-model:wifi-on-interval="wifiOnInternal"
                     v-if="store.target?.config?.platform!=='stm32'"/>
  <VTextField v-model="telemetryInterval" label='TLM report interval (ms)' density="comfortable"/>
  <VCheckbox v-model="uartInverted" label="UART inverted" density="comfortable"
             v-if="store.target?.config?.platform==='stm32'"/>
  <VTextField v-model="fanRuntime" label='Fan runtime (s)' density="comfortable"
              v-if="has('fan')"/>
  <VCheckbox v-model="higherPower" label='Unlock higher power' density="comfortable"
              v-if="has('unlock-higher-power')"/>
  <MelodyInput v-model:melody-type="melodyType" v-model:melody-tune="melodyTune" v-if="has('buzzer')"/>
  <FlashMethodSelect v-model="flashMethod" :methods="store.target?.config?.upload_methods"/>
</template>