import * as libstlink from './stlink/lib/package.js'
import WebStlink from './stlink/webstlink.js'

class STLink {
  constructor (term) {
    this.term = term
    this.stlink = null
    this.device = null
  }

  log (str) {
    this.term.writeln(str)
  }

  debug (msg) {}

  verbose (msg) {}

  info (msg) {
    this.log('[INFO] ' + msg)
  }

  error (msg) {
    this.log('[ERROR] ' + msg)
  }

  warning (msg) {
    this.log('[WARN] ' + msg)
  }

  /* eslint-disable camelcase */
  bargraph_start (msg, { value_min = 0, value_max = 100 }) {
    this._msg = msg
    this._bargraph_min = value_min
    this._bargraph_max = value_max
  }
  /* eslint-enable camelcase */

  bargraph_update ({ value = 0, percent = null }) {
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
    this.info(`${this._msg}: ${percent}%`)
    document.getElementById('progressBar').value = percent
    document.getElementById('status').innerHTML = `${this._msg}: ${percent}% uploaded... please wait`
  }

  bargraph_done () {
    this.info(`${this._msg}: complete`)
    document.getElementById('progressBar').value = 100
    document.getElementById('status').innerHTML = `${this._msg}: Complete`
  }

  update_debugger_info (stlink, device) {
    const version = 'ST-Link/' + stlink._stlink.ver_str
    this.log(`Debugger - ${version} - Connected`)
    this.log(device.productName)
    this.log(device.manufacturerName)
    this.log(device.serialNumber)
  }

  update_target_status (status, target = null) {
    if (target !== null) {
      this.log('target type: ' + target.type)
      const fields = [
        ['type', 'Type', ''],
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
    function updateOnInspection (status) {
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

  connect = async (config, firmwareUrl, options, handler) => {
    this.config = config
    this.firmwareUrl = firmwareUrl
    this.options = options

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
      return 'ST-Link/' + this.stlink._stlink.ver_str
    }
    throw new Error('not connected')
  }

  checkStatus = (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`)
    }
    return response
  }

  fetch_file = async (file, transform = (e) => e) => {
    const response = await fetch(file)
    const blob = await this.checkStatus(response).blob()
    const binary = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = function found () {
        resolve(reader.result)
      }
      reader.readAsArrayBuffer(blob)
    })
    return transform(binary)
  }

  flash = async (binary, flashBootloader, progressCallback) => {
    this.progressCallback = progressCallback
    if (this.stlink !== null && this.stlink.connected) {
      if (flashBootloader) {
        this.log('\nFlash bootloader')
        this.log('================')
        const data = await this.fetch_file('firmware/' + document.getElementById('version').value + '/bootloader/' + this.config.stlink.bootloader)
        try {
          await this.stlink.halt()
          await this.stlink.flash(this.target.flash_start, data)
        } catch (err) {
          this.error(err)
          throw err
        }
      }

      const addr = parseInt(this.config.stlink.offset, 16)
      this.log('\nFlash ExpressLRS')
      this.log('================')
      try {
        await this.stlink.halt()
        await this.stlink.flash(this.target.flash_start + addr, binary[0].data)
      } catch (err) {
        this.error(err)
        throw err
      }
    }
  }
}

export { STLink }
