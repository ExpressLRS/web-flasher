import { TransportEx } from './serialex.js'
import { ESPLoader } from 'esptool-js'
import { Passthrough } from './passthrough.js'
import CryptoJS from 'crypto-js'

class ESPFlasher {
  constructor (device, type, method, config, options, firmwareUrl, term) {
    this.device = device
    this.type = type
    this.method = method
    this.config = config
    this.options = options
    this.firmwareUrl = firmwareUrl
    this.term = term
  }

  connect = async () => {
    let mode = 'default_reset'
    let baudrate = 460800
    let initbaud
    if (this.method === 'betaflight') {
      baudrate = 420000
      mode = 'no_reset'
    } else if (this.method === 'etx') {
      baudrate = 230400
      mode = 'no_reset'
    } else if (this.method === 'uart' && this.config.platform === 'esp32') {
      initbaud = 115200
    }

    const transport = new TransportEx(this.device, false)
    const terminal = {
      clean: () => {},
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

    const passthrough = new Passthrough(transport, this.term, this.config.firmware, baudrate)
    if (this.method === 'uart') {
      if (this.type === 'RX' && this.config.platform !== 'esp32') {
        await transport.connect(baudrate)
        const ret = await this.esploader._connectAttempt(mode = 'no_reset')

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
      await passthrough.edgeTX()
    }

    await transport.disconnect()

    const chip = await this.esploader.main(mode)
    console.log(`Settings done for :${chip}`)
    return chip
  }

  flash = async (files, erase) => {
    const loader = this.esploader
    if (this.method === 'etx' || this.method === 'betaflight') {
      loader.FLASH_WRITE_SIZE = 0x0800
      if (this.config.platform === 'esp32' && this.method === 'betaflight') {
        files = files.slice(-1)
      }
    }

    const fileArray = files.map(v => ({ data: loader.ui8ToBstr(v.data), address: v.address }))
    loader.IS_STUB = true
    return loader.writeFlash({
      fileArray,
      flashSize: 'keep',
      eraseAll: erase,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        const percent = Math.round(written / total * 100)
        document.getElementById('progressBar').value = percent
        document.getElementById('status').innerHTML = `Flashing: ${percent}% uploaded... please wait`
      },
      calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image))
    })
      .then(_ => {
        document.getElementById('progressBar').value = 100
        document.getElementById('status').innerHTML = 'Flashing complete'
        if (this.config.platform === 'esp32') {
          return loader.hardReset().catch(() => {})
        } else {
          return loader.softReset().catch(() => {})
        }
      })
  }
}

export { ESPFlasher }
