import {MismatchError, PassthroughError} from './error.js'

export class Bootloader {
    static INIT_SEQ = {
        CRSF: [0xEC, 0x04, 0x32, this.ord('b'), this.ord('l')],
        GHST: [0x89, 0x04, 0x32, this.ord('b'), this.ord('l')]
    }

    static BIND_SEQ = {
        CRSF: [0xEC, 0x04, 0x32, this.ord('b'), this.ord('d')],
        GHST: [0x89, 0x04, 0x32, this.ord('b'), this.ord('d')]
    }

    static ord(s) {
        return s.charCodeAt(0)
    }

    static calc_crc8(payload, poly = 0xD5) {
        let crc = 0
        for (let pos = 0; pos < payload.byteLength; pos++) {
            crc ^= payload[pos]
            for (let j = 0; j < 8; ++j) {
                if ((crc & 0x80) !== 0) {
                    crc = ((crc << 1) ^ poly) % 256
                } else {
                    crc = (crc << 1) % 256
                }
            }
        }
        return crc
    }

    static get_telemetry_seq(seq, key = null) {
        const payload = new Uint8Array(seq)
        let u8array = new Uint8Array(0)
        if (key != null) {
            const len = key.length
            u8array = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                u8array[i] = key.charCodeAt(i)
            }
        }
        const tmp = new Uint8Array(payload.byteLength + u8array.byteLength + 1)
        tmp.set(payload, 0)
        tmp.set([payload[1] + u8array.byteLength], 1)
        tmp.set(u8array, payload.byteLength)
        const crc = this.calc_crc8(tmp.slice(2, tmp.byteLength - 1))
        tmp.set([crc], payload.byteLength + u8array.byteLength)
        return tmp
    }

    static get_init_seq(module, key = null) {
        return this.get_telemetry_seq(this.INIT_SEQ[module], key)
    }

    static get_bind_seq(module, key = null) {
        return this.get_telemetry_seq(this.BIND_SEQ[module], key)
    }
}

export class Passthrough {
    constructor(transport, terminal, flashTarget, baudrate, halfDuplex = false, uploadforce = false) {
        this.transport = transport
        this.terminal = terminal
        this.flash_target = flashTarget
        this.baudrate = baudrate
        this.half_duplex = halfDuplex
        this.uploadforce = uploadforce
    }

