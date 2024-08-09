import { reactive, version, watch } from 'vue'

export const store = reactive({
  firmware: null,
  targetType: null,
  version: null,
  vendor: null,
  radio: null,
  target: null,
})

watch(() => store.targetType, (_newValue, _oldValue) => {
  store.vendor = null
  store.radio = null
  store.target = null
})
