import {TransportEx} from './serialex.js'
import {CustomReset, ESPLoader} from 'esptool-js'
import {Passthrough} from './passthrough.js'
import CryptoJS from 'crypto-js'
import {MismatchError, WrongMCU} from "./error.js";

const ESP_FLASHER_LOG_PREFIX = '[ESPFlasher]'

export class ESPFlasher {
    constructor(device, type, method, config, options, firmwareUrl, term) {
        this.device = device
        this.type = type
        this.method = method
        this.config = config
        this.options = options
        this.firmwareUrl = firmwareUrl
        this.term = term
        this.mainFirmware = type === 'TX' || type === 'RX'
    }

    connect = async () => {
        console.info(`${ESP_FLASHER_LOG_PREFIX} connect:start`, {
            method: this.method,
            deviceType: this.type,
            platform: this.config.platform,
            firmware: this.config.firmware
        })
        let mode = 'default_reset'
        let baudrate = 460800
        let initbaud
        if (this.method === 'betaflight') {
            baudrate = 420000
            mode = 'no_reset'
        } else if (this.method === 'etx') {
            if (this.mainFirmware) {
                baudrate = 230400
            }
            mode = 'no_reset'
        } else if (this.method === 'passthru') {
            baudrate = 230400
            mode = 'no_reset'
        } else if (this.method === 'uart' && this.config.platform.startsWith('esp32')) {
            initbaud = 115200
        }
        if (this.config.baud) {
            baudrate = this.config.baud
            initbaud = this.config.baud
        }
        console.debug(`${ESP_FLASHER_LOG_PREFIX} connect:serial-config`, {mode, baudrate, initbaud})

        const transport = new TransportEx(this.device, false)
        const terminal = {
            clean: () => {
            },
            writeLine: (data) => this.term.writeln(data),
            write: (data) => this.term.write(data)
        }
        this.esploader = new ESPLoader({
            transport,
            baudrate,
            terminal,
            romBaudrate: initbaud === undefined ? baudrate : initbaud
        })
        this.esploader.ESP_RAM_BLOCK = 0x0800 // we override otherwise flashing on BF will fail

        let hasError
        const passthrough = new Passthrough(transport, this.term, this.config.firmware, baudrate)
        try {
            if (this.method === 'uart') {
                if (this.type === 'RX' && !this.config.platform.startsWith('esp32')) {
                    await transport.connect(baudrate)
                    const ret = await this.esploader._connectAttempt(mode = 'no_reset', new CustomReset(transport, 'W0'))

                    if (ret !== 'success') {
                        await transport.disconnect()
                        await transport.connect(420000)
                        await passthrough.reset_to_bootloader()
                    }
                } else {
                    await transport.connect(115200)
                }
            } else if (this.method === 'betaflight') {
                await transport.connect(baudrate)
                await passthrough.betaflight()
                await passthrough.reset_to_bootloader()
            } else if (this.method === 'etx') {
                await transport.connect(baudrate)
                if (this.mainFirmware) {
                    await passthrough.edgeTX()
                } else {
                    await passthrough.edgeTXBP()
                }
            } else if (this.method === 'passthru') {
                await transport.connect(baudrate)
                await transport.setDTR(false)
                await transport.sleep(100)
                await transport.setRTS(false)
                await transport.sleep(5000)
                await transport.setDTR(true)
                await transport.sleep(200)
                await transport.setDTR(false)
                await transport.sleep(100)
            }
        } catch(e) {
            if (!(e instanceof MismatchError)) {
                console.error(`${ESP_FLASHER_LOG_PREFIX} connect:passthrough-failed`, e)
                throw e
            }
            console.warn(`${ESP_FLASHER_LOG_PREFIX} connect:mismatch`, {error: e?.message})
            hasError = e
        }

        await transport.disconnect()

        const chip = await this.esploader.main(mode)
        if ((this.esploader.chip.CHIP_NAME === 'ESP8266' && this.config.platform !== 'esp8285') ||
            (this.esploader.chip.CHIP_NAME === 'ESP32-C3' && this.config.platform !== 'esp32-c3') ||
            (this.esploader.chip.CHIP_NAME === 'ESP32-S3' && this.config.platform !== 'esp32-s3') ||
            (this.esploader.chip.CHIP_NAME === 'ESP32' && this.config.platform !== 'esp32')) {
            console.error(`${ESP_FLASHER_LOG_PREFIX} connect:wrong-mcu`, {
                detected: this.esploader.chip.CHIP_NAME,
                expected: this.config.platform
            })
            throw new WrongMCU(`Wrong target selected, this device uses '${chip}' and the firmware is for '${this.config.platform}'`)
        }
        console.info(`${ESP_FLASHER_LOG_PREFIX} connect:ready`, {chip})

        if (hasError) {
            throw hasError
        }
        return this.esploader.chip.CHIP_NAME
    }

    flash = async (files, erase, progress) => {
        console.info(`${ESP_FLASHER_LOG_PREFIX} flash:start`, {
            fileCount: files.length,
            erase,
            method: this.method,
            platform: this.config.platform
        })
        const loader = this.esploader
        if (this.method === 'etx' || this.method === 'betaflight') {
            loader.FLASH_WRITE_SIZE = 0x0800
            if (this.config.platform.startsWith('esp32') && this.method === 'betaflight') {
                files = files.slice(-1)
            }
        }

        const fileArray = files.map(v => ({data: loader.ui8ToBstr(v.data), address: v.address}))
        loader.IS_STUB = true
        return loader.writeFlash({
            fileArray,
            flashSize: 'keep',
            flashMode: 'keep',
            flashFreq: 'keep',
            eraseAll: erase,
            compress: true,
            reportProgress: progress,
            calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image))
        })
            .then(_ => {
                progress(fileArray.length - 1, 100, 100)
                console.info(`${ESP_FLASHER_LOG_PREFIX} flash:write-complete`, {fileCount: fileArray.length})
                if (this.config.platform.startsWith('esp32')) {
                    return loader.after('hard_reset').catch((error) => {
                        console.warn(`${ESP_FLASHER_LOG_PREFIX} flash:hard-reset-failed`, {error: error?.message ?? error})
                    })
                } else {
                    return loader.after('soft_reset').catch((error) => {
                        console.warn(`${ESP_FLASHER_LOG_PREFIX} flash:soft-reset-failed`, {error: error?.message ?? error})
                    })
                }
            })
            .then((result) => {
                console.info(`${ESP_FLASHER_LOG_PREFIX} flash:complete`)
                return result
            })
    }

    close = async () => {
        console.debug(`${ESP_FLASHER_LOG_PREFIX} close:start`)
        await this.esploader.transport.disconnect()
        console.debug(`${ESP_FLASHER_LOG_PREFIX} close:complete`)
    }
}
