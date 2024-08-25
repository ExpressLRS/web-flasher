<script setup>
import {store} from '../js/state';
import HoverCard from '../components/HoverCard.vue';

const emit = defineEmits(['onClick']);

// Set firmware and targetType in state store, then update page to pages selection page
function setFirmware(firmware, targetType) {
  store.firmware = firmware;
  store.targetType = targetType;
  emit('onClick');
}
</script>

<template>
  <VCardTitle>Main RC Firmware</VCardTitle>
  <VCardSubtitle>Controlled or controlling... we got you covered!</VCardSubtitle>
  <br>
  <VRow>
    <VCol md="6">
      <HoverCard min-height="100%" @click="setFirmware('firmware', 'tx')"
                 image="remote-control_1287373.png" hover-image="remote-control_1287311.png"
                 title="Transmitter"
                 text="Flash your external transmitter module, JR Bay (Micro) or Nano module; or an internal module
                 built into your radio handset."/>
    </VCol>
    <VCol md="6">
      <HoverCard min-height="100%" @click="setFirmware('firmware', 'rx')"
                 image="ear_6598299.png" hover-image="ear_6598275.png"
                 title="Receiver"
                 text="Serial connected and PWM receivers alike may flashed here."/>
    </VCol>
  </VRow>
  <br>
  <VCardTitle>Backpack Firmware</VCardTitle>
  <VCardSubtitle>Wireless control of <i>all</i> the things!</VCardSubtitle>
  <br>
  <VRow>
    <VCol md="3">
      <HoverCard min-height="100%" @click="setFirmware('backpack', 'txbp')"
                 image="backpack_723137.png" hover-image="backpack_723278.png"
                 title="Transmitter Module"
                 text="Built in to most transmitters, it communicates with the other backpacks or via WiFi to a computer
                 running Mission Planner (or other) for MAVLink craft."/>
    </VCol>
    <VCol md="3">
      <HoverCard min-height="100%" @click="setFirmware('backpack', 'vrx')"
                 image="vr-glasses_8736938.png" hover-image="vr-glasses_8737003.png"
                 title="Video Receiver"
                 text="A built-in VRx backpack like the HDZero goggles backpack, or the SkyZone ELRS backpack; or a
                 DIY solution connected to a VRx allows you to always have your goggles on the right channel."/>
    </VCol>
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
</template>