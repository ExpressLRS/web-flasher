<script setup>
import {ref, watch, watchPostEffect} from 'vue';
import {store} from '../js/state';
import {compareSemanticVersions} from '../js/version';
import {fetchTargets, repoNameFromUrl} from '../js/targets';

let firmware = ref(null);
let hardware = ref(null);
let versions = ref([]);
let vendors = ref([]);
let radios = ref([]);
let targets = ref([]);
let hasUrlParams = ref(false);
let urlTargetResolved = ref(false);
let fetchFailed = ref(false);
let fetchFailedMessage = ref('');

function setTargetFromParams() {
  if (urlTargetResolved.value) return;
  let urlParams = new URLSearchParams(window.location.search);
  let target = urlParams.get('target');
  if (target) {
    const [vendor, radio, targetName] = target.split('.');
    const targetConfig = hardware.value?.[vendor]?.[radio]?.[targetName];
    if (targetConfig) {
      hasUrlParams.value = true;
      store.target = {
        vendor,
        radio,
        target: targetName,
        config: targetConfig
      }
    } else {
      hasUrlParams.value = false;
      console.warn('[hardware] Ignoring invalid target URL parameter', {target});
    }
    urlTargetResolved.value = true;
  }
}

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

watch(firmware, updateVersions)

function buildVendorList(hardwareData) {
  const list = []
  for (const [k, v] of Object.entries(hardwareData)) {
    let hasTargets = false
    Object.keys(v).forEach(type => hasTargets |= type.startsWith(store.targetType))
    if (hasTargets && v.name) list.push({title: v.name, value: k})
  }
  list.sort((a, b) => a.title.localeCompare(b.title))
  return list
}

watchPostEffect(async () => {
  if (store.version) {
    store.folder = `./assets/${store.firmware}`

    const result = await fetchTargets()
    if (result.errors.length > 0) {
      const repos = result.errors.map(e => repoNameFromUrl(e.url)).join(', ')
      fetchFailedMessage.value = `Failed to fetch targets from ${repos}`
      fetchFailed.value = true
    }
    if (result.targets) {
      hardware.value = result.targets
      store.vendor = null
      vendors.value = buildVendorList(result.targets)
    } else {
      hardware.value = null
      store.vendor = null
      vendors.value = []
      fetchFailedMessage.value = 'Failed to fetch targets from all configured sources.'
      fetchFailed.value = true
    }
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
    setTargetFromParams()
    const version = versions.value.find(x => x.value === store.version).title
    for (const [vk, v] of Object.entries(hardware.value)) {
      if (vk === store.vendor || store.vendor === null) {
        for (const [rk, r] of Object.entries(v)) {
          if (rk.startsWith(store.targetType) && (rk === store.radio || store.radio === null)) {
            for (const [ck, c] of Object.entries(r)) {
              if (compareSemanticVersions(version, c.min_version) >= 0) {
                targets.value.push({title: c.product_name, value: {vendor: vk, radio: rk, target: ck, config: c}})
                if (store.target && store.target.vendor === vk && store.target.radio === rk && store.target.target === ck) {
                  store.target.config = c
                  keepTarget = true
                }
              }
            }
          }
        }
      }
    }
  }
  targets.value.sort((a, b) => a.title.localeCompare(b.title))
  if (!keepTarget) store.target = null
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
             :disabled="!store.version || hasUrlParams"/>
    <VSelect :items="radios" v-model="store.radio" density="compact" label="Radio Frequency"
             :disabled="!store.vendor || hasUrlParams"/>
    <VAutocomplete :items="targets" v-model="store.target" density="compact" label="Hardware Target"
             :disabled="!store.version || hasUrlParams"/>

    <VSnackbar v-model="fetchFailed" vertical color="red-darken-3" content-class="td-error-snackbar">
      <div class="text-subtitle-1 pb-2">Targets Fetch Failed</div>

      <p>{{ fetchFailedMessage }}</p>
      <template v-slot:actions>
        <VBtn variant="text" color="white" @click="fetchFailed = false">✕</VBtn>
      </template>
    </VSnackbar>
  </VContainer>
</template>