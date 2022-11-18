import { Configure } from './configure.js'
import { MismatchError, AlertError } from './error.js'
import { initBindingPhraseGen } from './phrase.js'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { autocomplete } from './autocomplete.js'
import { SwalMUI, Toast } from './swalmui.js'
import FileSaver, { saveAs } from 'file-saver'
import mui from 'muicss'

const versions = ['3.0.1', '3.0.0']
const versionSelect = _('version')
const flashMode = _('flash-mode')
const flashButton = _('flashButton')
const connectButton = _('connectButton')
const vendorSelect = _('vendor')
const typeSelect = _('type')
const modelSelect = _('model')
const lblConnTo = _('lblConnTo')
const methodSelect = _('method')
const deviceNext = _('device-next')
const deviceDiscoverButton = _('device-discover')

let hardware = null
let selectedModel = null
let device = null
let flasher = null
let binary = null
let term = null
let stlink = null
let uploadURL = null

document.addEventListener('DOMContentLoaded', initialise, false)

function _ (el) {
  return document.getElementById(el)
}

function checkStatus (response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`)
  }
  return response
}

const doDiscovery = async (e) => {
  e.preventDefault()
  function check (response) {
    if (!response.ok) {
      throw Promise.reject(new Error('Failed to connect to device'))
    }
    return response.json()
  }
  fetch('http://localhost:9097/mdns')
    .then(response => check(response))
    .catch(async (e) => {
      throw new AlertError(
        'Auto-discovery proxy not running',
        'Auto detection of wifi devices cannot be performed without the help of the ExpressLRS auto-discovery proxy.',
        'warning'
      )
    })
    .then(mdns => {
      if (Object.keys(mdns).length === 0) {
        throw new AlertError(
          'No wifi devices detected',
          `
<div style="text-align: left;">
Auto detection failed to find any devices on the network.
<br><br>
Ensure the devices are powered on, running wifi mode, and they are on the same network as this computer.
`,
          'info'
        )
      }
      const devices = {}
      for (const key of Object.keys(mdns)) {
        const device = `${mdns[key].address}: ${key.substring(0, key.indexOf('.'))}`
        devices[key] = device
      }

      let p
      if (Object.keys(mdns).length === 1) { // short-circuit if theres only one option
        p = { value: Object.keys(mdns)[0], isConfirmed: true }
      } else {
        p = SwalMUI.select({
          title: 'Select Device to Flash',
          inputOptions: devices
        })
      }
      return Promise.all([p, mdns])
    })
    .then(([device, mdns]) => {
      if (!device.isConfirmed) return [null, mdns, undefined]
      const id = device.value
      const candidates = []
      let i = 0
      const rows = {}
      for (const vendor of Object.keys(hardware)) {
        for (const type of Object.keys(hardware[vendor])) {
          for (const model of Object.keys(hardware[vendor][type])) {
            if (mdns[id].properties.product !== undefined && hardware[vendor][type][model].product_name === mdns[id].properties.product) {
              candidates.push({ vendor, type, model, product: hardware[vendor][type][model].product_name })
              rows[i] = hardware[vendor][type][model].product_name
              i++
            }
            if (hardware[vendor][type][model].prior_target_name === mdns[id].properties.target) {
              candidates.push({ vendor, type, model, product: hardware[vendor][type][model].product_name })
              rows[i] = hardware[vendor][type][model].product_name
              i++
            }
          }
        }
      }

      let p
      if (i === 1) { // short-circuit if theres only one option
        Toast.fire({ icon: 'info', title: `Auto-detected\n${candidates[0].product.replace(/ /g, '\u00a0')}` })
        p = { value: 0, isConfirmed: true }
      } else {
        const footer = `<b>Device:&nbsp;</b>${id.substring(0, id.indexOf('.'))} at ${mdns[id].address}`
        p = SwalMUI.select({
          title: 'Select Device Model',
          inputOptions: rows,
          footer
        })
      }
      return Promise.all([candidates, mdns[id], p])
    })
    .then(([candidates, mdns, selected]) => {
      if (selected === undefined || !selected.isConfirmed) return
      uploadURL = null
      if (selected !== undefined) {
        vendorSelect.value = candidates[selected.value].vendor
        vendorSelect.onchange()
        typeSelect.value = candidates[selected.value].type
        typeSelect.onchange()
        modelSelect.value = candidates[selected.value].product
        modelSelect.onchange()
        deviceNext.onclick(e)
        methodSelect.value = 'wifi'
        methodSelect.onchange()
        uploadURL = `http://localhost:9097/${mdns.address}`
      }
    })
    .catch((e) => {
      console.log(e)
      return SwalMUI.fire({
        icon: e.type,
        title: e.title,
        html: e.message
      })
    })
}

