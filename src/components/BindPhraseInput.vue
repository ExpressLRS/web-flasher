<script setup>
import {ref, watch, onMounted} from "vue";
import {VTextField} from "vuetify/components";
import {uidBytesFromText} from "../js/phrase.js";

const props = defineProps({
  bindPhraseText: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:bindPhraseText'])

let model = defineModel()

let bindPhrase = ref(null)
let uid = ref('Bind Phrase')

function generateUID() {
  if (bindPhrase.value === '' || bindPhrase.value === null) {
    uid.value = 'Bind Phrase'
    model.value = null
    emit('update:bindPhraseText', null)
  } else {
    let val = Array.from(uidBytesFromText(bindPhrase.value))
    model.value = val
    uid.value = 'UID: ' + val
    emit('update:bindPhraseText', bindPhrase.value)
  }
}

watch(() => model.value, (newVal) => {
  if (newVal && Array.isArray(newVal) && newVal.length > 0) {
    uid.value = 'UID: ' + newVal
  } else if (!newVal) {
    uid.value = 'Bind Phrase'
  }
}, { immediate: true })

watch(() => props.bindPhraseText, (newVal) => {
  if (newVal && !bindPhrase.value) {
    bindPhrase.value = newVal
    generateUID()
  }
}, { immediate: true })

onMounted(() => {
  if (props.bindPhraseText) {
    bindPhrase.value = props.bindPhraseText
    generateUID()
  } else if (model.value && Array.isArray(model.value) && model.value.length > 0) {
    uid.value = 'UID: ' + model.value
  }
})
</script>

<template>
  <VTextField v-model="bindPhrase" name="bind-phrase" :label="uid" :oninput="generateUID"/>
</template>
