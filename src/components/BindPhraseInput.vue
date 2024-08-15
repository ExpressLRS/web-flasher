<script setup>
import {ref} from "vue";
import {VTextField} from "vuetify/components";
import {uidBytesFromText} from "../js/phrase.js";

let model = defineModel()

let bindPhrase = ref(null)
let uid=ref('Bind Phrase')
function generateUID() {
  if (bindPhrase.value === '') uid.value='Bind Phrase'
  else {
    model.value = uidBytesFromText(bindPhrase.value)
    uid.value = 'UID: ' + model.value
  }
}
</script>

<template>
  <VTextField v-model="bindPhrase" :label="uid" density="comfortable" :oninput="generateUID"/>
</template>
