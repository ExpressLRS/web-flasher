<script setup>
import {ref} from "vue";
import {store} from "../js/state.js";

let enabled = defineModel('enabled')
let type = defineModel('type')
type.value = "0"

let items = ref([
  {title: "RX as Internal TX module (Full-duplex)", value: "0"},
  {title: "RX as External TX module (Half-duplex)", value: "1"}
])
</script>

<template>
  <VCheckbox v-model="enabled" label='Flash RX as TX'/>
  <VSelect v-model="type" :items="items" v-if="store.target.config.platform.startsWith('esp32') && enabled"/>
</template>