const displayProxyHelp = async (e) => {
  e.preventDefault()
  return SwalMUI.fire({
    icon: 'info',
    title: 'Wifi auto-discovery',
    html: `
<div style="text-align: left;">
Wifi auto-discover is current <b>disabled</b> because the ExpressLRS auto-discovery proxy is not running on the local computer.
<br><br>
Wifi auto-discovery allows the flasher application to discover ExpressLRS wifi enabled devices on your network using mDNS.
It also allows flashing these devices via HTTP proxying.
<br><br>
To enable Wifi auto-discovery the ExpressLRS auto-discovery proxy must be running on the local computer.
You can download the proxy for your system from the <a target="_blank" href="//github.com/pkendall64/elrs-web-flasher">github</a> project page.
</div>
`
  })
}

deviceDiscoverButton.onclick = displayProxyHelp

const checkProxy = async () => {
  await fetch('http://localhost:9097/mdns')
    .then(response => checkStatus(response) && response.json())
    .then(() => {
      if (deviceDiscoverButton.onclick !== doDiscovery) {
        deviceDiscoverButton.style.cursor = 'default'
        deviceDiscoverButton.onclick = doDiscovery
        return Toast.fire({
          icon: 'success',
          title: 'Wifi auto-discovery enabled'
        })
      }
    })
    .catch(() => {
      if (deviceDiscoverButton.onclick !== displayProxyHelp) {
        deviceDiscoverButton.style.cursor = 'help'
        deviceDiscoverButton.onclick = displayProxyHelp
        return Toast.fire({
          icon: 'warning',
          title: 'Wifi auto-discovery disabled'
        })
      }
    })
}

function initialise () {
  checkProxy()
  setInterval(() => { checkProxy() }, 30000)
  term = new Terminal({ cols: 80, rows: 40 })
  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(_('serial-monitor'))
  fitAddon.fit()

  initBindingPhraseGen()
  let selected = true
  for (const v in versions) {
    const opt = document.createElement('option')
    opt.value = versions[v]
    opt.innerHTML = versions[v]
    opt.selected = selected
    versionSelect.appendChild(opt)
    selected = false
  }
  versionSelect.onchange()
}

versionSelect.onchange = async () => {
  vendorSelect.options.length = 1
  vendorSelect.disabled = true
  vendorSelect.value = ''
  typeSelect.disabled = true
  typeSelect.value = ''

  const version = versionSelect.value
  const json = await checkStatus(await fetch(`firmware/${version}/hardware/targets.json`)).json()
  hardware = json
  for (const k in json) {
    const opt = document.createElement('option')
    opt.value = k
    opt.innerHTML = json[k].name === undefined ? k : json[k].name
    vendorSelect.appendChild(opt)
  }
  vendorSelect.disabled = false
  setDisplay('.uart', false)
  setDisplay('.stlink', false)
  setDisplay('.wifi', false)

  const models = []
  for (const v in hardware) {
    for (const t in hardware[v]) {
      for (const m in hardware[v][t]) {
        if (hardware[v][t][m].product_name !== undefined) {
          models.push(hardware[v][t][m].product_name)
        }
      }
    }
  }
  autocomplete(modelSelect, models, true)
}

function setDisplay (elementOrSelector, shown = true) {
  if (typeof elementOrSelector === 'string') {
    const elements = document.querySelectorAll(elementOrSelector)
    elements.forEach(element => {
      setClass(element, 'display--none', !shown)
    })
  } else if (typeof elementOrSelector === 'object') {
    setClass(elementOrSelector, 'display--none', !shown)
  }
}

