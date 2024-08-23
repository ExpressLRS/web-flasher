<script setup>
import {hasFeature, store} from "../js/state.js";
import FanRuntime from "./FanRuntime.vue";
</script>

<template>
  <VTextField v-model="store.options.rx.uartBaud" label='UART baud rate'/>
  <VCheckbox v-model="store.options.rx.lockOnFirstConnect" label='Lock on first connection'/>
  <VCheckbox v-model="store.options.rx.r9mmMiniSBUS" label='Use SBUS Pins as UART' v-if="hasFeature('sbus-uart')"/>
  <FanRuntime v-model="store.options.rx.fanMinRuntime" />
</template>
