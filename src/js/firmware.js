import {store} from "./state.js";
import {Configure} from "./configure.js";

const getSettings = async (deviceType) => {
    const options = {
        'flash-discriminator': Math.floor(Math.random() * ((2 ** 31) - 2) + 1)
    }

    if (store.options.uid) {
        options.uid = store.options.uid
    }
    if (store.target.config.platform !== 'stm32') {
        options['wifi-on-interval'] = store.options.wifiOnInternal
        if (store.options.ssid) {
            options['wifi-ssid'] = store.options.ssid
            options['wifi-password'] = store.options.password
        }
    }
    let firmwareUrl
    if (store.firmware === 'firmware') {
        firmwareUrl = `/assets/firmware/${store.version}/${store.options.region}/${store.target.config.firmware}/firmware.bin`
        if (deviceType === 'RX') {// && !_('rx-as-tx').checked) {
            options['rcvr-uart-baud'] = store.options.rx.uartBaud
            options['lock-on-first-connection'] = store.options.rx.lockOnFirstConnect
        } else {
            options['tlm-interval'] = store.options.tx.telemetryInterval
            options['fan-runtime'] = store.options.tx.fanMinRuntime
            options['uart-inverted'] = store.options.tx.uartInverted
            options['unlock-higher-power'] = store.options.tx.higherPower
        }
        if (store.radio.endsWith('_900') || store.radio.endsWith('_dual')) {
            options.domain = store.options.domain
        }
        if (store.target.config.features !== undefined && store.target.config.features.indexOf('buzzer') !== -1) {
            const beeptype = store.options.tx.melodyType
            options.beeptype = beeptype > 2 ? 2 : beeptype

            const melodyModule = await import('../js/melody.js')
            if (beeptype === 2) {
                options.melody = melodyModule.MelodyParser.parseToArray('A4 20 B4 20|60|0')
            } else if (beeptype === 3) {
                options.melody = melodyModule.MelodyParser.parseToArray('E5 40 E5 40 C5 120 E5 40 G5 22 G4 21|20|0')
            } else if (beeptype === 4) {
                options.melody = melodyModule.MelodyParser.parseToArray(store.options.tx.melodyTune)
            } else {
                options.melody = []
            }
        }
    } else {
        options['product-name'] = store.target.config.product_name
        firmwareUrl = `/assets/backpack/${store.version}/${store.target.config.firmware}/firmware.bin`
    }
    let config = store.target.config
    return {config, firmwareUrl, options}
}

export async function generateFirmware() {
    let deviceType = store.targetType
    let radioType = null
    let txType = null
    if (store.firmware === 'firmware') {
        deviceType = store.targetType === 'tx' ? 'TX' : 'RX'
        radioType = store.radio.endsWith('_900') ? 'sx127x' : (store.radio.endsWith('_2400') ? 'sx128x' : 'lr1121')
        txType = undefined //_('rx-as-tx').checked ? _('connection').value : undefined // 'internal'/'external'
    }
    const folder = `/assets/${store.firmware}/${store.version}`
    const {config, firmwareUrl, options} = await getSettings(deviceType)
    const firmwareFiles = await Configure.download(folder, deviceType, txType, radioType, config, firmwareUrl, options)
    return [
        firmwareFiles,
        {config, firmwareUrl, options, deviceType, radioType, txType}
    ]
}