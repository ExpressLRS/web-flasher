<script setup>
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
  <VContainer max-width="600px">
    <VCardTitle>Receiver Options</VCardTitle>
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
          <VTextField v-model="store.options.rx.uartBaud" label='UART baud rate'/>
          <VCheckbox v-model="store.options.rx.lockOnFirstConnect" label='Lock on first connection'/>
          <VCheckbox v-model="store.options.rx.r9mmMiniSBUS" label='Use SBUS Pins as UART' v-if="has('sbus-uart')"/>
          <VTextField v-model="store.options.rx.fanMinRuntime" label='Minimum fan runtime (seconds)' v-if="has('fan')"/>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>


  </VContainer>
</template>