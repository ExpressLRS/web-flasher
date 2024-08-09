<script setup>
import HoverCard from './components/HoverCard.vue';
import { VCol, VRow, VLayout, VImg } from 'vuetify/components';
import { store } from './state';

const emit = defineEmits(['onClick']);

// Set firmware and targeType in state store, then update page to target selection page
function setFirmware(firmware, targetType) {
    store.firmware = firmware;
    store.targetType = targetType;
    emit('onClick');
}
</script>

<template>
    <VCardTitle>Firmware Selection</VCardTitle>
    <VCardSubtitle>Select the type of device you are flashing firmware to</VCardSubtitle>
    <br>
    <VRow>
        <VCol md="6">
            <HoverCard min-height="100%" @click="setFirmware('firmware', 'tx')">
                <VLayout align-center>
                    <VImg src="transmitter.svg" height="100px" width="100px"></VImg>
                </VLayout>
                <VCardTitle align-center>Transmitter</VCardTitle>
                <VCardText>Flash your external transmitter module, JR Bay (Micro) or Nano module; or an internal
                    built-in
                    ExpressLRS module.</VCardText>
            </HoverCard>
        </VCol>
        <VCol md="6">
            <HoverCard min-height="100%" @click="setFirmware('firmware', 'rx')">
                <VLayout align-center>
                    <VImg src="receiver.svg" height="100px" width="100px"></VImg>
                </VLayout>
                <VCardTitle>Receiver</VCardTitle>
                <VCardText>Serial connected and PWM receivers alike may flashed here.</VCardText>
            </HoverCard>
        </VCol>
    </VRow>
    <VRow>
        <VCol md="3">
            <HoverCard min-height="100%" @click="setFirmware('backpack', 'txbp')">
                <VLayout align-center>
                    <VImg src="tx-backpack.svg" height="100px" width="100px"></VImg>
                </VLayout>
                <VCardTitle>Transmitter Backpack</VCardTitle>
                <VCardText>Built in to most transmitters, this allows you to switch your goggles to the same frequency
                    as
                    your
                    VTx, or for wireless head-tracking or wireless connection to Mission Planner for MAVLink craft.
                </VCardText>
            </HoverCard>
        </VCol>
        <VCol md="3">
            <HoverCard min-height="100%" @click="setFirmware('backpack', 'vrx')">
                <VLayout align-center>
                    <VImg src="vrx-backpack.svg" height="100px" width="100px"></VImg>
                </VLayout>
                <VCardTitle>Video Receiver Backpack</VCardTitle>
                <VCardText>A built-in VRx backpack like the HDZero goggles backpack, or the SkyZone ELRS backpack; or a
                    DIY
                    solution connected to a VRx allows you to always have your goggles on the right channel.</VCardText>
            </HoverCard>
        </VCol>
        <VCol md="3">
            <HoverCard min-height="100%" @click="setFirmware('backpack', 'aat')">
                <VLayout align-center>
                    <VImg src="aat-backpack.svg" height="100px" width="100px"></VImg>
                </VLayout>
                <VCardTitle>Antenna Tracker Backpack</VCardTitle>
                <VCardText>Flying long-range and need your antenna pointed in just the right direction? This is the
                    backpack for
                    you!</VCardText>
            </HoverCard>
        </VCol>
        <VCol md="3">
            <HoverCard min-height="100%" @click="setFirmware('backpack', 'timer')">
                <VLayout align-center>
                    <VImg src="timer-backpack.svg" height="100px" width="100px"></VImg>
                </VLayout>
                <VCardTitle>Race Timer Backpack</VCardTitle>
                <VCardText>Connects to the RotorHazard race timing system and sends OSD message with lap times and
                    current
                    place
                    during the race so you always know where you're placed.</VCardText>
            </HoverCard>
        </VCol>
    </VRow>
</template>