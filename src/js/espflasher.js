import { TransportEx } from './serialex.js'
import { ESPLoader } from 'esptool-js/ESPLoader.js'
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
    let stub = 'yes'
    if (this.method === 'betaflight') {
      baudrate = 420000
      mode = 'no_reset'
      if (this.config.platform === 'esp32') {
        stub = 'no'
      }
    } else if (this.method === 'etx') {
      baudrate = 230400
      mode = 'no_reset'
    } else if (this.method === 'uart' && this.config.platform === 'esp32') {
      initbaud = 115200
    }

    const transport = new TransportEx(this.device, true)
    this.esploader = new ESPLoader(transport, baudrate, this.term, initbaud === undefined ? baudrate : initbaud)
    this.esploader.ESP_RAM_BLOCK = 0x0800 // we override otherwise flashing on BF will fail

    const passthrough = new Passthrough(transport, this.term, this.config.firmware, baudrate)
    if (this.method === 'uart') {
      if (this.type === 'RX' && this.config.platform !== 'esp32') {
        await transport.connect({ baud: baudrate })
        const ret = await this.esploader._connect_attempt({ mode: 'no_reset' })

        if (ret !== 'success') {
          await transport.disconnect()
          await transport.connect({ baud: 420000 })
          await passthrough.reset_to_bootloader()
        }
      } else {
        await transport.connect({ baud: 115200 })
      }
    } else if (this.method === 'betaflight') {
      await transport.connect({ baud: baudrate })
      await passthrough.betaflight()
      await passthrough.reset_to_bootloader()
    } else if (this.method === 'etx') {
      await transport.connect({ baud: baudrate })
      await passthrough.edgeTX()
    }

    await transport.disconnect()
    const chip = await this.esploader.main_fn({ mode, stub })
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
    return loader.write_flash({
      fileArray,
      flash_size: 'keep',
      erase_all: erase,
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
          return loader.hard_reset().catch(() => {})
        } else {
          return loader.soft_reset().catch(() => {})
        }
      })
  }
}

export { ESPFlasher }
