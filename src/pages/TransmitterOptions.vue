<script setup>
import {VCheckbox, VTextField, VCardTitle, VCardSubtitle} from "vuetify/components";
import {store} from "../js/state.js";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import RFSelect from "../components/RFSelect.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import MelodyInput from "../components/MelodyInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";

function has(feature) {
  return store.target?.config?.features?.includes(feature)
}
</script>

<template>
  <VCardTitle>Transmitter Options</VCardTitle>
  <VCardSubtitle>Set the flashing options and method for your <b>{{store.target?.config?.product_name}}</b></VCardSubtitle>
  <br>
  <BindPhraseInput v-model="store.options.uid"/>
  <RFSelect v-model:region="store.options.region" v-model:domain="store.options.domain" :radio="store.radio"/>
  <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                     v-model:wifi-on-interval="store.options.wifiOnInternal"
                     v-if="store.target?.config?.platform!=='stm32'"/>

  <VTextField v-model="store.options.tx.telemetryInterval" label='TLM report interval (milliseconds)'
              density="comfortable"/>
  <VCheckbox v-model="store.options.tx.uartInverted" label="UART inverted" density="comfortable"
             v-if="store.target?.config?.platform==='stm32'"/>
  <VTextField v-model="store.options.tx.fanMinRuntime" label='Minimum fan runtime (seconds)' density="comfortable"
              v-if="has('fan')"/>
  <VCheckbox v-model="store.options.tx.higherPower" label='Unlock higher power' density="comfortable"
             v-if="has('unlock-higher-power')"/>
  <MelodyInput v-model:melody-type="store.options.tx.melodyType" v-model:melody-tune="store.options.tx.melodyTune"
               v-if="has('buzzer')"/>

  <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>
</template>