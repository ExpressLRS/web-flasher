function _(el) {
    return document.getElementById(el);
}

const connectUartButton = _('connectUartButton');
const connectStlinkButton = _('connectStlinkButton');
const disconnectButton = _('disconnectButton');
const eraseButton = _('eraseButton');
const programUartButton = _('programUartButton');
const programStlinkButton = _('programStlinkButton');
const downloadButton = _('downloadButton');
const vendorSelect = _('vendor');
const typeSelect = _('type');
const modelSelect = _('model');
const lblConnTo = _('lblConnTo');
const methodSelect = _('method');

import { initBindingPhraseGen } from './phrase.js'
import { ESPFlasher } from './espflasher.js'
import { XmodemFlasher } from './xmodem.js'
import { STLink } from './stlink.js';
import { MelodyParser } from './melody.js';
import { Configure } from './configure.js';

let hardware = null;
let device = null;
let flasher = null;
let binary = null;

let term = new Terminal({ cols: 120, rows: 40 });
term.open(terminal);

let stlink = new STLink(term);

disconnectButton.style.display = 'none';
eraseButton.style.display = 'none';
programUartButton.style.display = 'none';
programStlinkButton.style.display = 'none';

document.addEventListener('DOMContentLoaded', initialise, false);

function setDisplay(type, disp) {
    const elements = document.querySelectorAll(type);
    elements.forEach(element => {
        element.style.display = disp;
    });
}

vendorSelect.onchange = async () => {
    _('tx_2400').disabled = true;
    _('tx_900').disabled = true;
    _('rx_2400').disabled = true;
    _('rx_900').disabled = true;
    for (const k in hardware[vendorSelect.value]) {
        if (_(k) !== null) _(k).disabled = false;
    }
    typeSelect.disabled = false;
    typeSelect.value = '';
    modelSelect.disabled = true;
    modelSelect.value = '';
    _('options').style.display = 'none';
    setDisplay('.uart', 'none');
    setDisplay('.stlink', 'none');
    setDisplay('.wifi', 'none');
}

typeSelect.onchange = async () => {
    modelSelect.options.length = 1;
    for (const k in hardware[vendorSelect.value][typeSelect.value]) {
        let opt = document.createElement('option');
        opt.value = k;
        opt.innerHTML = hardware[vendorSelect.value][typeSelect.value][k]['product_name'];
        modelSelect.appendChild(opt);
    }
    modelSelect.disabled = false;
    modelSelect.value = '';
    _('options').style.display = 'none';
    setDisplay('.uart', 'none');
    setDisplay('.stlink', 'none');
    setDisplay('.wifi', 'none');
}

modelSelect.onchange = async () => {
    setDisplay('.tx_2400', 'none');
    setDisplay('.rx_2400', 'none');
    setDisplay('.tx_900', 'none');
    setDisplay('.rx_900', 'none');
    setDisplay('.esp8285', 'none');
    setDisplay('.esp32', 'none');
    setDisplay('.stm32', 'none');
    setDisplay('.feature-fan', 'none');
    setDisplay('.feature-unlock-higher-power', 'none');
    setDisplay('.feature-sbus-uart', 'none');
    setDisplay('.feature-buzzer', 'none');

    const features = hardware[vendorSelect.value][typeSelect.value][modelSelect.value]['features'];
    if (features) features.forEach(f => setDisplay('.feature-' + f, 'block'));

    _('fcclbt').value = 'FCC';
    _('options').style.display = 'block';
    setDisplay('.' + typeSelect.value, 'block');
    setDisplay('.' + hardware[vendorSelect.value][typeSelect.value][modelSelect.value]['platform'], 'block');

    _('uart').disabled = true;
    _('betaflight').disabled = true;
    _('etx').disabled = true;
    _('wifi').disabled = true;
    _('stlink').disabled = true;
    hardware[vendorSelect.value][typeSelect.value][modelSelect.value].upload_methods.forEach((k) =>_(k).disabled = false);
}

_('method').onchange = async () => {
    setDisplay('._method', 'none');
    setDisplay('.' + _('method').value, 'block');
    _('terminal').style.display = 'block';
}

function checkStatus(response) {
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    return response;
}

