<script setup>
import {ref, watch, onMounted} from 'vue';
import {store} from '../js/state';
import {compareSemanticVersions} from '../js/version';

defineProps(['vendorLabel'])
const showRCs = false;

let firmware;
let hardware;
let versions = ref([]);
let vendors = ref([]);
let targets = ref([]);

function updateVersions() {
  hardware = null
  fetch(`/assets/backpack/index.json`).then(r => r.json()).then(r => {
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
}

watch(() => store.firmware, (_newValue, _oldValue) => updateVersions())
onMounted(() => updateVersions())

function updateVRXType() {
  if (store.firmware && store.version && store.targetType) {
    fetch(`/assets/backpack/${store.version}/hardware/targets.json`).then(r => r.json()).then(r => {
      hardware = r
      store.vendor = null
      vendors.value = []
      for (const [k, v] of Object.entries(hardware)) {
        let hasTargets = v.hasOwnProperty(store.targetType);
        if (hasTargets && v.name) vendors.value.push({title: v.name, value: k})
      }
    }).catch((_ignore) => {})
  }
}

watch(() => store.version, (_newValue, _oldValue) => updateVRXType())
watch(() => store.targetType, (_newValue, _oldValue) => updateVRXType())

function updateTargets() {
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
    if (!keepTarget) store.target = null
  }
}

watch(() => store.version, (_newValue, _oldValue) => updateTargets())
watch(() => store.vendor, (_newValue, _oldValue) => updateTargets())
watch(() => store.target, (v, _oldValue) => {
  if (v) {
    store.vendor = v.vendor
  }
})
</script>

<template>
  <VCardTitle>VRx Hardware Selection</VCardTitle>
  <VCardSubtitle>Choose the video receiver and hardwaree to be flashed</VCardSubtitle>
  <br>
  <VSelect :items="versions" v-model="store.version" density="comfortable" label="Firmware Version"/>
  <VSelect :items="vendors" v-model="store.vendor" density="comfortable" :label="vendorLabel" :disabled="!store.version"/>
  <VAutocomplete :items="targets" v-model="store.target" density="comfortable" label="Hardware Target" :disabled="!store.vendor"/>
</template>