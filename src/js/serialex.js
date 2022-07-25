import { Transport } from 'esptool-js/webserial'

class TransportEx extends Transport {
  ui8ToBstr (u8Array) {
    let bStr = ''
    for (let i = 0; i < u8Array.length; i++) {
      bStr += String.fromCharCode(u8Array[i])
    }
    return bStr
  }

  bstrToUi8 (bStr) {
    const len = bStr.length
    const u8array = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      u8array[i] = bStr.charCodeAt(i)
    }
    return u8array
  }

  set_delimiters (delimiters = ['\n', 'CCC']) {
    this.delimiters = []
    for (const d of delimiters) {
      this.delimiters.push(this.bstrToUi8(d))
    }
  }

  read_line = async ({ timeout = 0 } = {}) => {
    console.log('Read with timeout ' + timeout)
    let t
    let packet = this.left_over
    this.left_over = new Uint8Array()
    const delimiters = this.delimiters
    function findDelimeter (packet) {
      const index = packet.findIndex((_, i, a) => {
        for (const d of delimiters) {
          if (d.every((v, j) => a[i + j] === v)) return true
        }
        return false
      })
      if (index !== -1) {
        for (const d of delimiters) {
          if (d.every((v, j) => packet[index + j] === v)) return index + d.length
        }
      }
      return -1
    }
    let index = findDelimeter(packet)
    if (index === -1) {
      const reader = this.device.readable.getReader()
      try {
        if (timeout > 0) {
          t = setTimeout(function () {
            reader.cancel()
          }, timeout)
        }
        do {
          const { value, done } = await reader.read()
          if (done) {
            reader.releaseLock()
            await this.device.close()
            await this.device.open({ baudRate: this.baudrate })
            return ''
          }
          packet = new Uint8Array(this._appendBuffer(packet.buffer, value.buffer))
          index = findDelimeter(packet)
        } while (index === -1)
        reader.releaseLock()
      } finally {
        if (timeout > 0) {
          clearTimeout(t)
        }
      }
    }
    this.left_over = packet.slice(index)
    packet = packet.slice(0, index)
    if (this.tracing) {
      console.log('Read bytes')
      console.log(this.hexdump(packet))
    }
    return this.ui8ToBstr(packet)
  }

  write_string = async (data) => {
    const writer = this.device.writable.getWriter()
    const out = this.bstrToUi8(data)
    if (this.tracing) {
      console.log('Write bytes')
      console.log(this.hexdump(out))
    }
    await writer.write(out.buffer)
    writer.releaseLock()
  }

  write_array = async (data) => {
    const writer = this.device.writable.getWriter()
    if (this.tracing) {
      console.log('Write bytes')
      console.log(this.hexdump(data))
    }
    await writer.write(data.buffer)
    writer.releaseLock()
  }
}

export { TransportEx }
