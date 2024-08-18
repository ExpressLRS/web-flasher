import {reactive} from 'vue'

export const store = reactive({
    currentStep: 1,
    firmware: null,
    targetType: null,
    version: null,
    vendor: null,
    vendor_name: '',
    radio: null,
    target: null,
    name: '',
    options: {
        uid: null,
        region: 'FCC',
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

export function resetState() {
    store.currentStep = 1
    store.firmware = null
    store.targetType = null
    store.vendor = null
    store.radio = null
    store.target = null
    store.options = {
        uid: null,
        region: 'FCC',
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
}
