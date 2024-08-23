<script setup>
import {store} from "../js/state.js";

let model = defineModel()
</script>

<template>
  <VNumberInput v-model="model" :label="'WiFi &quot;auto on&quot; interval' + (model === null ? ' (Disabled)' : '')" suffix="seconds"
                :step="10" :min="0" :max="120"
                v-if="store.target?.config?.platform!=='stm32'"/>
</template>
