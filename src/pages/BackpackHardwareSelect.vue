<script setup>
import {ref, watch, watchEffect} from 'vue';
import {store} from '../js/state';
import {compareSemanticVersions} from '../js/version';

defineProps(['vendorLabel'])
const showRCs = false;

let firmware;
let hardware;
let versions = ref([]);
let vendors = ref([]);
let targets = ref([]);

watchEffect(() => {
  hardware = null
  fetch(`./assets/${store.firmware}/index.json`).then(r => r.json()).then(r => {
    firmware = r
    store.version = null
    versions.value = []
    Object.keys(firmware.tags).sort(compareSemanticVersions).reverse().forEach((key) => {
      if (key.indexOf('-') === -1 || showRCs) {
        versions.value.push({title: key, value: firmware.tags[key]})
        if (!store.version) store.version = firmware.tags[key]
      }
    })
    updateVRXType()
  })
})

function updateVRXType() {
  if (store.firmware && store.version && store.targetType) {
    fetch(`./assets/${store.firmware}/${store.version}/hardware/targets.json`).then(r => r.json()).then(r => {
      hardware = r
      store.vendor = null
      vendors.value = []
      for (const [k, v] of Object.entries(hardware)) {
        let hasTargets = v.hasOwnProperty(store.targetType);
        if (hasTargets && v.name) vendors.value.push({title: v.name, value: k})
      }
    }).catch((_ignore) => {
    })
  }
}

watchEffect(() => {
  targets.value = []
  if (store.version && hardware) {
    let keepTarget = false
    for (const [vk, v] of Object.entries(hardware)) {
      if (v[store.targetType] && (vk === store.vendor || store.vendor === null)) {
        for (const [ck, c] of Object.entries(v[store.targetType])) {
          targets.value.push({title: c.product_name, value: {vendor: vk, target: ck, config: c}})
          if (store.target && store.target.vendor === vk && store.target.target === ck) keepTarget = true
        }
      }
    }
    if (targets.value.length === 1) {
      store.target = targets.value[0].value
    } else if (!keepTarget) store.target = null
  }
})

watch(() => store.target, (v, _oldValue) => {
  if (v) {
    store.vendor = v.vendor
    store.vendor_name = hardware[v.vendor].name
  }
})
</script>

<template>
  <VContainer max-width="600px">
    <template v-if="store.targetType==='txbp'">
      <VCardTitle>Transmitter Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the transmitter module that is having it's backpack flashed</VCardSubtitle>
    </template>
    <template v-if="store.targetType==='vrx'">
      <VCardTitle>VRx Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the video receiver type and hardware to be flashed</VCardSubtitle>
    </template>
    <template v-if="store.targetType==='aat'">
      <VCardTitle>Antenna Tracker Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the antenna tracker type and hardware to be flashed</VCardSubtitle>
    </template>
    <template v-if="store.targetType==='timer'">
      <VCardTitle>Race Timer Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the race timer and hardware to be flashed</VCardSubtitle>
    </template>
    <br>
    <VSelect :items="versions" v-model="store.version" label="Firmware Version"/>
    <VSelect :items="vendors" v-model="store.vendor" :label="vendorLabel" :disabled="!store.version"/>
    <VAutocomplete :items="targets" v-model="store.target" label="Hardware Target" :disabled="!store.vendor"/>
  </VContainer>
</template>