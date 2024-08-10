<script setup>
import {VSelect} from "vuetify/components";

let model = defineModel()
const props = defineProps({methods: Array})

const flashMethods = [
  {value: 'download', title: 'Local Download'},
  {value: 'uart', title: 'Serial UART'},
  {value: 'betaflight', title: 'Betaflight Passthrough'},
  {value: 'etx', title: 'EdgeTX Passthrough'},
  {value: 'passthru', title: 'Passthrough'},
  {value: 'wifi', title: 'WiFi'},
  {value: 'stlink', title: 'STLink'},
]

function getFlashMethods() {
  return flashMethods.filter(v => v.value === 'download' || (props.methods && props.methods.includes(v.value)))
}
</script>

<template>
  <VSelect v-model="model" label="Flashing Method" density="comfortable" :items="getFlashMethods()"/>
</template>