function setClass (elementOrSelector, className, enabled = true) {
  const element = (typeof elementOrSelector === 'string') ? document.querySelector(elementOrSelector) : elementOrSelector

  if (enabled) {
    element.classList.add(className)
  } else {
    element.classList.remove(className)
  }
}

_('step-1').onclick = (e) => {
  e.preventDefault()
  setDisplay('#step-device')
  setDisplay('#step-options', false)
  setDisplay('#step-flash', false)

  setClass('#step-1', 'done', false)
  setClass('#step-1', 'active')
  setClass('#step-1', 'editable')

  setClass('#step-2', 'active', false)
  setClass('#step-2', 'editable', false)
  setClass('#step-2', 'done', false)

  setClass('#step-3', 'active', false)
  setClass('#step-3', 'editable', false)
  setClass('#step-3', 'done', false)
}

_('step-2').onclick = (e) => {
  e.preventDefault()
  if (!_('step-flash').classList.contains('display--none')) {
    setDisplay('#step-options')
    setDisplay('#step-flash', false)

    setClass('#step-2', 'done', false)
    setClass('#step-2', 'active')
    setClass('#step-2', 'editable')

    setClass('#step-3', 'active', false)
    setClass('#step-3', 'editable', false)
    setClass('#step-3', 'done', false)
  }
}

vendorSelect.onchange = () => {
  _('tx_2400').disabled = true
  _('tx_900').disabled = true
  _('rx_2400').disabled = true
  _('rx_900').disabled = true
  for (const k in hardware[vendorSelect.value]) {
    if (_(k) !== null) _(k).disabled = false
  }
  typeSelect.disabled = false
  typeSelect.value = ''
  modelSelect.value = ''
  deviceNext.disabled = true
  const models = []
  const v = vendorSelect.value
  for (const t in hardware[v]) {
    for (const m in hardware[v][t]) {
      if (hardware[v][t][m].product_name !== undefined) {
        models.push(hardware[v][t][m].product_name)
      }
    }
  }
  autocomplete(modelSelect, models, true)
}

typeSelect.onchange = () => {
  modelSelect.value = ''
  deviceNext.disabled = true
  const models = []
  const v = vendorSelect.value
  const t = typeSelect.value
  for (const m in hardware[v][t]) {
    if (hardware[v][t][m].product_name !== undefined) {
      models.push(hardware[v][t][m].product_name)
    }
  }
  autocomplete(modelSelect, models, true)
}

modelSelect.onchange = () => {
  for (const v in hardware) {
    for (const t in hardware[v]) {
      for (const m in hardware[v][t]) {
        if (hardware[v][t][m].product_name === modelSelect.value) {
          vendorSelect.value = v
          typeSelect.value = t
          selectedModel = hardware[v][t][m]
          typeSelect.disabled = false
          deviceNext.disabled = false
          document.querySelectorAll('.product-name').forEach(e => { e.innerHTML = selectedModel.product_name })
          return
        }
      }
    }
  }
  modelSelect.value = ''
}

deviceNext.onclick = (e) => {
  e.preventDefault()
  setDisplay('.tx_2400', false)
  setDisplay('.rx_2400', false)
  setDisplay('.tx_900', false)
  setDisplay('.rx_900', false)
  setDisplay('.esp8285', false)
  setDisplay('.esp32', false)
  setDisplay('.stm32', false)
  setDisplay('.feature-fan', false)
  setDisplay('.feature-unlock-higher-power', false)
  setDisplay('.feature-sbus-uart', false)
  setDisplay('.feature-buzzer', false)

  const features = selectedModel.features
  if (features) features.forEach(f => setDisplay(`.feature-${f}`))

  _('fcclbt').value = 'FCC'
  setDisplay(`.${typeSelect.value}`)
  setDisplay(`.${selectedModel.platform}`)

  _('uart').disabled = true
  _('betaflight').disabled = true
  _('etx').disabled = true
  _('wifi').disabled = true
  _('stlink').disabled = true
  selectedModel.upload_methods.forEach((k) => { _(k).disabled = false })

  setDisplay('#step-device', false)
  setClass('#step-2', 'active')
  setClass('#step-2', 'editable')
  setClass('#step-1', 'done')
  setClass('#step-1', 'editable', false)
  setDisplay('#step-options')
}

