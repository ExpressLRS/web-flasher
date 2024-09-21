<script setup>
import {ref} from "vue";
import {VTextField} from "vuetify/components";
import {uidBytesFromText} from "../js/phrase.js";

let model = defineModel()

let bindPhrase = ref(null)
let uid = ref('Bind Phrase')

function generateUID() {
  if (bindPhrase.value === '') uid.value = 'Bind Phrase'
  else {
    let val = Array.from(uidBytesFromText(bindPhrase.value))
    model.value = val
    uid.value = 'UID: ' + val
  }
}
</script>

<template>
  <VTextField v-model="bindPhrase" name="bind-phrase" :label="uid" :oninput="generateUID"/>
</template>
