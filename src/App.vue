<script setup>
import {computed} from 'vue';
import {useDisplay} from 'vuetify';
import {resetState, store} from './js/state';

import FirmwareSelect from './pages/FirmwareSelect.vue';
import MainHardwareSelect from './pages/MainHardwareSelect.vue';
import VRXHardwareSelect from "./pages/BackpackHardwareSelect.vue";

import TransmitterOptions from './pages/TransmitterOptions.vue';
import ReceiverOptions from './pages/ReceiverOptions.vue';
import BackpackOptions from "./pages/BackpackOptions.vue";

import Download from "./pages/Download.vue";
import SerialFlash from "./pages/SerialFlash.vue";
import STLinkFlash from "./pages/STLinkFlash.vue";

import ReloadPrompt from './components/ReloadPrompt.vue';
import logoUrl from './assets/brand/td-full-logo-white.png';

const {mobile} = useDisplay();
const appBarHeight = computed(() => (mobile.value ? 170 : 320));
const isLastStep = computed(() => store.currentStep === 3);
const nextLabel = computed(() => (isLastStep.value ? 'Done' : 'Next'));

function goHome() {
  resetState()
  window.history.replaceState({}, '', window.location.pathname)
}

function stepPrev() {
  if (store.currentStep === 1) {
    resetState()
  } else {
    store.currentStep--
  }
}

function disableNext() {
  if (store.currentStep === 1) {
    return !store.target ? "next" : false
  } else if (store.currentStep === 2) {
    return !store.options.flashMethod ? "next" : false
  } else if (store.currentStep === 3) {
    return false
  }
  return false
}

function stepNext() {
  if (isLastStep.value) {
    goHome()
    return
  }
  store.currentStep++
}

// Handle any query params
let urlParams = new URLSearchParams(window.location.search);
store.targetType = urlParams.get('type');
if (store.targetType === "tx" || store.targetType === "rx")
  store.firmware = 'firmware'
else if (store.targetType)
  store.firmware = 'backpack'

store.options.flashMethod = urlParams.get('method');

</script>

<template>
  <VApp class="td-app">
    <VLayout>
      <ReloadPrompt />
      <VAppBar :height="appBarHeight" class="td-app-bar" flat>
        <div class="td-app-bar__content td-app-bar__content--stack">
          <div class="td-brand">
            <button class="td-logo-button" type="button" @click="goHome" aria-label="Back to landing page">
              <img class="td-logo" :src="logoUrl" alt="Titan Dynamics" />
            </button>
          </div>
          <div class="td-title__sub">TitanLRS Web Flasher</div>
        </div>
      </VAppBar>
      <VMain class="td-main">
        <div class="section">
          <VFadeTransition mode="out-in" >
            <VContainer max-width="1280px" v-if="!store.targetType" style="display: grid; gap: 40px;">
              <FirmwareSelect/>
            </VContainer>
            <VContainer max-width="1024px" v-else>
              <div class="containerMain">

                <VStepper v-model="store.currentStep" :items="['Hardware', 'Options', 'Flashing']" hideActions>
                  <template v-slot:item.1>
                    <MainHardwareSelect v-if="store.firmware==='firmware'"/>
                    <VRXHardwareSelect vendor-label="Transmitter Module" v-if="store.targetType==='txbp'"/>
                    <VRXHardwareSelect vendor-label="VRx Type" v-if="store.targetType==='vrx'"/>
                    <VRXHardwareSelect vendor-label="Antenna Tracker Type" v-if="store.targetType==='aat'"/>
                    <VRXHardwareSelect vendor-label="Timer Type" v-if="store.targetType==='timer'"/>
                  </template>
                  <template v-slot:item.2>
                    <TransmitterOptions v-if="store.targetType==='tx'"/>
                    <ReceiverOptions v-else-if="store.targetType==='rx'"/>
                    <BackpackOptions v-else/>
                  </template>
                  <template v-slot:item.3>
                    <Download v-if="store.options.flashMethod==='download'"/>
                    <Download v-else-if="store.options.flashMethod==='wifi'"/>
                    <STLinkFlash v-else-if="store.options.flashMethod==='stlink'"/>
                    <SerialFlash v-else/>
                  </template>
                  <VStepperActions :disabled="disableNext()" :next-text="nextLabel" @click:prev="stepPrev" @click:next="stepNext"/>
                </VStepper>
              </div>
            </VContainer>
          </VFadeTransition>
        </div>
      </VMain>
    </VLayout>
  </VApp>
</template>

<style>
.td-app-bar {
  background: #0a0a0a !important;
  border-bottom: 0;
}

.td-app-bar__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 28px 16px 0 16px;
}

.td-brand {
  display: flex;
  align-items: center;
}

.td-logo-button {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.td-logo-button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 6px;
}

.td-logo {
  width: 336px;
  height: 75px;
  max-width: 100%;
  object-fit: contain;
}

.td-title__sub {
  font-size: 27px;
  font-weight: 400;
  color: #ffffff;
  letter-spacing: 0.05em;
  text-transform: none;
  text-align: center;
}


@media (max-width: 960px) {
  .td-logo {
    max-height: 48px;
  }

  .td-title__sub {
    font-size: 27px;
  }

}

@media (max-width: 640px) {
  .td-app-bar__content {
    gap: 6px;
    padding: 8px 12px 0 12px;
  }

  .td-title__sub {
    font-size: 17px;
  }
}
</style>