methodSelect.onchange = () => {
  _('options-next').disabled = false
  if (methodSelect.value === 'download') {
    _('options-next').value = 'Download'
  } else {
    _('options-next').value = 'Next'
  }
}

const getSettings = async (deviceType) => {
  const config = selectedModel
  const firmwareUrl = `firmware/${versionSelect.value}/${_('fcclbt').value}/${config.firmware}/firmware.bin`
  const options = {}

  if (_('uid').value !== '') {
    options.uid = _('uid').value.split(',').map((element) => {
      return Number(element)
    })
  }
  if (config.platform !== 'stm32') {
    options['wifi-on-interval'] = +_('wifi-on-interval').value
    if (_('wifi-ssid').value !== '') {
      options['wifi-ssid'] = _('wifi-ssid').value
      options['wifi-password'] = _('wifi-password').value
    }
  }
  if (deviceType === 'RX') {
    options['rcvr-uart-baud'] = +_('rcvr-uart-baud').value
    options['rcvr-invert-tx'] = _('rcvr-invert-tx').checked
    options['lock-on-first-connection'] = _('lock-on-first-connection').checked
  } else {
    options['tlm-interval'] = +_('tlm-interval').value
    options['fan-runtime'] = +_('fan-runtime').value
    options['uart-inverted'] = _('uart-inverted').checked
    options['unlock-higher-power'] = _('unlock-higher-power').checked
  }
  if (typeSelect.value === 'rx_900' || typeSelect.value === 'tx_900') {
    options.domain = +_('domain').value
  }
  if (config.features !== undefined && config.features.indexOf('buzzer') !== -1) {
    const beeptype = Number(_('melody-type').value)
    options.beeptype = beeptype > 2 ? 2 : beeptype

    const melodyModule = await import('./melody.js')
    if (beeptype === 2) {
      options.melody = melodyModule.MelodyParser.parseToArray('A4 20 B4 20|60|0')
    } else if (beeptype === 3) {
      options.melody = melodyModule.MelodyParser.parseToArray('E5 40 E5 40 C5 120 E5 40 G5 22 G4 21|20|0')
    } else if (beeptype === 4) {
      options.melody = melodyModule.MelodyParser.parseToArray(_('melody').value)
    } else {
      options.melody = []
    }
  }
  return { config, firmwareUrl, options }
}

const connectUART = async (e) => {
  e.preventDefault()
  const deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX'
  const radioType = typeSelect.value.endsWith('_900') ? 'sx127x' : 'sx128x'
  term.clear()
  const { config, firmwareUrl, options } = await getSettings(deviceType)
  try {
    device = await navigator.serial.requestPort()
  } catch {
    lblConnTo.innerHTML = 'No device selected'
    await closeDevice()
    return await SwalMUI.fire({
      icon: 'error',
      title: 'No Device Selected',
      text: 'A serial device must be select to perform flashing'
    })
  }

  device.addEventListener('disconnect', async (e) => {
    term.clear()
    setDisplay(flashMode, false)
    setDisplay(connectButton)
    _('progressBar').value = 0
    _('status').innerHTML = ''
  })
  setDisplay(connectButton, false)

  binary = await Configure.download(deviceType, radioType, config, firmwareUrl, options)

  const method = methodSelect.value

  if (config.platform === 'stm32') {
    const xmodemModule = await import('./xmodem.js')
    flasher = new xmodemModule.XmodemFlasher(device, deviceType, method, config, options, firmwareUrl, term)
  } else {
    const espflasherModule = await import('./espflasher.js')
    flasher = new espflasherModule.ESPFlasher(device, deviceType, method, config, options, firmwareUrl, term)
  }
  try {
    const chip = await flasher.connect()

    lblConnTo.innerHTML = `Connected to device: ${chip}`
    setDisplay(flashMode)
  } catch (e) {
    if (e instanceof MismatchError) {
      lblConnTo.innerHTML = 'Target mismatch, flashing cancelled'
      return closeDevice()
    } else {
      lblConnTo.innerHTML = 'Failed to connect to device, restart device and try again'
      await closeDevice()
      return await SwalMUI.fire({
        icon: 'error',
        title: e.title,
        html: e.message
      })
    }
  }
}

