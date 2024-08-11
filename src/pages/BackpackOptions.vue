<script setup>
import {VCardTitle, VCardSubtitle} from "vuetify/components";
import {store} from "../js/state.js";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import {watch} from "vue";

function setTargetName() {
  if (store.targetType === 'txbp') {
    store.name = store.target?.config?.product_name + " Backpack"
  }
  else if (store.targetType === 'vrx') {
    store.name = store.vendor_name + " " + store.target?.config?.product_name
  }
  else if (store.targetType === 'aat') {
    store.name = store.vendor_name
  }
  else if (store.targetType === 'timer') {
    store.name = store.vendor_name
  }
  else {
    store.name = store.target?.config?.product_name
  }
}
watch(() => store.targetType, setTargetName)
watch(() => store.target?.config?.product_name, setTargetName)
watch(() => store.vendor_name, setTargetName)

</script>

<template>
  <VCardTitle>Backpack Options</VCardTitle>
  <VCardSubtitle>Set the flashing options and method for your <b>{{store.name}}</b></VCardSubtitle>
  <br>
  <BindPhraseInput v-model="store.options.uid"/>
  <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                     v-model:wifi-on-interval="store.options.wifiOnInternal"
                     v-if="store.target?.config?.platform!=='stm32'"/>

  <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>
</template>