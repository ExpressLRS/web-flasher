<script setup>
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
  <VContainer max-width="600px">
    <VCardTitle>Transmitter Options</VCardTitle>
    <VCardText>Set the flashing options and method for your <b>{{ store.target?.config?.product_name }}</b></VCardText>
    <br>
    <BindPhraseInput v-model="store.options.uid"/>
    <RFSelect v-model:region="store.options.region" v-model:domain="store.options.domain" :radio="store.radio"/>
    <WiFiSettingsInput v-model:ssid="store.options.ssid" v-model:password="store.options.password"
                       v-if="store.target?.config?.platform!=='stm32'"/>

    <FlashMethodSelect v-model="store.options.flashMethod" :methods="store.target?.config?.upload_methods"/>

    <VExpansionPanels variant="popout">
      <VExpansionPanel title="Custom Settings">
        <VExpansionPanelText>
          <VTextField v-model="store.options.wifiOnInternal" label='WiFi "auto on" interval (s)'
                  v-if="store.target?.config?.platform!=='stm32'"/>
          <VTextField v-model="store.options.tx.telemetryInterval" label='TLM report interval (milliseconds)'/>
          <VCheckbox v-model="store.options.tx.uartInverted" label="UART inverted"
                     v-if="store.target?.config?.platform==='stm32'"/>
          <VTextField v-model="store.options.tx.fanMinRuntime" label='Minimum fan runtime (seconds)' v-if="has('fan')"/>
          <VCheckbox v-model="store.options.tx.higherPower" label='Unlock higher power' v-if="has('unlock-higher-power')"/>
          <MelodyInput v-model:melody-type="store.options.tx.melodyType" v-model:melody-tune="store.options.tx.melodyTune"
                       v-if="has('buzzer')"/>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>
  </VContainer>
</template>