const generateFirmware = async () => {
  const deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX'
  const radioType = typeSelect.value.endsWith('_900') ? 'sx127x' : 'sx128x'
  const { config, firmwareUrl, options } = await getSettings(deviceType)
  const firmwareFiles = await Configure.download(deviceType, radioType, config, firmwareUrl, options)
  return [
    firmwareFiles,
    { config, firmwareUrl, options }
  ]
}

const connectSTLink = async (e) => {
  e.preventDefault()
  term.clear()
  const stlinkModule = await import('./stlink.js')
  const _stlink = new stlinkModule.STLink(term)
  const [_bin, { config, firmwareUrl, options }] = await generateFirmware()

  try {
    const version = await _stlink.connect(config, firmwareUrl, options, e => {
      term.clear()
      setDisplay(flashMode, false)
      setDisplay(connectButton)
      _('progressBar').value = 0
      _('status').innerHTML = ''
    })

    lblConnTo.innerHTML = `Connected to device: ${version}`
    setDisplay(connectButton, false)
    setDisplay(flashMode)
    binary = _bin
    stlink = _stlink
  } catch (e) {
    lblConnTo.innerHTML = 'Not connected'
    setDisplay(flashMode, false)
    setDisplay(connectButton)
    return Promise.reject(e)
  }
}

const getWifiTarget = async (url) => {
  const response = await fetch(`${url}/target`)
  if (!response.ok) {
    throw Promise.reject(new Error('Failed to connect to device'))
  }
  return [url, await response.json()]
}

const connectWifi = async (e) => {
  e.preventDefault()
  const deviceType = typeSelect.value.substring(0, 2)
  let promise
  if (uploadURL !== null) {
    promise = getWifiTarget(uploadURL)
  } else {
    promise = Promise.any([
      getWifiTarget('http://10.0.0.1'),
      getWifiTarget(`http://elrs_${deviceType}`),
      getWifiTarget(`http://elrs_${deviceType}.local`)
    ])
  }
  try {
    const [url, response] = await promise
    lblConnTo.innerHTML = `Connected to: ${url}`
    _('product_name').innerHTML = `Product name: ${response.product_name}`
    _('target').innerHTML = `Target firmware: ${response.target}`
    _('firmware-version').innerHTML = `Version: ${response.version}`
    setDisplay(flashMode)
    uploadURL = url
  } catch (reason) {
    lblConnTo.innerHTML = 'No device found, or error connecting to device'
    console.log(reason)
  }
}

_('options-next').onclick = async (e) => {
  e.preventDefault()
  const method = methodSelect.value
  if (method === 'download') {
    await downloadFirmware()
  } else {
    setDisplay('#step-options', false)
    setClass('#step-3', 'active')
    setClass('#step-3', 'editable')
    setClass('#step-2', 'done')
    setClass('#step-2', 'editable', false)
    setDisplay('#step-flash')

    setDisplay(`.${method}`)

    if (method === 'wifi') {
      connectButton.onclick = connectWifi
    } else if (method === 'stlink') {
      connectButton.onclick = connectSTLink
    } else {
      connectButton.onclick = connectUART
    }
    await connectButton.onclick(e)
  }
}

const closeDevice = async () => {
  if (device != null) {
    await device.close()
    device = null
  }
  setDisplay(flashMode, false)
  setDisplay(connectButton)
  lblConnTo.innerHTML = 'Not connected'
  _('progressBar').value = 0
  _('status').innerHTML = ''
}

