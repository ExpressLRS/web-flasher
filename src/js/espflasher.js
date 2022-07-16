import { TransportEx } from './serialex.js'
import { ESPLoader } from './esptool-js/ESPLoader.js'
import { Passthrough } from './passthrough.js'

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
    if (this.method === 'betaflight') {
      baudrate = 420000
    }

    const transport = new TransportEx(this.device, true)
    this.esploader = new ESPLoader(transport, baudrate, this.term, true)

    const passthrough = new Passthrough(transport, this.term, this.config.firmware)
    if (this.method === 'uart') {
      if (this.type === 'RX') {
        await transport.connect({ baud: baudrate })
        const ret = await this.esploader._connect_attempt()
        if (ret !== 'success') {
          await transport.disconnect()
          await transport.connect({ baud: 420000 })
          await passthrough.reset_to_bootloader()
        }
      } else {
        await transport.connect({ baud: 230400 })
      }
    } else if (this.method === 'betaflight') {
      baudrate = 420000
      mode = 'no_reset'
      await transport.connect({ baud: baudrate })
      await passthrough.betaflight()
      await passthrough.reset_to_bootloader()
    } else if (this.method === 'etx') {
      baudrate = 230400
      mode = 'no_reset'
      await transport.connect({ baud: baudrate })
      await passthrough.edgeTX()
    }

    const chip = await this.esploader.main_fn({ mode })
    console.log('Settings done for :' + chip)
    return chip
  }

  flash = async (files) => {
    const loader = this.esploader
    const fileArray = files.map(v => ({ data: loader.ui8ToBstr(v.data), address: v.address }))
    await loader.write_flash({ fileArray, flash_size: 'keep' })
      .then(_ => loader.soft_reset())
  }
}

export { ESPFlasher }
