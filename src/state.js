import {reactive, watch} from 'vue'

export const store = reactive({
    firmware: null,
    targetType: null,
    version: null,
    vendor: null,
    radio: null,
    target: null,
    options: {
        uid: null,
        region: 'fcc',
        domain: 1,
        ssid: null,
        password: null,
        wifiOnInternal: 60,
        tx: {
            telemetryInterval: 240,
            uartInverted: true,
            fanMinRuntime: 30,
            higherPower: false,
            melodyType: 3,
            melodyTune: null,
        },
        rx: {
            uartBaud: 420000,
            lockOnFirstConnect: true,
            r9mmMiniSBUS: false,
            fanMinRuntime: 30,
        },
        flashMethod: null,
    }
})

watch(() => store.targetType, (_newValue, _oldValue) => {
    store.vendor = null
    store.radio = null
    store.target = null
    store.options = {
        uid: null,
        region: 'fcc',
        domain: 1,
        ssid: null,
        password: null,
        wifiOnInternal: 60,
        tx: {
            telemetryInterval: 240,
            uartInverted: true,
            fanMinRuntime: 30,
            higherPower: false,
            melodyType: 3,
            melodyTune: null,
        },
        rx: {
            uartBaud: 420000,
            lockOnFirstConnect: true,
            r9mmMiniSBUS: false,
            fanMinRuntime: 30,
        },
        flashMethod: null,
    }
})
