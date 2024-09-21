import * as libstlink from './stlink/lib/package.js'
import WebStlink from './stlink/webstlink.js'

export class STLink {
    constructor(term) {
        this.term = term
        this.stlink = null
        this.device = null
    }

    log(str) {
        this.term.writeln(str)
    }

    debug(msg) {
    }

    verbose(msg) {
    }

    info(msg) {
    }

    error(msg) {
        this.log('[ERROR] ' + msg)
    }

    warning(msg) {
        this.log('[WARN] ' + msg)
    }

    /* eslint-disable camelcase */
    bargraph_start(msg, {value_min = 0, value_max = 100}) {
        this._msg = msg
        this._bargraph_min = value_min
        this._bargraph_max = value_max
    }

    /* eslint-enable camelcase */

    bargraph_update({value = 0, percent = null}) {
        if (percent === null) {
            if ((this._bargraph_max - this._bargraph_min) > 0) {
                percent = Math.floor((100 * (value - this._bargraph_min)) / (this._bargraph_max - this._bargraph_min))
            } else {
                percent = 0
            }
        }
        if (percent > 100) {
            percent = 100
        }
        this.progressCallback(this.fileNumber, percent, 100, this._msg)
    }

    bargraph_done() {
        this.progressCallback(this.fileNumber, 100, 100)
    }

    update_debugger_info(stlink, device) {
        const version = 'ST-Link/' + stlink._stlink.ver_str
        this.log(`Debugger - ${version} - Connected`)
        this.log(device.productName)
        this.log(device.manufacturerName)
        this.log(device.serialNumber)
    }

    update_target_status(status, target = null) {
        if (target !== null) {
            const fields = [
                ['type', 'MCU Type', ''],
                ['core', 'Core', ''],
                ['dev_id', 'Device ID', ''],
                ['flash_size', 'Flash Size', 'KiB'],
                ['sram_size', 'SRAM Size', 'KiB']
            ]
            if (target.eeprom_size > 0) {
                fields.push(['eeprom_size', 'EEPROM Size', 'KiB'])
            }
            for (const [key, title, suffix] of fields) {
                this.log(title + ': ' + target[key] + suffix)
            }
        }

        const haltState = status.halted ? 'Halted' : 'Running'
        const debugState = 'Debugging ' + (status.debug ? 'Enabled' : 'Disabled')

        this.log(`${haltState}, ${debugState}`)
    }

    on_successful_attach = async (stlink, device) => {
        // Export for manual debugging
        this.stlink = stlink
        this.device = device

        this.update_debugger_info(stlink, device)

        // Detect attached target CPU
        this.target = await stlink.detect_cpu(this.config.stlink.cpus, null)

        // Attach UI callbacks for whenever the CPU state is inspected
        const that = this

        function updateOnInspection(status) {
            that.update_target_status(status, null)
        }

        stlink.add_callback('halted', updateOnInspection)
        stlink.add_callback('resumed', updateOnInspection)

        // Update the UI with detected target info and debug state
        let status = await stlink.inspect_cpu()
        if (!status.debug) {
            // Automatically enable debugging
            await stlink.set_debug_enable(true)
            status = await stlink.inspect_cpu()
        }

        this.update_target_status(status, this.target)

        // Set the read memory address to the SRAM start
        this.log('SRAM address = 0x' + this.target.sram_start.toString(16))

        // Set the flash write address to the Flash start
        this.log('Flash adddress = 0x' + this.target.flash_start.toString(16))
    }

    on_disconnect = () => {
        this.info('Device disconnected')

        this.stlink = null
        this.device = null
    }

    connect = async (config, handler) => {
        this.config = config
        if (this.stlink !== null) {
            await this.stlink.detach()
            this.on_disconnect()
        }
        try {
            const device = await navigator.usb.requestDevice({
                filters: libstlink.usb.filters
            })
            navigator.usb.ondisconnect = e => {
                if (e.device === device) handler()
            }
            const nextStlink = new WebStlink(this)
            await nextStlink.attach(device, this)
            this.stlink = nextStlink
            this.device = device
        } catch (err) {
            this.error(err)
            throw err
        }
        if (this.stlink !== null) {
            await this.on_successful_attach(this.stlink, this.device)
        }
    }

    // PK pass in bootloader binary if we want to flash that!
    flash = async (binary, bootloader, progressCallback) => {
        this.progressCallback = progressCallback
        if (this.stlink !== null && this.stlink.connected) {
            this.fileNumber = 0
            if (bootloader) {
                this.log('Flash bootloader')
                try {
                    await this.stlink.halt()
                    await this.stlink.flash(this.target.flash_start, bootloader)
                } catch (err) {
                    this.error(err)
                    throw err
                }
                this.fileNumber++
            }

            const addr = parseInt(this.config.stlink.offset, 16)
            this.log('Flash ExpressLRS')
            try {
                await this.stlink.halt()
                await this.stlink.flash(this.target.flash_start + addr, binary[0].data)
            } catch (err) {
                this.error(err)
                throw err
            }
        }
    }

    close = async () => {
        this.stlink.detach()
        this.stlink = null
    }
}
