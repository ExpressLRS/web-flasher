<script setup>
import {VSelect} from "vuetify/components";

let region = defineModel('region')
let domain = defineModel('domain')
const props = defineProps({radio: String})

const regions = [
  {value: 'FCC', title: 'FCC'},
  {value: 'LBT', title: 'LBT'}
]
const domains = [
  {value: 0, title: 'AU915'},
  {value: 1, title: 'FCC915'},
  {value: 2, title: 'EU868'},
  {value: 3, title: 'IN866'},
  {value: 4, title: 'AU433'},
  {value: 5, title: 'EU433'},
  {value: 6, title: 'US433'},
  {value: 7, title: 'US433-Wide'}
]

function hasHighFrequency() {
  return props.radio && (props.radio.endsWith('2400') || props.radio.endsWith('dual'))
}

function hasLowFrequency() {
  return props.radio && (props.radio.endsWith('900') || props.radio.endsWith('dual'))
}
</script>

<template>
  <VSelect v-model="region" label="Region" :items="regions" v-if="hasHighFrequency()"/>
  <VSelect v-model="domain" label="Regulatory Domain" :items="domains" v-if="hasLowFrequency()"/>
</template>
