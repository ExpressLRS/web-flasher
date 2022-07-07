function _(el) {
    return document.getElementById(el);
}

const connectButton = _('connectButton');
const disconnectButton = _('disconnectButton');
const eraseButton = _('eraseButton');
const programButton = _('programButton');
const vendorSelect = _('vendor');
const typeSelect = _('type');
const modelSelect = _('model');
const baudrates = _('baudrates');
const lblBaudrate = _('lblBaudrate');
const lblConnTo = _('lblConnTo');
const methodSelect = _('method');

import { Transport } from './webserial.js'
import { ESPLoader } from './ESPLoader.js'
import { initBindingPhraseGen } from './phrase.js'
import { Flasher } from './flasher.js'

let hardware = null;
let device = null;
let transport;
let chip = 'deFault';
let esploader;
let connected = false;

let term = new Terminal({ cols: 120, rows: 40 });
term.open(terminal);

disconnectButton.style.display = 'none';
eraseButton.style.display = 'none';
programButton.style.display = 'none';

document.addEventListener('DOMContentLoaded', initialise, false);

function setDisplay(type, disp) {
    const elements = document.querySelectorAll(type);
    elements.forEach(element => {
        element.style.display = disp;
    });
}

vendorSelect.onchange = async () => {
    typeSelect.options.length = 1;
    for (const k in hardware[vendorSelect.value]) {
        let opt = document.createElement('option');
        opt.value = k;
        opt.innerHTML = k;
        typeSelect.appendChild(opt);
    }
    typeSelect.disabled = false;
    typeSelect.value = '';
    modelSelect.disabled = true;
    modelSelect.value = '';
    _('options').style.display = 'none';
    _('program').style.display = 'none';
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
    _('program').style.display = 'none';
}

modelSelect.onchange = async () => {
    setDisplay('.tx_2400', 'none');
    setDisplay('.rx_2400', 'none');
    setDisplay('.tx_900', 'none');
    setDisplay('.rx_900', 'none');
    setDisplay('.esp8285', 'none');
    setDisplay('.esp32', 'none');
    setDisplay('.stm32', 'none');

    _('fcclbt').value = 'FCC';
    _('options').style.display = 'block';
    setDisplay('.' + typeSelect.value, 'block');
    setDisplay('.' + hardware[vendorSelect.value][typeSelect.value][modelSelect.value]['platform'], 'block');

    //TODO update method with flash methods
}

_('method').onchange = async () => {
    _('program').style.display = 'block';
}

function checkStatus(response) {
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    return response;
}

connectButton.onclick = async () => {
    if (device === null) {
        device = await navigator.serial.requestPort();
        transport = new Transport(device);

        //TODO use _('method').value to start bf or msp flash mode
    }
    try {
        esploader = new ESPLoader(transport, baudrates.value, term);
        connected = true;

        chip = await esploader.main_fn();
    } catch(e) {
        console.log(e);
    }
    console.log('Settings done for :' + chip);
    lblBaudrate.style.display = 'none';
    lblConnTo.innerHTML = 'Connected to device: ' + chip;
    lblConnTo.style.display = 'block';
    baudrates.style.display = 'none';
    connectButton.style.display = 'none';
    disconnectButton.style.display = 'initial';
    eraseButton.style.display = 'initial';
    programButton.style.display = 'initial';
}

programButton.onclick = async () => {
    const config = hardware[vendorSelect.value][typeSelect.value][modelSelect.value];
    const firmwareUrl = 'firmware/' + _('fcclbt').value + '/' + config['firmware'] + '/firmware.bin';
    const options = {
        'uid': _('uid').value.split(',').map((element) => {
            return Number(element);
        })
    };
    let deviceType;
    if (config['platform'] !== 'stm32') {
        options['wifi-on-interval'] = + _('wifi-on-interval').value;
        options['wifi-ssid'] = _('wifi-ssid').value;
        options['wifi-password'] = _('wifi-password').value;
    }
    if (typeSelect.value === 'rx_900' || typeSelect.value === 'rx_2400') {
        deviceType = 'RX';
        options['rcvr-uart-baud'] = + _('rcvr-uart-baud').value;
        options['rcvr-invert-tx'] = _('rcvr-invert-tx').value === 'on' ? true : false;
        options['lock-on-first-connection'] = _('lock-on-first-connection').value === 'on' ? true : false;
    } else {
        deviceType = 'TX';
        options['tlm-interval'] = + _('tlm-interval').value;
        options['fan-runtime'] = + _('fan-runtime').value;
        options['uart-inverted'] = _('uart-inverted').value === 'on' ? true : false;
        options['unlock-higher-power'] = _('unlock-higher-power').value === 'on' ? true : false;
    }
    if (typeSelect.value === 'rx_900' || typeSelect.value === 'tx_900') {
        options['domain'] = + _('domain').value;
    }

    const flasher = new Flasher(deviceType, config, options, esploader);
    await flasher.flash(firmwareUrl);
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
                opt.innerHTML = k;
                vendorSelect.appendChild(opt);
            }
            vendorSelect.disabled = false;
            _('options').style.display = 'none';
            _('program').style.display = 'none';
        });
}
