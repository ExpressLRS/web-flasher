import {compareSemanticVersions} from "./version.js";
import {store} from "./state.js";
import {fetchHardwareFile} from "./targets.js";

const CONFIGURE_LOG_PREFIX = '[Configure]'

export class Configure {
    static #MAGIC = new Uint8Array([0xBE, 0xEF, 0xBA, 0xBE, 0xCA, 0xFE, 0xF0, 0x0D])

    static #find_patch_location(binary) {
        return binary.findIndex((_, i, a) => {
            let j = 0
            while (j < Configure.#MAGIC.length && a[i + j] === Configure.#MAGIC[j]) {
                j++
            }
            return j === Configure.#MAGIC.length
        })
    }

    static #write32(binary, pos, val) {
        if (val !== undefined) {
            binary[pos + 0] = (val >> 0) & 0xFF
            binary[pos + 1] = (val >> 8) & 0xFF
            binary[pos + 2] = (val >> 16) & 0xFF
            binary[pos + 3] = (val >> 24) & 0xFF
        }
        return pos + 4
    }

    static #patch_buzzer(binary, pos, options) {
        binary[pos] = options.beeptype
        pos += 1
        for (let i = 0; i < 32 * 4; i++) {
            binary[pos + i] = 0
        }
        const melody = options.melody
        if (melody) {
            for (let i = 0; i < melody.length; i++) {
                binary[pos + i * 4 + 0] = melody[i][0] & 0xFF
                binary[pos + i * 4 + 1] = (melody[i][0] >> 8) & 0xFF
                binary[pos + i * 4 + 2] = melody[i][1] & 0xFF
                binary[pos + i * 4 + 3] = (melody[i][1] >> 8) & 0xFF
            }
        }
        pos += 32 * 4
        return pos
    }

    static #patch_tx_params(binary, pos, options, version) {
        pos = this.#write32(binary, pos, options['tlm-report'])
        if (compareSemanticVersions(store.version, '3.5') < 0) {
            pos = this.#write32(binary, pos, options['fan-runtime'])
        }
        let val = binary[pos]
        if (options['uart-inverted']) {
            val &= ~1
            val |= options['uart-inverted'] ? 1 : 0
        }
        if (options['unlock-higher-power']) {
            val &= ~2
            val |= options['unlock-higher-power'] ? 2 : 0
        }
        binary[pos] = val
        return pos + 1
    }

    static #patch_rx_params(binary, pos, options) {
        pos = this.#write32(binary, pos, options['rcvr-uart-baud'])
        let val = binary[pos]
        if (options['rcvr-invert-tx']) {
            val &= ~1
            val |= options['rcvr-invert-tx'] ? 1 : 0
        }
        if (options['lock-on-first-connection']) {
            val &= ~2
            val |= options['lock-on-first-connection'] ? 2 : 0
        }
        if (options['r9mm-mini-sbus']) {
            val &= ~4
            val |= options['r9mm-mini-sbus'] ? 4 : 0
        }
        binary[pos] = val
        return pos + 1
    }

    static #configureSTM32(binary, deviceType, radioType, options) {
        let pos = this.#find_patch_location(binary)
        if (pos === -1) throw new Error('Configuration magic not found in firmware file. Is this a 3.x firmware?')

        pos += 8 // Skip magic
        const version = binary[pos] + binary[pos + 1] << 8
        pos += 2 // Skip version
        if (version === 0) {
            pos += 1 // Skip the (old) hardware flag
        }

        // Poke in the domain
        if (radioType === 'sx127x' && options.domain) {
            binary[pos] = options.domain
        }
        pos += 1

        // Poke in the UID (if there is one)
        if (options.uid) {
            binary[pos] = 1
            for (let i = 0; i < 6; i++) {
                binary[pos + 1 + i] = options.uid[i]
            }
        } else {
            binary[pos] = 0
        }
        pos += 7

        if (compareSemanticVersions(store.version, '3.4') >= 0) {
            pos = this.#write32(binary, pos, options['flash-discriminator'])
        }

        if (compareSemanticVersions(store.version, '3.5') >= 0) {
            pos = this.#write32(binary, pos, options['fan-runtime'])
        }

        if (deviceType === 'TX') { // TX target
            pos = this.#patch_tx_params(binary, pos, options, version)
            if (options.beeptype) { // Has a Buzzer
                pos = this.#patch_buzzer(binary, pos, options)
            }
        } else if (deviceType === 'RX') { // RX target
            pos = this.#patch_rx_params(binary, pos, options)
        }

        return binary
    }

    static #checkStatus = (response) => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`)
        }
        return response
    }

    static #fetch_file = async (file, address, transform = (e) => e) => {
        console.debug(`${CONFIGURE_LOG_PREFIX} fetch:start`, {file, address})
        try {
            const response = this.#checkStatus(await fetch(file))
            const blob = await response.blob()
            const arrayBuffer = await blob.arrayBuffer()
            const dataArray = new Uint8Array(arrayBuffer)
            const data = transform(dataArray)
            console.info(`${CONFIGURE_LOG_PREFIX} fetch:success`, {file, address, bytes: data.length})
            return {data, address}
        } catch (error) {
            console.error(`${CONFIGURE_LOG_PREFIX} fetch:error`, {file, address, error: error?.message ?? error})
            throw error
        }
    }

    static #findFirmwareEnd = (binary, config) => {
        let pos = 0x0
        if (config.platform === 'esp8285') pos = 0x1000
        if (binary[pos] !== 0xE9) throw new Error('The file provided does not the right magic for a firmware file!')
        let segments = binary[pos + 1]
        if (config.platform.startsWith('esp32')) pos = 24
        else pos = 0x1008
        while (segments--) {
            const size = binary[pos + 4] + (binary[pos + 5] << 8) + (binary[pos + 6] << 16) + (binary[pos + 7] << 24)
            pos += 8 + size
        }
        pos = (pos + 16) & ~15
        if (config.platform.startsWith('esp32')) pos += 32
        return pos
    }

    static #appendArray = (...args) => {
        const totalLength = args.reduce((acc, value) => acc + value.length, 0)
        const c = new Uint8Array(totalLength)
        args.reduce((acc, value) => {
            c.set(value, acc)
            return acc + value.length
        }, 0)
        return c
    }

    static #ui8ToBstr = (u8Array) => {
        const len = u8Array.length
        let bStr = ''
        for (let i = 0; i < len; i++) {
            bStr += String.fromCharCode(u8Array[i])
        }
        return bStr
    }

    static #bstrToUi8 = (bStr) => {
        const len = bStr.length
        const u8array = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            u8array[i] = bStr.charCodeAt(i)
        }
        return u8array
    }

    static #configureESP = (deviceType, binary, config, options) => {
        const end = this.#findFirmwareEnd(binary, config)
        if (deviceType === 'RX' || deviceType === 'TX') {
            return this.#appendArray(
                binary.slice(0, end),
                this.#bstrToUi8(config.product_name.padEnd(128, '\x00')),
                this.#bstrToUi8(config.lua_name.padEnd(16, '\x00')),
                this.#bstrToUi8(JSON.stringify(options).padEnd(512, '\x00'))
            )
        } else {
            return this.#appendArray(
                binary.slice(0, end),
                this.#bstrToUi8(JSON.stringify(options).padEnd(512, '\x00'))
            )
        }
    }

    static download = async (folder, version, deviceType, rxAsTxType, radioType, config, firmwareUrl, options) => {
        console.info(`${CONFIGURE_LOG_PREFIX} download:start`, {
            folder,
            version,
            deviceType,
            platform: config.platform,
            firmwareUrl
        })
        if (rxAsTxType) firmwareUrl = firmwareUrl.replace('_RX', '_TX')
        if (config.platform === 'stm32') {
            console.info(`${CONFIGURE_LOG_PREFIX} download:stm32`, {firmwareUrl, radioType})
            const entry = await this.#fetch_file(firmwareUrl, 0, (bin) => this.#configureSTM32(bin, deviceType, radioType, options))
            console.info(`${CONFIGURE_LOG_PREFIX} download:complete`, {files: 1})
            return [entry]
        } else {
            const list = []

            let hardwareLayoutData
            if (config.custom_layout) {
                console.info(`${CONFIGURE_LOG_PREFIX} layout:custom`, {bytes: JSON.stringify(config.custom_layout).length})
                hardwareLayoutData = this.#bstrToUi8(JSON.stringify(config.custom_layout))
            } else if (config.layout_file) {
                let hardwareLayoutFile
                if (deviceType === 'TX' || deviceType === 'RX') {
                    // TX/RX layouts are resolved only from GitHub targets repos
                    hardwareLayoutFile = await (async () => {
                        console.info(`${CONFIGURE_LOG_PREFIX} layout:github:start`, {path: `${deviceType}/${config.layout_file}`})
                        const resp = await fetchHardwareFile(`${deviceType}/${config.layout_file}`)
                        const buf = await resp.arrayBuffer()
                        console.info(`${CONFIGURE_LOG_PREFIX} layout:github:success`, {path: `${deviceType}/${config.layout_file}`, bytes: buf.byteLength})
                        return {data: new Uint8Array(buf), address: 0}
                    })()
                } else {
                    // backpack and other device types keep existing local lookup flow
                    console.info(`${CONFIGURE_LOG_PREFIX} layout:local:start`, {path: `${folder}/${version}/hardware/${deviceType}/${config.layout_file}`})
                    hardwareLayoutFile = await this.#fetch_file(`${folder}/${version}/hardware/${deviceType}/${config.layout_file}`, 0)
                        .catch(() => this.#fetch_file(`${folder}/hardware/${deviceType}/${config.layout_file}`, 0))
                }
                let layout = JSON.parse(this.#ui8ToBstr(hardwareLayoutFile.data))
                if (config.overlay) {
                    layout = {
                        ...layout,
                        ...config.overlay
                    }
                }
                if (rxAsTxType === 'external') layout['serial_rx'] = layout['serial_tx']
                hardwareLayoutData = this.#bstrToUi8(JSON.stringify(layout))
                console.info(`${CONFIGURE_LOG_PREFIX} layout:resolved`, {bytes: hardwareLayoutData.length})
            } else {
                console.info(`${CONFIGURE_LOG_PREFIX} layout:none`)
                hardwareLayoutData = new Uint8Array(0)
            }

            if (config.platform.startsWith('esp32')) {
                let startAddress = 0x1000
                if (config.platform.startsWith('esp32-')) {
                    startAddress = 0x0000
                }
                list.push(this.#fetch_file(firmwareUrl.replace('firmware.bin', 'bootloader.bin'), startAddress))
                list.push(this.#fetch_file(firmwareUrl.replace('firmware.bin', 'partitions.bin'), 0x8000))
                list.push(this.#fetch_file(firmwareUrl.replace('firmware.bin', 'boot_app0.bin'), 0xE000))
                list.push(this.#fetch_file(firmwareUrl, 0x10000, (bin) => Configure.#configureESP(deviceType, bin, config, options)))
            } else if (config.platform === 'esp8285') {
                list.push(this.#fetch_file(firmwareUrl, 0x0, (bin) => Configure.#configureESP(deviceType, bin, config, options)))
            }

            console.info(`${CONFIGURE_LOG_PREFIX} firmwareFiles:fetching`, {count: list.length})
            const files = await Promise.all(list)
            console.info(`${CONFIGURE_LOG_PREFIX} firmwareFiles:fetched`, {count: files.length})
            let logoFile = {data: new Uint8Array(0), address: 0}
            if (config.logo_file) {
                if (deviceType === 'TX' || deviceType === 'RX') {
                    // TX/RX logos are resolved only from GitHub targets repos
                    logoFile = await (async () => {
                        console.info(`${CONFIGURE_LOG_PREFIX} logo:github:start`, {path: `logo/${config.logo_file}`})
                        const resp = await fetchHardwareFile(`logo/${config.logo_file}`)
                        const buf = await resp.arrayBuffer()
                        console.info(`${CONFIGURE_LOG_PREFIX} logo:github:success`, {path: `logo/${config.logo_file}`, bytes: buf.byteLength})
                        return {data: new Uint8Array(buf), address: 0}
                    })().catch((error) => {
                        console.warn(`${CONFIGURE_LOG_PREFIX} logo:github:missing`, {path: `logo/${config.logo_file}`, error: error?.message ?? error})
                        return {data: new Uint8Array(0), address: 0}
                    })
                } else {
                    // backpack and other device types keep existing local lookup flow
                    console.info(`${CONFIGURE_LOG_PREFIX} logo:local:start`, {path: `${folder}/${version}/hardware/logo/${config.logo_file}`})
                    logoFile = await this.#fetch_file(`${folder}/${version}/hardware/logo/${config.logo_file}`, 0)
                        .catch(() => this.#fetch_file(`${folder}/hardware/logo/${config.logo_file}`, 0))
                        .catch((error) => {
                            console.warn(`${CONFIGURE_LOG_PREFIX} logo:local:missing`, {path: config.logo_file, error: error?.message ?? error})
                            return {data: new Uint8Array(0), address: 0}
                        })
                }
            }
            files[files.length - 1].data = this.#appendArray(
                files[files.length - 1].data,
                hardwareLayoutData,
                (new Uint8Array(2048 - hardwareLayoutData.length)).fill(0),
                logoFile.data
            )
            console.info(`${CONFIGURE_LOG_PREFIX} download:complete`, {
                files: files.length,
                finalMainFileBytes: files[files.length - 1].data.length,
                layoutBytes: hardwareLayoutData.length,
                logoBytes: logoFile.data.length
            })
            return files
        }
    }
}
