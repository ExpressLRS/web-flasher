<script setup>
import {store, hasFeature} from "../js/state.js";
import BindPhraseInput from "../components/BindPhraseInput.vue";
import RFSelect from "../components/RFSelect.vue";
import WiFiSettingsInput from "../components/WiFiSettingsInput.vue";
import MelodyInput from "../components/MelodyInput.vue";
import FlashMethodSelect from "../components/FlashMethodSelect.vue";
import WiFiAutoOn from "../components/WiFiAutoOn.vue";
import FanRuntime from "../components/FanRuntime.vue";
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Transmitter Options</VCardTitle>
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
            <VNumberInput v-model="store.options.tx.telemetryInterval" label='TLM report interval' suffix="milliseconds"
                          :step="10" :min="100" :max="1000"/>
            <VCheckbox v-model="store.options.tx.uartInverted" label="UART inverted"
                       v-if="store.target?.config?.platform==='stm32'"/>
            <FanRuntime v-model="store.options.tx.fanMinRuntime" />
            <VCheckbox v-model="store.options.tx.higherPower" label='Unlock higher power'
                       v-if="hasFeature('unlock-higher-power')"/>
            <MelodyInput v-model:melody-type="store.options.tx.melodyType"
                         v-model:melody-tune="store.options.tx.melodyTune"
                         v-if="hasFeature('buzzer')"/>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VForm>
  </VContainer>
</template>