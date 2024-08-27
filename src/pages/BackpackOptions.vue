<script setup>
import {store} from "../js/state.js";
import {watchEffect} from "vue";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import WiFiAutoOn from "../components/WiFiAutoOn.vue";

watchEffect(() => {
  if (store.targetType === 'txbp') {
    store.name = store.target?.config?.product_name + " Backpack"
  } else if (store.targetType === 'vrx') {
    store.name = store.vendor_name + " " + store.target?.config?.product_name
  } else if (store.targetType === 'aat') {
    store.name = store.vendor_name
  } else if (store.targetType === 'timer') {
    store.name = store.vendor_name
  } else {
    store.name = store.target?.config?.product_name
  }
})
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Backpack Options</VCardTitle>
    <VCardText>Set the flashing options and method for your <b>{{ store.name }}</b></VCardText>
    <br>
    <BindPhraseInput v-model="store.options.uid"/>
    <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                       v-if="store.target?.config?.platform!=='stm32'"/>
    <WiFiAutoOn v-model="store.options.wifiOnInternal"/>

    <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>
  </VContainer>
</template>