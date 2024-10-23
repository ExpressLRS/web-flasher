<script setup>
import {ref, watch, watchPostEffect} from 'vue';
import {store} from '../js/state';
import {compareSemanticVersions} from '../js/version';

let firmware = ref(null);
let flashBranch = ref(false);
let hardware = ref(null);
let versions = ref([]);
let vendors = ref([]);
let radios = ref([]);
let targets = ref([]);
let luaUrl = ref(null);

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
      let first = true;
      Object.keys(firmware.value.tags).sort(compareSemanticVersions).reverse().forEach((key) => {
        if (key.indexOf('-') === -1 || first) {
          versions.value.push({title: key, value: firmware.value.tags[key]})
          if (!store.version && key.indexOf('-') === -1) store.version = firmware.value.tags[key]
          first = false
        }
      })
    }
  }
}

watch(() => firmware.value, updateVersions)
watch(() => flashBranch.value, updateVersions)

watchPostEffect(() => {
  if (store.version) {
    store.folder = `./assets/${store.firmware}`

    fetch(`./assets/${store.firmware}/hardware/targets.json`).then(r => r.json()).then(r => {
      hardware.value = r
      store.vendor = null
      vendors.value = []
      for (const [k, v] of Object.entries(hardware.value)) {
        let hasTargets = false;
        Object.keys(v).forEach(type => hasTargets |= type.startsWith(store.targetType))
        if (hasTargets && v.name) vendors.value.push({title: v.name, value: k})
      }
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
  let keepTarget = false
  if (store.vendor && hardware.value) {
    Object.keys(hardware.value[store.vendor]).forEach(k => {
      if (k.startsWith(store.targetType)) radios.value.push({title: radioTitles[k], value: k})
      if (store.target && store.target.vendor === store.vendor && store.target.radio === k) keepTarget = true
    })
    if (radios.value.length === 1) {
      store.radio = radios.value[0].value
      keepTarget = true
    }
  }
  if (!keepTarget) store.radio = null
})

watchPostEffect(() => {
  targets.value = []
  let keepTarget = false
  if (store.version && hardware.value) {
    const version = versions.value.find(x => x.value === store.version).title
    for (const [vk, v] of Object.entries(hardware.value)) {
      if (vk === store.vendor || store.vendor === null) {
        for (const [rk, r] of Object.entries(v)) {
          if (rk.startsWith(store.targetType) && (rk === store.radio || store.radio === null)) {
            for (const [ck, c] of Object.entries(r)) {
              if (compareSemanticVersions(version, c.min_version) >= 0) {
                targets.value.push({title: c.product_name, value: {vendor: vk, radio: rk, target: ck, config: c}})
                if (store.target && store.target.vendor === vk && store.target.radio === rk && store.target.target === ck) keepTarget = true
              }
            }
          }
        }
      }
    }
  }
  if (!keepTarget) store.target = null
})

watch(() => {
  luaUrl = store.version ? `./assets/${store.firmware}/${store.version}/lua/elrsV3.lua` : null
})

watch(() => store.target, (v, _oldValue) => {
  if (v) {
    store.vendor = v.vendor
    store.radio = v.radio
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
    <a :href="luaUrl" download>
      <VBtn :disabled="!luaUrl">Download ELRS Lua Script</VBtn>
    </a>
  </VContainer>
</template>