    _validate_serialrx = async (config, expected) => {
        await this.transport.write_string(`get ${config}\r\n`)
        const line = await this.transport.read_line(100)
        console.log(line)
        for (const key of expected) {
            if (line.trim().indexOf(` = ${key}`) !== -1) {
                console.log('found')
                return true
            }
        }
        console.log('NOT found')
        return false
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    log(str) {
        this.terminal.writeln(str)
    }

    sendExpect = async (send, expect, delay) => {
        await this.transport.write_string(send)
        const line = await this.transport.read_line(100)

        if (line.indexOf(expect) === -1) {
            this.log('Failed passthrough initialisation')
            this.log(`Wanted '${expect}', but not found in response '${line}'`)
            throw new PassthroughError()
        }
        await this._sleep(delay)
    }


    edgeTXBP = async () => {
        this.log('Initializing EdgeTX backpack passthrough')

        this.transport.set_delimiters(['> '])
        await this.sendExpect('set rfmod 0 power off\n', 'set: ', 100)
        await this.sendExpect('set pulses 0\n', 'set: ', 500)
        await this.sendExpect('set rfmod 0 power on\n', 'set: ', 2500)
        await this.sendExpect('set rfmod 0 bootpin 1\n', 'set: ', 100)
        await this.sendExpect('set rfmod 0 bootpin 0\n', 'set: ', 100)

        this.log('Enabling serial passthrough...')
        this.transport.set_delimiters(['\n'])
        const cmd = `serialpassthrough rfmod 0 ${this.transport.baudrate.toString()}`
        this.log(`  CMD: '${cmd}`)
        await this.transport.write_string(`${cmd}\n`)
        await this.transport.read_line(200)

        this.log('Passthrough initialization complete')
    }

    edgeTX = async () => {
        this.log('Initializing EdgeTX passthrough')

        this.transport.set_delimiters(['> '])
        await this.sendExpect('set pulses 0\n', 'set: ', 500)
        await this.sendExpect('set rfmod 0 power off\n', 'set: ', 500)
        await this.sendExpect('set rfmod 0 bootpin 1\n', 'set: ', 100)
        await this.sendExpect('set rfmod 0 power on\n', 'set: ', 100)
        await this.sendExpect('set rfmod 0 bootpin 0\n', 'set: ', 0)

        this.log('Enabling serial passthrough...')
        this.transport.set_delimiters(['\n'])
        const cmd = `serialpassthrough rfmod 0 ${this.transport.baudrate.toString()}`
        this.log(`  CMD: '${cmd}`)
        await this.transport.write_string(`${cmd}\n`)
        await this.transport.read_line(200)

        this.log('Passthrough initialization complete')
    }

    betaflight = async () => {
        this.log('Initializing FC passthrough')

        await this.transport.write_string('#')
        this.transport.set_delimiters(['# ', 'CCC'])
        const line = await this.transport.read_line(200)
        if (line.indexOf('CCC') !== -1) {
            this.log('Passthrough already enabled and bootloader active')
            return
        }
        if (!line.trim().endsWith('#')) {
            this.log('No CLI available. Already in passthrough mode?, If this fails reboot FC and try again!')
            return
        }

        this.transport.set_delimiters(['# '])

        let waitfor
        if (this.half_duplex) {
            waitfor = ['GHST']
        } else {
            waitfor = ['CRSF', 'ELRS']
        }
        const serialCheck = []

        if (!await this._validate_serialrx('serialrx_provider', waitfor)) {
            serialCheck.push('Serial Receiver Protocol is not set to CRSF! Hint: set serialrx_provider = CRSF')
        }
        if (!await this._validate_serialrx('serialrx_inverted', ['OFF'])) {
            serialCheck.push('Serial Receiver UART is inverted! Hint: set serialrx_inverted = OFF')
        }
        if (!await this._validate_serialrx('serialrx_halfduplex', ['OFF', 'AUTO'])) {
            serialCheck.push('Serial Receiver UART is not in full duplex! Hint: set serialrx_halfduplex = OFF')
        }
        if (serialCheck.length > 0) {
            if (await this._validate_serialrx('rx_spi_protocol', ['EXPRESSLRS'])) {
                serialCheck.push('ExpressLRS SPI RX detected:')
                serialCheck.push('Update via betaflight to flash your RX')
                serialCheck.push('See https://www.expresslrs.org/2.0/hardware/spi-receivers/')
            }
            this.log('[ERROR] Invalid serial RX configuration detected:')
            for (const err of serialCheck) {
                this.log(`    ${err}`)
            }
            this.log('Please change the configuration and try again!')
            throw new PassthroughError()
        }

        this.log('\nAttempting to detect FC UART configuration...')
        await this.transport.write_string('serial\r\n')

        this.transport.set_delimiters(['\n'])
        let index = false
        while (true) {
            const line = await this.transport.read_line(200)
            if (line === '') {
                break
            }
            if (line.startsWith('serial')) {
                const regexp = /serial (?<port>(UART)?[0-9]+) (?<port_cfg>[0-9]+) /
                const config = line.match(regexp)
                if (config && config.groups && config.groups.port && config.groups.port_cfg && (config.groups.port_cfg & 64) === 64) {
                    index = config.groups.port
                    break
                }
            }
        }
        if (!index) {
            this.log('!!! RX Serial not found !!!!')
            this.log('Check configuration and try again...')
            throw new PassthroughError()
        }

        await this.transport.write_string(`serialpassthrough ${index} ${this.transport.baudrate}\r\n`)
        await this._sleep(200)

        try {
            for (let i = 0; i < 10; i++) {
                await this.transport.read_line(200)
            }
        } catch (e) {
        }
        this.log('Passthrough initialization complete')
    }

    reset_to_bootloader = async () => {
        this.log('Reset to bootloader')

        if (this.half_duplex) {
            this.log('Using half duplex (GHST)')
            await this.transport.write_array(Bootloader.get_init_seq('GHST'))
        } else {
            this.log('Using full duplex (CRSF)')
            while (await this.transport.read_line(100) !== '') {}
            const train = new Uint8Array(32)
            train.fill(0x55)
            await this.transport.write_array(new Uint8Array([0x07, 0x07, 0x12, 0x20]))
            await this.transport.write_array(train)
            await this._sleep(200)
            await this.transport.write_array(Bootloader.get_init_seq('CRSF'))
            await this._sleep(200)
        }

        this.transport.set_delimiters(['\n'])
        const rxTarget = (await this.transport.read_line(200)).trim()

        console.log(`rxtarget ${rxTarget}`)

        if (rxTarget === '') {
            this.log('Cannot detect RX target, blindly flashing!')
        } else if (this.uploadforce) {
            this.log(`Force flashing ${this.flash_target}, detected ${rxTarget}`)
        } else if (rxTarget.toUpperCase() !== this.flash_target.toUpperCase()) {
            this.log(`Wrong target selected your RX is '${rxTarget}', trying to flash '${this.flash_target}'`)
            throw new MismatchError()
        } else if (this.flash_target !== '') {
            this.log(`Verified RX target '${this.flash_target}'`)
        }
        this.log('Bootloader enabled')
        await this._sleep(500)
    }
}
