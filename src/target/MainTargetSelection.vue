<script setup>
import {ref, watch, onMounted} from 'vue';
import {store} from '../state';
import {compareSemanticVersions} from '../version';

const showRCs = false;

let firmware;
let hardware;
let versions = ref([]);
let vendors = ref([]);
let radios = ref([]);
let targets = ref([]);

function updateVersions() {
  hardware = null
  fetch(`/assets/${store.firmware}/index.json`).then(r => r.json()).then(r => {
    firmware = r
    store.version = null
    versions.value = []
    Object.keys(firmware.tags).sort(compareSemanticVersions).reverse().forEach((key) => {
      if (key.indexOf('-') === -1 || showRCs) {
        versions.value.push({title: key, value: firmware.tags[key]})
        if (!store.version) store.version = firmware.tags[key]
      }
    })
  })
  updateVendors()
}

watch(() => store.firmware, (_newValue, _oldValue) => updateVersions())
onMounted(() => updateVersions())

function updateVendors() {
  if (store.firmware && store.version && store.targetType) {
    fetch(`/assets/${store.firmware}/${store.version}/hardware/targets.json`).then(r => r.json()).then(r => {
      hardware = r
      store.vendor = null
      vendors.value = []
      for (const [k, v] of Object.entries(hardware)) {
        let hasTargets = false;
        Object.keys(v).forEach(type => hasTargets |= type.startsWith(store.targetType))
        if (hasTargets && v.name) vendors.value.push({title: v.name, value: k})
      }
      updateTargets()
    })
  }
}

watch(() => store.version, (_newValue, _oldValue) => updateVendors())
watch(() => store.targetType, (_newValue, _oldValue) => updateVendors())

const radioTitles = {
  'tx_2400': '2.4GHz Transmitter',
  'tx_900': '900MHz Transmitter',
  'tx_dual': 'Dual 2.4GHz/900MHz Transmitter',
  'rx_2400': '2.4GHz Receiver',
  'rx_900': '900MHz Receiver',
  'rx_dual': 'Dual 2.4GHz/900MHz Receiver',
}

function updateRadios() {
  radios.value = []
  if (store.vendor && hardware) {
    let keepTarget = false
    Object.keys(hardware[store.vendor]).forEach(k => {
      if (k.startsWith(store.targetType)) radios.value.push({title: radioTitles[k], value: k})
      if (store.target && store.target.vendor === store.vendor && store.target.radio === k) keepTarget = true
    })
    if (radios.value.length === 1) {
      store.radio = radios.value[0].value
    } else if (!keepTarget) store.radio = null
  }
}

watch(() => store.vendor, (_newValue, _oldValue) => updateRadios())

function updateTargets() {
  targets.value = []
  if (store.version && hardware) {
    let keepTarget = false
    for (const [vk, v] of Object.entries(hardware)) {
      if (vk === store.vendor || store.vendor === null) {
        for (const [rk, r] of Object.entries(v)) {
          if (rk.startsWith(store.targetType) && (rk === store.radio || store.radio === null)) {
            for (const [ck, c] of Object.entries(r)) {
              targets.value.push({title: c.product_name, value: {vendor: vk, radio: rk, target: ck, config: c}})
              if (store.target && store.target.vendor === vk && store.target.radio === rk && store.target.target === ck) keepTarget = true
            }
          }
        }
      }
    }
    if (!keepTarget) store.target = null
  }
}

watch(() => store.version, (_newValue, _oldValue) => updateTargets())
watch(() => store.vendor, (_newValue, _oldValue) => updateTargets())
watch(() => store.radio, (_newValue, _oldValue) => updateTargets())
watch(() => store.target, (v, _oldValue) => {
  if (v) {
    store.vendor = v.vendor
    store.radio = v.radio
  }
})
</script>

<template>
  <VCardTitle>Target Selection</VCardTitle>
  <VCardSubtitle>Choose the hardware that you are flashing the firmware onto</VCardSubtitle>
  <br>
  <VSelect :items="versions" v-model="store.version" density="comfortable" label="Firmware Version"/>
  <VSelect :items="vendors" v-model="store.vendor" density="comfortable" label="Hardware Vendor"
           :disabled="!store.version"/>
  <VSelect :items="radios" v-model="store.radio" density="comfortable" label="Radio Frequency"
           :disabled="!store.vendor"/>
  <VAutocomplete :items="targets" v-model="store.target" density="comfortable" label="Hardware Target"/>
</template>