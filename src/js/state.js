import {reactive, watchEffect} from 'vue'

export const store = reactive({

})

watchEffect(() => {
    store.currentStep = 1
    store.firmware =null
    store.targetType= null
    store.version = null
    store.vendor = null
    store.vendor_name = ''
    store.radio = null
    store.target = null
    store.name = ''
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
})