flashButton.onclick = async (e) => {
  e.preventDefault()
  mui.overlay('on', { keyboard: false, static: true })
  const method = methodSelect.value
  if (method === 'wifi') await wifiUpload()
  else {
    try {
      if (flasher !== null) {
        await flasher.flash(binary, _('erase-flash').checked)
      } else {
        await stlink.flash(binary, _('flash-bootloader').checked)
      }
      mui.overlay('off')
      return SwalMUI.fire({
        icon: 'success',
        title: 'Flashing Succeeded',
        text: 'Firmware upload complete'
      })
    } catch (e) {
      errorHandler(e.message)
    } finally {
      closeDevice()
    }
  }
}

const downloadFirmware = async () => {
  const [binary] = await generateFirmware()
  const bin = binary[binary.length - 1].data.buffer
  const data = new Blob([bin], { type: 'application/octet-stream' })

  FileSaver.saveAs(data, 'firmware.bin')
}

const wifiUpload = async () => {
  const [binary] = await generateFirmware()

  try {
    const bin = binary[binary.length - 1].data.buffer
    const data = new Blob([bin], { type: 'application/octet-stream' })
    const formdata = new FormData()
    formdata.append('upload', data, 'firmware.bin')
    const ajax = new XMLHttpRequest()
    ajax.upload.addEventListener('progress', progressHandler, false)
    ajax.addEventListener('load', completeHandler, false)
    ajax.addEventListener('error', (e) => errorHandler(e.target.responseText), false)
    ajax.addEventListener('abort', abortHandler, false)
    ajax.open('POST', `${uploadURL}/update`)
    ajax.setRequestHeader('X-FileSize', data.size)
    ajax.send(formdata)
  } catch (error) {}
}

function progressHandler (event) {
  const percent = Math.round((event.loaded / event.total) * 100)
  _('progressBar').value = percent
  _('status').innerHTML = `${percent}% uploaded... please wait`
}

function completeHandler (event) {
  _('status').innerHTML = ''
  _('progressBar').value = 0
  mui.overlay('off')
  const data = JSON.parse(event.target.responseText)
  if (data.status === 'ok') {
    function showMessage () {
      SwalMUI.fire({
        icon: 'success',
        title: 'Update Succeeded',
        text: data.msg
      })
    }
    // This is basically a delayed display of the success dialog with a fake progress
    let percent = 0
    const interval = setInterval(() => {
      percent = percent + 2
      _('progressBar').value = percent
      _('status').innerHTML = `${percent}% flashed... please wait`
      if (percent === 100) {
        clearInterval(interval)
        _('status').innerHTML = ''
        _('progressBar').value = 0
        showMessage()
      }
    }, 100)
  } else if (data.status === 'mismatch') {
    SwalMUI.fire({
      icon: 'question',
      title: 'Targets Mismatch',
      html: data.msg,
      confirmButtonText: 'Flash anyway',
      showCancelButton: true
    }).then((confirm) => {
      const xmlhttp = new XMLHttpRequest()
      xmlhttp.onreadystatechange = function () {
        if (this.readyState === 4) {
          _('status').innerHTML = ''
          _('progressBar').value = 0
          if (this.status === 200) {
            const data = JSON.parse(this.responseText)
            SwalMUI.fire({
              icon: 'info',
              title: 'Force Update',
              html: data.msg
            })
          } else {
            errorHandler('An error occurred trying to force the update')
          }
        }
      }
      xmlhttp.open('POST', `${uploadURL}/forceupdate`, true)
      const data = new FormData()
      data.append('action', confirm)
      xmlhttp.send(data)
    })
  } else {
    console.log(data)
    errorHandler(data.msg)
  }
}

function errorHandler (msg) {
  _('status').innerHTML = ''
  _('progressBar').value = 0
  mui.overlay('off')
  SwalMUI.fire({
    icon: 'error',
    title: 'Update Failed',
    html: msg
  })
}

function abortHandler (event) {
  _('status').innerHTML = ''
  _('progressBar').value = 0
  mui.overlay('off')
  SwalMUI.fire({
    icon: 'info',
    title: 'Update Aborted',
    html: event.target.responseText
  })
}
