<script setup>
import {store} from '../js/state';
import HoverCard from '../components/HoverCard.vue';

import controllerIcon from '../assets/brand/controller-icon.png';
import radioIcon from '../assets/brand/radio-icon.png';
import moduleIcon from '../assets/brand/module-icon.png';
import vrxIcon from '../assets/brand/video-receiver-combined-icon.png';

const emit = defineEmits(['onClick']);

// Set firmware and targetType in state store, then update page to pages selection page
function setFirmware(firmware, targetType) {
  store.firmware = firmware;
  store.targetType = targetType;
  emit('onClick');
}
</script>

<template>
  <div class="firmware-grid">
    <div class="containerMain firmware-group">
      <div class="containerHeader">
        <VCardTitle>Main Firmware</VCardTitle>
      </div>
      <VRow class="firmware-row firmware-options" no-gutters>
        <VCol cols="12" md="12">
        <HoverCard min-height="100%" @click="setFirmware('firmware', 'tx')"
                    :image="controllerIcon" :hover-image="controllerIcon"
                    title="Transmitter"
                    text="Install or update the main TitanLRS firmware on any compatible Transmitter module.
                    Internal and external modules supported."/>
        </VCol>
        <VCol cols="12" md="12">
        <HoverCard min-height="100%" @click="setFirmware('firmware', 'rx')"
                    :image="radioIcon" :hover-image="radioIcon"
                    title="Receiver"
                    text="Install or update the main TitanLRS firmware on any compatible Receiver. Serial and PWM
                    Receivers supported."/>
        </VCol>
      </VRow>
    </div>
    <div class="containerMain firmware-group">
      <div class="containerHeader">
        <VCardTitle>Backpack Firmware</VCardTitle>
      </div>
      <VRow class="firmware-row firmware-options" no-gutters>
        <VCol cols="12" md="12">
        <HoverCard min-height="100%" @click="setFirmware('backpack', 'txbp')"
                    :image="moduleIcon" :hover-image="moduleIcon"
                    title="Transmitter Backpack"
                    text="Install or update the firmware on the secondary Backpack module inside the Transmitter."/>
        </VCol>
        <VCol cols="12" md="12">
        <HoverCard min-height="100%" @click="setFirmware('backpack', 'vrx')"
                    :image="vrxIcon" :hover-image="vrxIcon"
                    title="Backpack Receiver"
                    text="Install or update the firmware on a Backpack receiver. For example: A VRX Backpack RX."/>
        </VCol>
      </VRow>
    </div>
  </div>
  <!--
  <VRow>
    <VCol md="3">
      <HoverCard min-height="100%" @click="setFirmware('backpack', 'aat')"
                  image="satellite_2637312.png" hover-image="satellite_2637314.png"
                  title="Antenna Tracker"
                  text="Flying long-range and need your antenna pointed in just the right direction? This is the backpack
                  for you!"/>
    </VCol>
    <VCol md="3">
      <HoverCard min-height="100%" @click="setFirmware('backpack', 'timer')"
                  image="stopwatch_4354897.png" hover-image="stopwatch_4355918.png"
                  title="Race Timer"
                  text="Connects to the RotorHazard race timing system and sends OSD message with lap times and current
                  place during the race so you always know where you're placed."/>
    </VCol>
  </VRow>
  -->
</template>

<style scoped>
.v-card-title {
  padding: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 28.8px;
  color: #fa8423;
  letter-spacing: 0;
}

.v-card-subtitle {
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  color: #9ca3af;
}

.firmware-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  justify-content: center;
  width: 1032px;
  height: 383px;
  margin: 0 auto;
}

.firmware-group {
  width: 500px;
  height: 383px;
}

.firmware-group :deep(.v-row) {
  height: 100%;
  align-content: space-between;
}

.firmware-group :deep(.firmware-options) {
  width: 100%;
  height: 266px;
  margin: 0;
  row-gap: 12px;
}

.firmware-group :deep(.firmware-options > .v-col) {
  padding: 0;
}

@media (max-width: 960px) {
  .firmware-grid {
    grid-template-columns: 1fr;
    justify-items: center;
    width: 100%;
    height: auto;
  }

  .firmware-group {
    width: min(500px, 100%);
    height: auto;
  }

  .firmware-group :deep(.v-row) {
    height: auto;
    align-content: flex-start;
  }

  .firmware-group :deep(.firmware-options) {
    height: auto;
    row-gap: 12px;
  }
}

@media (max-width: 640px) {
  .firmware-group :deep(.firmware-options) {
    row-gap: 12px;
  }
}
</style>