function get_settings(deviceType) {
    const config = hardware[vendorSelect.value][typeSelect.value][modelSelect.value];
    const firmwareUrl = 'firmware/' + _('fcclbt').value + '/' + config['firmware'] + '/firmware.bin';
    const options = {};

    if (_('uid').value !== '') {
        options['uid'] = _('uid').value.split(',').map((element) => {
            return Number(element);
        });
    }
    if (config['platform'] !== 'stm32') {
        options['wifi-on-interval'] = + _('wifi-on-interval').value;
        options['wifi-ssid'] = _('wifi-ssid').value;
        options['wifi-password'] = _('wifi-password').value;
    }
    if (deviceType === 'RX') {
        options['rcvr-uart-baud'] = + _('rcvr-uart-baud').value;
        options['rcvr-invert-tx'] = _('rcvr-invert-tx').checked;
        options['lock-on-first-connection'] = _('lock-on-first-connection').checked;
    } else {
        options['tlm-interval'] = + _('tlm-interval').value;
        options['fan-runtime'] = + _('fan-runtime').value;
        options['uart-inverted'] = _('uart-inverted').checked;
        options['unlock-higher-power'] = _('unlock-higher-power').checked;
    }
    if (typeSelect.value === 'rx_900' || typeSelect.value === 'tx_900') {
        options['domain'] = + _('domain').value;
    }
    const beeptype = Number(_('melody-type').value);
    options['beeptype'] = beeptype > 2 ? 2 : beeptype;
    if (beeptype == 2) {
        options['melody'] = MelodyParser.parseToArray('A4 20 B4 20|60|0');
    } else if (beeptype == 3) {
        options['melody'] = MelodyParser.parseToArray('E5 40 E5 40 C5 120 E5 40 G5 22 G4 21|20|0');
    } else if (beeptype == 4) {
        options['melody'] = MelodyParser.parseToArray(_('melody').value);
    }
    return {config: config, firmwareUrl: firmwareUrl, options: options};
}

connectUartButton.onclick = async () => {
    if (device === null) {
        device = await navigator.serial.requestPort();
    }

    let deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX';
    let method = methodSelect.value;
    let {config, firmwareUrl, options} = get_settings(deviceType);
    binary = await Configure.download(deviceType, config, firmwareUrl, options);

    let chip = '';
    if (config.platform === 'stm32') {
        flasher = new XmodemFlasher(device, deviceType, method, config, options, firmwareUrl, term);
        chip = await flasher.connect();
    } else {
        flasher = new ESPFlasher(device, deviceType, method, config, options, firmwareUrl, term);
        chip = await flasher.connect();
    }
    try {
        lblConnTo.innerHTML = 'Connected to device: ' + chip;
        lblConnTo.style.display = 'block';
        connectUartButton.style.display = 'none';
        disconnectButton.style.display = 'initial';
        eraseButton.style.display = 'initial';
        programUartButton.style.display = 'initial';
    } catch(e) {
        lblConnTo.innerHTML = 'Failed to connect to device, restart device and try again';
        lblConnTo.style.display = 'block';
    }
}

programUartButton.onclick = async () => {
    await flasher.flash(binary);
}

connectStlinkButton.onclick = async () => {
    connectStlinkButton.disabled = true;
    let deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX';
    let {config, firmwareUrl, options} = get_settings(deviceType);
    await stlink.connect(config, firmwareUrl, options);
    binary = await Configure.download(deviceType, config, firmwareUrl, options);
    programStlinkButton.style.display = 'initial';
}

programStlinkButton.onclick = async () => {
    await stlink.flash(binary, _('flash-bootloader').checked);
}

downloadButton.onclick = async () => {
    let deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX';
    let {config, firmwareUrl, options} = get_settings(deviceType);
    let binary = await Configure.download(deviceType, config, firmwareUrl, options);

    let file = null,
    makeFile = function () {
        let bin;
        if (config.platform === 'stm32') {
            bin = binary.buffer
        } else {
            bin = binary[binary.length-1].data.buffer;
        }
        const data = new Blob([bin], {type: 'application/octet-stream'});
        if (file !== null) {
            window.URL.revokeObjectURL(file);
        }
        file = window.URL.createObjectURL(data);
        return file;
    };

    var link = document.createElement('a');
    link.setAttribute('download', 'firmware.bin');
    link.href = makeFile();
    document.body.appendChild(link);

    // wait for the link to be added to the document
    window.requestAnimationFrame(function () {
        var event = new MouseEvent('click');
        link.dispatchEvent(event);
        document.body.removeChild(link);
    });
}

function initialise() {
    initBindingPhraseGen();
    fetch('firmware/hardware/targets.json')
        .then(response => checkStatus(response) && response.json())
        .then(json => {
            hardware = json;
            for (const k in json) {
                let opt = document.createElement('option');
                opt.value = k;
                opt.innerHTML = json[k].name === undefined ? k : json[k].name;
                vendorSelect.appendChild(opt);
            }
            vendorSelect.disabled = false;
            _('options').style.display = 'none';
            setDisplay('.uart', 'none');
            setDisplay('.stlink', 'none');
            setDisplay('.wifi', 'none');
        });
}
