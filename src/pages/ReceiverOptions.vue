<script setup>
import {VCheckbox, VTextField, VCardTitle, VCardSubtitle} from "vuetify/components";
import {store} from "../js/state.js";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import RFSelect from "../components/RFSelect.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";

function has(feature) {
  return store.target?.config?.features?.includes(feature)
}
</script>

<template>
  <VCardTitle>Receiver Options</VCardTitle>
  <VCardSubtitle>Set the flashing options and method for your <b>{{store.target?.config?.product_name}}</b></VCardSubtitle>
  <br>
  <BindPhraseInput v-model="store.options.uid"/>
  <RFSelect v-model:region="store.options.region" v-model:domain="store.options.domain" :radio="store.radio"/>
  <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                     v-model:wifi-on-interval="store.options.wifiOnInternal"
                     v-if="store.target?.config?.platform!=='stm32'"/>

  <VTextField v-model="store.options.rx.uartBaud" label='UART baud rate' density="comfortable"/>
  <VCheckbox v-model="store.options.rx.lockOnFirstConnect" label='Lock on first connection' density="comfortable"/>
  <VCheckbox v-model="store.options.rx.r9mmMiniSBUS" label='Use SBUS Pins as UART' density="comfortable"
             v-if="has('sbus-uart')"/>
  <VTextField v-model="store.options.rx.fanMinRuntime" label='Minimum fan runtime (seconds)' density="comfortable"
              v-if="has('fan')"/>

  <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>
</template>