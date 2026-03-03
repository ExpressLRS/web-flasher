<script setup>
import {onMounted, watch, ref} from 'vue';
import {store} from "../js/state.js";
import {getSettings, saveSettings, clearSettings as clearStoredSettings} from "../js/storage.js";
import BindPhraseInput from "../components/BindPhraseInput.vue";
import RFSelect from "../components/RFSelect.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import WiFiAutoOn from "../components/WiFiAutoOn.vue";
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
        
        if (savedSettings.tx) {
            if (savedSettings.tx.telemetryInterval !== undefined) store.options.tx.telemetryInterval = savedSettings.tx.telemetryInterval;
            if (savedSettings.tx.uartInverted !== undefined) store.options.tx.uartInverted = savedSettings.tx.uartInverted;
            if (savedSettings.tx.fanMinRuntime !== undefined) store.options.tx.fanMinRuntime = savedSettings.tx.fanMinRuntime;
            if (savedSettings.tx.higherPower !== undefined) store.options.tx.higherPower = savedSettings.tx.higherPower;
            if (savedSettings.tx.melodyType !== undefined) store.options.tx.melodyType = savedSettings.tx.melodyType;
            if (savedSettings.tx.melodyTune !== undefined) store.options.tx.melodyTune = savedSettings.tx.melodyTune;
        }
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
    
    if (!settings.tx) settings.tx = {};
    settings.tx.telemetryInterval = store.options.tx.telemetryInterval;
    settings.tx.uartInverted = store.options.tx.uartInverted;
    settings.tx.fanMinRuntime = store.options.tx.fanMinRuntime;
    settings.tx.higherPower = store.options.tx.higherPower;
    settings.tx.melodyType = store.options.tx.melodyType;
    settings.tx.melodyTune = store.options.tx.melodyTune;
    
    saveSettings(settings);
}

watch(() => store.options.uid, () => saveAllSettings(), { deep: false });
watch(bindPhraseText, () => saveAllSettings());
watch(() => store.options.region, () => saveAllSettings());
watch(() => store.options.domain, () => saveAllSettings());
watch(() => store.options.ssid, () => saveAllSettings());
watch(() => store.options.password, () => saveAllSettings());
watch(() => store.options.wifiOnInternal, () => saveAllSettings());
watch(() => store.options.tx.telemetryInterval, () => saveAllSettings());
watch(() => store.options.tx.uartInverted, () => saveAllSettings());
watch(() => store.options.tx.fanMinRuntime, () => saveAllSettings());
watch(() => store.options.tx.higherPower, () => saveAllSettings());
watch(() => store.options.tx.melodyType, () => saveAllSettings());
watch(() => store.options.tx.melodyTune, () => saveAllSettings());

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
    store.options.tx.telemetryInterval = 240;
    store.options.tx.uartInverted = true;
    store.options.tx.fanMinRuntime = 30;
    store.options.tx.higherPower = false;
    store.options.tx.melodyType = 3;
    store.options.tx.melodyTune = null;
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Transmitter Options</VCardTitle>
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
            <TXOptions/>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
      
      <VBtn color="error" variant="outlined" size="small" @click="clearSettings" class="mt-4">
        Clear Settings
      </VBtn>
    </VForm>
  </VContainer>
</template>