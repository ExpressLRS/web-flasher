import { cuteAlert } from './alert.js'
import { MismatchError, AlertError } from './error.js'

class Bootloader {
  static INIT_SEQ = {
    CRSF: [0xEC, 0x04, 0x32, this.ord('b'), this.ord('l')],
    GHST: [0x89, 0x04, 0x32, this.ord('b'), this.ord('l')]
  }

  static BIND_SEQ = {
    CRSF: [0xEC, 0x04, 0x32, this.ord('b'), this.ord('d')],
    GHST: [0x89, 0x04, 0x32, this.ord('b'), this.ord('d')]
  }

  static ord (s) {
    return s.charCodeAt(0)
  }

  static calc_crc8 (payload, poly = 0xD5) {
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

  static get_telemetry_seq (seq, key = null) {
    const payload = new Uint8Array(seq)
    let u8array = new Uint8Array()
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

  static get_init_seq (module, key = null) {
    return this.get_telemetry_seq(this.INIT_SEQ[module], key)
  }

  static get_bind_seq (module, key = null) {
    return this.get_telemetry_seq(this.BIND_SEQ[module], key)
  }
}

class Passthrough {
  constructor (transport, terminal, flashTarget, baudrate, halfDuplex = false, uploadforce = false) {
    this.transport = transport
    this.terminal = terminal
    this.flash_target = flashTarget
    this.baudrate = baudrate
    this.half_duplex = halfDuplex
    this.uploadforce = uploadforce
  }

  _validate_serialrx = (config, expected) => {
    return this.transport.write_string('get ' + config + '\r\n')
      .then(_ => this.transport.read_line({ timeout: 100 }))
      .then(line => {
        console.log(line)
        for (const key of expected) {
          if (line.trim().indexOf(' = ' + key) !== -1) {
            console.log('found')
            return true
          }
        }
        console.log('NOT found')
        return false
      })
  }

  _sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  log (str) {
    this.terminal.writeln(str)
  }

  edgeTX = () => {
    this.log('======== PASSTHROUGH INIT ========')

    const sendExpect = (send, expect, delay) => this.transport.write_string(send)
      .then(_ => this.transport.read_line({ timeout: 100 }))
      .then(line => {
        if (line.indexOf(expect) === -1) {
          throw new AlertError('Failed Passthrough Initialisation', `Wanted '${expect}', but not found in response '${line}'`)
        }
      })
      .then(_ => this._sleep(delay))

    this.transport.set_delimiters(['> '])
    return sendExpect('set pulses 0\n', 'set: ', 500)
      .then(_ => sendExpect('set rfmod 0 power off\n', 'set: ', 500))
      .then(_ => sendExpect('set rfmod 0 bootpin 1\n', 'set: ', 100))
      .then(_ => sendExpect('set rfmod 0 power on\n', 'set: ', 100))
      .then(_ => sendExpect('set rfmod 0 bootpin 0\n', 'set: ', 0))
      .then(_ => {
        this.log('Enabling serial passthrough...')
        this.transport.set_delimiters(['\n'])
        const cmd = 'serialpassthrough rfmod 0 ' + this.transport.baudrate.toString()
        this.log(`  CMD: '${cmd}`)
        return this.transport.write_string(cmd + '\n')
          .then(this.transport.read_line({ timeout: 200 }))
      })
      .then(_ => this.log('======== PASSTHROUGH DONE ========'))
      .catch(async e => {
        this.log(e.message)
        this.log('======== PASSTHROUGH FAILED ========')
        return Promise.reject(e)
      })
  }

  betaflight = () => {
    this.log('======== PASSTHROUGH INIT ========')

    return this.transport.write_string('#\r\n')
      .then(_ => {
        this.transport.set_delimiters(['# ', 'CCC'])
        return this.transport.read_line({ timeout: 200 })
      })
      .then(line => {
        if (line.indexOf('CCC') !== -1) {
          this.log('Passthrough already enabled and bootloader active')
          return
        }
        if (!line.trim().endsWith('#')) {
          this.log('No CLI available. Already in passthrough mode?, If this fails reboot FC and try again!')
          return
        }

        this.transport.set_delimiters(['# '])

        let waitfor = []
        if (this.half_duplex) {
          waitfor = ['GHST']
        } else {
          waitfor = ['CRSF', 'ELRS']
        }
        const serialCheck = []

        return this._validate_serialrx('serialrx_provider', waitfor)
          .then(_ => { if (!_) serialCheck.push('Serial Receiver Protocol is not set to CRSF! Hint: set serialrx_provider = CRSF') })
          .then(_ => this._validate_serialrx('serialrx_inverted', ['OFF']))
          .then(_ => { if (!_) serialCheck.push('Serial Receiver UART is inverted! Hint: set serialrx_inverted = OFF') })
          .then(_ => this._validate_serialrx('serialrx_halfduplex', ['OFF', 'AUTO']))
          .then(_ => { if (!_) serialCheck.push('Serial Receiver UART is not in full duplex! Hint: set serialrx_halfduplex = OFF') })
          .then(_ => this._validate_serialrx('rx_spi_protocol', ['EXPRESSLRS']))
          .then(_ => { if (_) serialCheck.push('ExpressLRS SPI RX detected\n\nUpdate via betaflight to flash your RX\nhttps://www.expresslrs.org/2.0/hardware/spi-receivers/') })
          .then(_ => {
            if (serialCheck.length > 0) {
              let msg = ''
              this.log('[ERROR] Invalid serial RX configuration detected:\n')
              for (const err of serialCheck) {
                this.log('    !!! ' + err + ' !!!')
                msg += err + '\n'
              }
              this.log('\n    Please change the configuration and try again!')
              throw new AlertError('Invalid serial RX configuration detected', msg)
            }
          })
          .then(_ => {
            this.log('\nAttempting to detect FC UART configuration...')
            return this.transport.write_string('serial\r\n')
          })
          .then(async _ => {
            this.transport.set_delimiters(['\n'])
            let index = false
            while (true) {
              const line = await this.transport.read_line({ timeout: 200 })
              if (line === '') {
                break
              }
              if (line.startsWith('serial')) {
                const regexp = /serial (?<port>[0-9]+) 64 /
                const config = line.match(regexp)
                if (config && config.groups && config.groups.port) {
                  index = config.groups.port
                  break
                }
              }
            }
            if (!index) {
              this.log('!!! RX Serial not found !!!!\n  Check configuration and try again...')
              throw new AlertError('Serial RX not found', 'Check flight controller RX configuration')
            }
            return index
          })
          .then(index => this.transport.write_string(`serialpassthrough ${index} ${this.transport.baudrate}\r\n`))
          .then(_ => this._sleep(200))
          .then(async _ => {
            try {
              for (let i = 0; i < 10; i++) { await this.transport.read_line({ timeout: 200 }) }
            } catch (e) {
            }
            this.log('======== PASSTHROUGH DONE ========')
          })
      })
  }

  reset_to_bootloader = () => {
    this.log('======== RESET TO BOOTLOADER ========')
    let p
    if (this.half_duplex) {
      this.log('Using half duplex (GHST)')
      p = this.transport.write_array(Bootloader.get_init_seq('GHST'))
    } else {
      this.log('Using full duplex (CRSF)')
      const train = new Uint8Array(32)
      train.fill(0x55)
      p = this.transport.write_array(new Uint8Array([0x07, 0x07, 0x12, 0x20]))
        .then(_ => this.transport.write_array(train))
        .then(_ => this._sleep(200))
        .then(_ => this.transport.rawRead({ timeout: 1 }))
        .catch(_ => {})
        .then(_ => this.transport.write_array(Bootloader.get_init_seq('CRSF')))
        .then(_ => this._sleep(200))
    }

    return p
      .then(_ => {
        this.transport.set_delimiters(['\n'])
        return this.transport.read_line({ timeout: 200 })
      })
      .then(_ => _.trim())
      .then(_ => {
        console.log('got string ' + _)
        return _
      })
      .then(async rxTarget => {
        console.log('rxtarget ' + rxTarget)
        if (rxTarget === '') {
          this.log('Cannot detect RX target, blindly flashing!')
        } else if (this.uploadforce) {
          this.log(`Force flashing ${this.flash_target}, detected ${rxTarget}`)
        } else if (rxTarget.toUpperCase() !== this.flash_target.toUpperCase()) {
          const e = await cuteAlert({
            type: 'question',
            title: 'Targets Mismatch',
            message: `Wrong target selected your RX is '${rxTarget}', trying to flash '${this.flash_target}'`,
            confirmText: 'Flash anyway',
            cancelText: 'Cancel'
          })
          if (e !== 'confirm') {
            this.log(`Wrong target selected your RX is '${rxTarget}', trying to flash '${this.flash_target}'`)
            throw new MismatchError()
          }
        } else if (this.flash_target !== '') {
          this.log(`Verified RX target '${this.flash_target}'`)
        }
        this.log('======== BOOTLOADER ENGAGED ========')
        return this._sleep(500)
      })
  }
}

export { Passthrough, Bootloader }
