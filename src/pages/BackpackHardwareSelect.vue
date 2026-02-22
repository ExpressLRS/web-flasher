<script setup>
import {ref, watch, watchEffect, watchPostEffect} from 'vue';
import {store} from '../js/state';
import {compareSemanticVersions} from '../js/version';

defineProps(['vendorLabel'])

let firmware = ref(null);
let hardware = ref(null);
let versions = ref([]);
let vendors = ref([]);
let targets = ref([]);
let fetchFailed = ref(false)
let fetchFailedMessage = ref('')

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
    let first = true
    Object.keys(firmware.value.tags).sort(compareSemanticVersions).reverse().forEach((key) => {
      if (key.indexOf('-') === -1 || first) {
        versions.value.push({title: key, value: firmware.value.tags[key]})
        if (!store.version) store.version = firmware.value.tags[key]
        first = false
      }
    })
  }
}

watch(firmware, updateVersions)

watchPostEffect(() => {
  if (store.version) {
    store.folder = `./assets/${store.firmware}/${store.version}`
    const targetUrls = [
      `./assets/${store.firmware}/${store.version}/hardware/targets.json`,
      `./assets/${store.firmware}/backpack-${store.version}/hardware/targets.json`,
      `./assets/${store.firmware}/hardware/targets.json`
    ]
    const loadTargets = async () => {
      let loaded = false
      for (const url of targetUrls) {
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error('Failed to load targets.json')
          const data = await response.json()
          hardware.value = data
          store.vendor = null
          vendors.value = []
          for (const [k, v] of Object.entries(hardware.value)) {
            let hasTargets = v.hasOwnProperty(store.targetType)
            if (hasTargets && v.name) vendors.value.push({title: v.name, value: k})
          }
          vendors.value.sort((a, b) => a.title.localeCompare(b.title))
          loaded = true
          return
        } catch (_ignore) {
        }
      }
      if (!loaded) {
        fetchFailedMessage.value = 'Failed to fetch targets for Backpack hardware.'
        fetchFailed.value = true
      }
    }
    loadTargets()
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

    <VSnackbar v-model="fetchFailed" vertical color="red-darken-3" content-class="td-error-snackbar">
      <div class="text-subtitle-1 pb-2">Targets Fetch Failed</div>

      <p>{{ fetchFailedMessage }}</p>
      <template v-slot:actions>
        <VBtn variant="text" color="white" @click="fetchFailed = false">✕</VBtn>
      </template>
    </VSnackbar>
  </VContainer>
</template>