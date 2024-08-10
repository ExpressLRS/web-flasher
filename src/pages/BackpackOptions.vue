<script setup>
import {VCardTitle, VCardSubtitle} from "vuetify/components";
import {store} from "../state.js";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
</script>

<template>
  <VCardTitle>Receiver Options</VCardTitle>
  <VCardSubtitle>Set the flashing options and method for your <b>{{store.target?.config?.product_name}}</b></VCardSubtitle>
  <br>
  <BindPhraseInput v-model="store.options.uid"/>
  <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                     v-model:wifi-on-interval="store.options.wifiOnInternal"
                     v-if="store.target?.config?.platform!=='stm32'"/>

  <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>
</template>