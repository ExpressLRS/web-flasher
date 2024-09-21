<script setup>
import {store} from "../js/state.js";

import BindPhraseInput from "../components/BindPhraseInput.vue";
import RFSelect from "../components/RFSelect.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import WiFiAutoOn from "../components/WiFiAutoOn.vue";
import RXasTX from "../components/RXasTX.vue";
import RXOptions from "../components/RXOptions.vue";
import TXOptions from "../components/TXOptions.vue";
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Receiver Options</VCardTitle>
    <VCardText>Set the flashing options and method for your <b>{{ store.target?.config?.product_name }}</b></VCardText>
    <br>
    <VForm autocomplete="on" method="POST">
      <BindPhraseInput v-model="store.options.uid"/>
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
    </VForm>
  </VContainer>
</template>