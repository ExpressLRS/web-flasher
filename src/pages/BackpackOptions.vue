<script setup>
import {onMounted, watch, ref} from 'vue';
import {store} from "../js/state.js";
import {getSettings, saveSettings, clearSettings as clearStoredSettings} from "../js/storage.js";
import {watchEffect} from "vue";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import WiFiAutoOn from "../components/WiFiAutoOn.vue";

const bindPhraseText = ref(null);

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
});

onMounted(() => {
  const savedSettings = getSettings();
  if (savedSettings) {
    if (savedSettings.uid !== undefined) store.options.uid = savedSettings.uid;
    if (savedSettings.bindPhraseText !== undefined) bindPhraseText.value = savedSettings.bindPhraseText;
    if (savedSettings.region !== undefined) store.options.region = savedSettings.region;
    if (savedSettings.domain !== undefined) store.options.domain = savedSettings.domain;
    if (savedSettings.ssid !== undefined) store.options.ssid = savedSettings.ssid;
    if (savedSettings.password !== undefined) store.options.password = savedSettings.password;
    if (savedSettings.wifiOnInternal !== undefined) store.options.wifiOnInternal = savedSettings.wifiOnInternal;
  }
});

function saveAllSettings() {
  const settings = getSettings() || {};
  settings.uid = store.options.uid;
  settings.bindPhraseText = bindPhraseText.value;
  settings.region = store.options.region;
  settings.domain = store.options.domain;
  settings.ssid = store.options.ssid;
  settings.password = store.options.password;
  settings.wifiOnInternal = store.options.wifiOnInternal;
  saveSettings(settings);
}

watch(() => store.options.uid, () => saveAllSettings(), { deep: false });
watch(bindPhraseText, () => saveAllSettings());
watch(() => store.options.ssid, () => saveAllSettings());
watch(() => store.options.password, () => saveAllSettings());
watch(() => store.options.wifiOnInternal, () => saveAllSettings());

function clearSettings() {
  clearStoredSettings();
  store.options.uid = null;
  bindPhraseText.value = null;
  store.options.region = 'FCC';
  store.options.domain = 1;
  store.options.ssid = null;
  store.options.password = null;
  store.options.wifiOnInternal = 60;
  store.options.flashMethod = null;
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Backpack Options</VCardTitle>
    <VCardText>Set the flashing options and method for your <b>{{ store.name }}</b></VCardText>
    <br>
    <VForm autocomplete="on" method="POST">
      <BindPhraseInput v-model="store.options.uid" :bind-phrase-text="bindPhraseText" @update:bindPhraseText="bindPhraseText = $event"/>
      <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                         v-if="store.target?.config?.platform!=='stm32'"/>
      <WiFiAutoOn v-model="store.options.wifiOnInternal"/>

      <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>

      <VBtn color="error" variant="outlined" size="small" @click="clearSettings" class="mt-4">
        Clear Settings
      </VBtn>
    </VForm>
  </VContainer>
</template>