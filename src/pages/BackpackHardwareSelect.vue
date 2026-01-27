<script setup>
import {ref, watch, watchEffect, watchPostEffect} from 'vue';
import {store} from '../js/state';
import {compareSemanticVersions} from '../js/version';

defineProps(['vendorLabel'])

let firmware = ref(null);
let flashBranch = ref(false);
let hardware = ref(null);
let versions = ref([]);
let vendors = ref([]);
let targets = ref([]);

watchPostEffect(() => {
  fetch(`./assets/${store.firmware}/index.json`).then(r => r.json()).then(r => {
    firmware.value = r
  })
})

function updateVersions() {
  if (firmware.value) {
    hardware.value = null
    store.version = null
    versions.value = []
    if (flashBranch.value) {
      Object.entries(firmware.value.branches).forEach(([key, value]) => {
        versions.value.push({title: key, value: value})
        if (!store.version) store.version = value
      })
      Object.entries(firmware.value.tags).forEach(([key, value]) => {
        if (key.indexOf('-') !== -1) versions.value.push({title: key, value: value})
      })
      versions.value = versions.value.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      Object.keys(firmware.value.tags).sort(compareSemanticVersions).reverse().forEach((key) => {
        if (key.indexOf('-') === -1 || flashBranch.value) {
          versions.value.push({title: key, value: firmware.value.tags[key]})
          if (!store.version) store.version = firmware.value.tags[key]
        }
      })
    }
  }
}

watch(firmware, updateVersions)
watch(flashBranch, updateVersions)

watchPostEffect(() => {
  if (store.version) {
    store.folder = `./assets/${store.firmware}/${store.version}`
    fetch(`./assets/${store.firmware}/hardware/targets.json`).then(r => r.json()).then(r => {
      hardware.value = r
      store.vendor = null
      vendors.value = []
      for (const [k, v] of Object.entries(hardware.value)) {
        let hasTargets = v.hasOwnProperty(store.targetType);
        if (hasTargets && v.name) vendors.value.push({title: v.name, value: k})
      }
      vendors.value.sort((a, b) => a.title.localeCompare(b.title))
    }).catch((_ignore) => {
    })
  }
})

watchEffect(() => {
  targets.value = []
  let keepTarget = false
  if (store.vendor && hardware.value) {
    for (const [vk, v] of Object.entries(hardware.value)) {
      if (v[store.targetType] && (vk === store.vendor || store.vendor === null)) {
        for (const [ck, c] of Object.entries(v[store.targetType])) {
          targets.value.push({title: c.product_name, value: {vendor: vk, target: ck, config: c}})
          if (store.target && store.target.vendor === vk && store.target.target === ck) keepTarget = true
        }
      }
    }
    targets.value.sort((a, b) => a.title.localeCompare(b.title))
    if (targets.value.length === 1) {
      store.target = targets.value[0].value
      keepTarget = true
    }
  }
  if (!keepTarget) store.target = null
})

watch(() => store.target, (v, _oldValue) => {
  if (v) {
    store.vendor = v.vendor
    store.vendor_name = hardware.value[v.vendor].name
  }
})

function flashType() {
  return flashBranch.value ? 'Branches' : 'Releases'
}
</script>

<template>
  <VRow justify="end">
    <VSwitch v-model="flashBranch" :label="flashType()" color="secondary"/>
  </VRow>

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