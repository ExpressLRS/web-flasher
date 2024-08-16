<script setup>
import {ref, watch, watchPostEffect} from 'vue';
import {store} from '../js/state';
import {compareSemanticVersions} from '../js/version';

const showRCs = false;

let firmware;
let hardware = ref(null);
let versions = ref([]);
let vendors = ref([]);
let radios = ref([]);
let targets = ref([]);

watchPostEffect(() => {
  hardware.value = null
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
})

watchPostEffect(() => {
  if (store.firmware && store.version && store.targetType) {
    fetch(`/assets/${store.firmware}/${store.version}/hardware/targets.json`).then(r => r.json()).then(r => {
      hardware.value = r
      store.vendor = null
      vendors.value = []
      for (const [k, v] of Object.entries(hardware.value)) {
        let hasTargets = false;
        Object.keys(v).forEach(type => hasTargets |= type.startsWith(store.targetType))
        if (hasTargets && v.name) vendors.value.push({title: v.name, value: k})
      }
      // updateTargets()
    }).catch((_ignore) => {
    })
  }
})

const radioTitles = {
  'tx_2400': '2.4GHz Transmitter',
  'tx_900': '900MHz Transmitter',
  'tx_dual': 'Dual 2.4GHz/900MHz Transmitter',
  'rx_2400': '2.4GHz Receiver',
  'rx_900': '900MHz Receiver',
  'rx_dual': 'Dual 2.4GHz/900MHz Receiver',
}

watchPostEffect(() => {
  radios.value = []
  if (store.vendor && hardware.value) {
    let keepTarget = false
    Object.keys(hardware.value[store.vendor]).forEach(k => {
      if (k.startsWith(store.targetType)) radios.value.push({title: radioTitles[k], value: k})
      if (store.target && store.target.vendor === store.vendor && store.target.radio === k) keepTarget = true
    })
    if (radios.value.length === 1) {
      store.radio = radios.value[0].value
    } else if (!keepTarget) store.radio = null
  }
})

watchPostEffect(() => {
  targets.value = []
  if (store.version && hardware.value) {
    let keepTarget = false
    for (const [vk, v] of Object.entries(hardware.value)) {
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
})

watch(() => store.target, (v, _oldValue) => {
  if (v) {
    store.vendor = v.vendor
    store.radio = v.radio
  }
})
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Hardware Selection</VCardTitle>
    <VCardText>Choose the vendor specific hardware that you are flashing, if the hardware is not in the list then the
      hardware is unsupported.
    </VCardText>
    <br>
    <VSelect :items="versions" v-model="store.version" density="compact" label="Firmware Version"/>
    <VSelect :items="vendors" v-model="store.vendor" density="compact" label="Hardware Vendor"
             :disabled="!store.version"/>
    <VSelect :items="radios" v-model="store.radio" density="compact" label="Radio Frequency"
             :disabled="!store.vendor"/>
    <VAutocomplete :items="targets" v-model="store.target" density="compact" label="Hardware Target"/>
  </VContainer>
</template>