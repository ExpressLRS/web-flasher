export class Configure {
  static #MAGIC = new Uint8Array([0xBE, 0xEF, 0xBA, 0xBE, 0xCA, 0xFE, 0xF0, 0x0D])

  static #find_patch_location (binary) {
    return binary.findIndex((_, i, a) => {
      let j = 0
      while (j < Configure.#MAGIC.length && a[i + j] === Configure.#MAGIC[j]) {
        j++
      }
      return j === Configure.#MAGIC.length
    })
  }

  static #write32 (binary, pos, val) {
    if (val !== undefined) {
      binary[pos + 0] = (val >> 0) & 0xFF
      binary[pos + 1] = (val >> 8) & 0xFF
      binary[pos + 2] = (val >> 16) & 0xFF
      binary[pos + 3] = (val >> 24) & 0xFF
    }
    return pos + 4
  }

  static #patch_buzzer (binary, pos, options) {
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

  static #patch_tx_params (binary, pos, options) {
    pos = this.#write32(binary, pos, options['tlm-report'])
    pos = this.#write32(binary, pos, options['fan-runtime'])
    let val = binary[pos]
    if (options['uart-inverted'] !== undefined) {
      val &= ~1
      val |= options['uart-inverted'] ? 1 : 0
    }
    if (options['unlock-higher-power'] !== undefined) {
      val &= ~2
      val |= options['unlock-higher-power'] ? 2 : 0
    }
    binary[pos] = val
    return pos + 1
  }

  static #patch_rx_params (binary, pos, options) {
    pos = this.#write32(binary, pos, options['rcvr-uart-baud'])
    let val = binary[pos]
    if (options['rcvr-invert-tx'] !== undefined) {
      val &= ~1
      val |= options['rcvr-invert-tx'] ? 1 : 0
    }
    if (options['lock-on-first-connection'] !== undefined) {
      val &= ~2
      val |= options['lock-on-first-connection'] ? 2 : 0
    }
    if (options['r9mm-mini-sbus'] !== undefined) {
      val &= ~4
      val |= options['r9mm-mini-sbus'] ? 4 : 0
    }
    binary[pos] = val
    return pos + 1
  }

  static #patch_firmware (binary, pos, options) {
    pos += 8 + 2 // Skip magic & version
    const hardware = binary[pos]
    const _hasBuzzer = hardware & 2
    const _deviceType = (hardware >> 4) & 7
    const _radioChip = (hardware >> 7) & 1
    pos += 1 // Skip the hardware flag

    // Poke in the domain
    if (_radioChip === 0 && options.domain) { // SX127X
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

    if (_deviceType === 0) { // TX target
      pos = this.#patch_tx_params(binary, pos, options)
      if (_hasBuzzer) { // Has a Buzzer
        pos = this.#patch_buzzer(binary, pos, options)
      }
    }
    if (_deviceType === 1) { // RX target
      pos = this.#patch_rx_params(binary, pos, options)
    }
  }

  static #configureSTM32 (binary, options) {
    const pos = this.#find_patch_location(binary)
    if (pos === -1) throw new Error('Configuration magic not found in firmware file. Is this a 3.x firmware?')
    this.#patch_firmware(binary, pos, options)
    return binary
  }

  static #checkStatus = (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`)
    }
    return response
  }

  static #fetch_file = async (file, addr, transform = (e) => e) => {
    const response = await fetch(file)
    const blob = await this.#checkStatus(response).blob()
    const binary = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = function found () {
        resolve(new Uint8Array(reader.result))
      }
      reader.readAsArrayBuffer(blob)
    })
    return { data: transform(binary), address: addr }
  }

  static #findFirmwareEnd = (binary, config) => {
    let pos = 0x0
    if (config.platform === 'esp8285') pos = 0x1000
    if (binary[pos] !== 0xE9) throw new Error('The file provided does not the right magic for a firmware file!')
    let segments = binary[pos + 1]
    if (config.platform === 'esp32') pos = 24
    else pos = 0x1008
    while (segments--) {
      const size = binary[pos + 4] + (binary[pos + 5] << 8) + (binary[pos + 6] << 16) + (binary[pos + 7] << 24)
      pos += 8 + size
    }
    pos = (pos + 16) & ~15
    if (config.platform === 'esp32') pos += 32
    console.log(pos.toString(16))
    return pos
  }

  static #appendArray = (arr1, arr2) => {
    const c = new Uint8Array(arr1.length + arr2.length)
    c.set(arr1, 0)
    c.set(arr2, arr1.length)
    return c
  }

  static #configureESP = (binary, config, options) => {
    function bstrToUi8 (bStr) {
      const len = bStr.length
      const u8array = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        u8array[i] = bStr.charCodeAt(i)
      }
      return u8array
    }
    const end = this.#findFirmwareEnd(binary, config)
    binary = binary.slice(0, end)
    binary = this.#appendArray(binary, bstrToUi8(config.product_name.padEnd(128, '\x00')))
    binary = this.#appendArray(binary, bstrToUi8(config.lua_name.padEnd(16, '\x00')))
    binary = this.#appendArray(binary, bstrToUi8(JSON.stringify(options).padEnd(512, '\x00')))
    return binary
  }

  static download = async (deviceType, config, firmwareUrl, options) => {
    if (config.platform === 'stm32') {
      const entry = await this.#fetch_file(firmwareUrl, 0, (bin) => this.#configureSTM32(bin, options))
      return entry.data
    } else {
      const list = []
      list.push(this.#fetch_file('firmware/hardware/' + deviceType + '/' + config.layout_file, 0))
      if (config.platform === 'esp32') {
        list.push(this.#fetch_file('firmware/bootloader_dio_40m.bin', 0x1000))
        list.push(this.#fetch_file('firmware/partitions.bin', 0x8000))
        list.push(this.#fetch_file('firmware/boot_app0.bin', 0xE000))
        list.push(this.#fetch_file(firmwareUrl, 0x10000, (bin) => Configure.#configureESP(bin, config, options)))
      } else if (config.platform === 'esp8285') {
        list.push(this.#fetch_file(firmwareUrl, 0x0, (bin) => Configure.#configureESP(bin, config, options)))
      }

      return await Promise
        .all(list)
        .then(files => {
          files[files.length - 1].data = this.#appendArray(files[files.length - 1].data, this.#appendArray(files[0].data, new Uint8Array([0])))
          return files.splice(1)
        })
    }
  }
}
