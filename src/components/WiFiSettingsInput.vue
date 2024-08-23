<script setup>
import {ref} from "vue";

let ssid = defineModel('ssid')
let password = defineModel('password')

let showPassword = ref(false)
</script>

<template>
  <VTextField v-model="ssid" label="WiFi SSID"/>
  <VTextField v-model="password" label="WiFi Password"
              :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              :type="showPassword ? 'text' : 'password'"
              @click:append-inner="showPassword = !showPassword"/>
</template>
