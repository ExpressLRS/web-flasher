<script setup>
import {VSelect, VTextField} from "vuetify/components";
let melodyType = defineModel('melodyType')
let melodyTune = defineModel('melodyTune')

const melodyTypes = [
  {value: 0, title: 'Quiet, no beeps'},
  {value: 1, title: 'Just one beep'},
  {value: 2, title: 'No tune, just beeps'},
  {value: 3, title: 'Default tune'},
  {value: 4, title: 'Custom tune'}
]
</script>

<template>
  <VSelect v-model="melodyType" label="Beeper" density="comfortable" :items="melodyTypes"/>
  <VTextField v-model="melodyTune" label="Melody" density="comfortable" v-if="melodyType===4"/>
</template>
