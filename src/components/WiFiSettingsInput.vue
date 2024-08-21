<script setup>
let ssid = defineModel('ssid')
let password = defineModel('password')
</script>

<template>
  <VTextField v-model="ssid" label="WiFi SSID"/>
  <VTextField v-model="password" label="WiFi Password"/>
</template>
