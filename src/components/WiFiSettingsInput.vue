<script setup>
let ssid = defineModel('ssid')
let password = defineModel('password')
let wifiOnInternal = defineModel('wifiOnInterval')
</script>

<template>
  <VTextField v-model="ssid" label="WiFi SSID"/>
  <VTextField v-model="password" label="WiFi Password"/>
  <VTextField v-model="wifiOnInternal" label='WiFi "auto on" interval (s)'/>
</template>
