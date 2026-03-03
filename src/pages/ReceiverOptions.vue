<script setup>
import {onMounted, watch, ref} from 'vue';
import {store} from "../js/state.js";
import {getSettings, saveSettings, clearSettings as clearStoredSettings} from "../js/storage.js";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import RFSelect from "../components/RFSelect.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import WiFiAutoOn from "../components/WiFiAutoOn.vue";
import RXasTX from "../components/RXasTX.vue";
import RXOptions from "../components/RXOptions.vue";
import TXOptions from "../components/TXOptions.vue";

const bindPhraseText = ref(null);

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
        
        if (savedSettings.rx) {
            if (savedSettings.rx.uartBaud !== undefined) store.options.rx.uartBaud = savedSettings.rx.uartBaud;
            if (savedSettings.rx.lockOnFirstConnect !== undefined) store.options.rx.lockOnFirstConnect = savedSettings.rx.lockOnFirstConnect;
            if (savedSettings.rx.r9mmMiniSBUS !== undefined) store.options.rx.r9mmMiniSBUS = savedSettings.rx.r9mmMiniSBUS;
            if (savedSettings.rx.fanMinRuntime !== undefined) store.options.rx.fanMinRuntime = savedSettings.rx.fanMinRuntime;
            if (savedSettings.rx.rxAsTx !== undefined) store.options.rx.rxAsTx = savedSettings.rx.rxAsTx;
            if (savedSettings.rx.rxAsTxType !== undefined) store.options.rx.rxAsTxType = savedSettings.rx.rxAsTxType;
        }
    }
});

// Helper function to save all settings
function saveAllSettings() {
    const settings = getSettings() || {};
    settings.uid = store.options.uid;
    settings.bindPhraseText = bindPhraseText.value;
    settings.region = store.options.region;
    settings.domain = store.options.domain;
    settings.ssid = store.options.ssid;
    settings.password = store.options.password;
    settings.wifiOnInternal = store.options.wifiOnInternal;
    
    if (!settings.rx) settings.rx = {};
    settings.rx.uartBaud = store.options.rx.uartBaud;
    settings.rx.lockOnFirstConnect = store.options.rx.lockOnFirstConnect;
    settings.rx.r9mmMiniSBUS = store.options.rx.r9mmMiniSBUS;
    settings.rx.fanMinRuntime = store.options.rx.fanMinRuntime;
    settings.rx.rxAsTx = store.options.rx.rxAsTx;
    settings.rx.rxAsTxType = store.options.rx.rxAsTxType;
    
    saveSettings(settings);
}

watch(() => store.options.uid, () => saveAllSettings(), { deep: false });
watch(bindPhraseText, () => saveAllSettings());
watch(() => store.options.region, () => saveAllSettings());
watch(() => store.options.domain, () => saveAllSettings());
watch(() => store.options.ssid, () => saveAllSettings());
watch(() => store.options.password, () => saveAllSettings());
watch(() => store.options.wifiOnInternal, () => saveAllSettings());
watch(() => store.options.rx.uartBaud, () => saveAllSettings());
watch(() => store.options.rx.lockOnFirstConnect, () => saveAllSettings());
watch(() => store.options.rx.r9mmMiniSBUS, () => saveAllSettings());
watch(() => store.options.rx.fanMinRuntime, () => saveAllSettings());
watch(() => store.options.rx.rxAsTx, () => saveAllSettings());
watch(() => store.options.rx.rxAsTxType, () => saveAllSettings());

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
    store.options.rx.uartBaud = 420000;
    store.options.rx.lockOnFirstConnect = true;
    store.options.rx.r9mmMiniSBUS = false;
    store.options.rx.fanMinRuntime = 30;
    store.options.rx.rxAsTx = false;
    store.options.rx.rxAsTxType = 0;
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Receiver Options</VCardTitle>
    <VCardText>Set the flashing options and method for your <b>{{ store.target?.config?.product_name }}</b></VCardText>
    <br>
    <VForm autocomplete="on" method="POST">
      <BindPhraseInput v-model="store.options.uid" :bind-phrase-text="bindPhraseText" @update:bindPhraseText="bindPhraseText = $event"/>
      <RFSelect v-model:region="store.options.region" v-model:domain="store.options.domain" :radio="store.radio"/>
      <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                         v-if="store.target?.config?.platform!=='stm32'"/>

      <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>

      <VExpansionPanels variant="popout">
        <VExpansionPanel title="Advanced Settings">
          <VExpansionPanelText>
            <WiFiAutoOn v-model="store.options.wifiOnInternal"/>
            <RXasTX v-model:enabled="store.options.rx.rxAsTx" v-model:type="store.options.rx.rxAsTxType"/>
            <RXOptions v-if="!store.options.rx.rxAsTx"/>
            <TXOptions v-else/>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
      
      <VBtn color="error" variant="outlined" @click="clearSettings" class="mt-4">
        Clear Settings
      </VBtn>
    </VForm>
  </VContainer>
</template>