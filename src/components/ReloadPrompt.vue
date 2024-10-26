<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

function close() {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <VBanner v-if="offlineReady || needRefresh" class="pwa-toast" elevation="1" color="info">
    <VBannerText v-if="offlineReady">
      App ready to work offline
    </VBannerText>
    <VBannerText v-else>
      New content available, reload the page?
    </VBannerText>
    <template #actions>
      <VBtn v-if="needRefresh" @click="updateServiceWorker()">Reload</VBtn>
      <VBtn @click="close()">Dismiss</VBtn>
    </template>
  </VBanner>
</template>

<style>
.pwa-toast {
  position: fixed;
  right: 0;
  bottom: 0;
  margin: 16px;
  width: unset;
  z-index: 99999;
  border-radius: 0.5rem;
}
</style>