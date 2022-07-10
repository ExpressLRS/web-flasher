function _(el) {
    return document.getElementById(el);
}

const connectUartButton = _('connectUartButton');
const connectStlinkButton = _('connectStlinkButton');
const disconnectButton = _('disconnectButton');
const eraseButton = _('eraseButton');
const programUartButton = _('programUartButton');
const programStlinkButton = _('programStlinkButton');
const vendorSelect = _('vendor');
const typeSelect = _('type');
const modelSelect = _('model');
const lblConnTo = _('lblConnTo');
const methodSelect = _('method');

import { Transport } from './webserial.js'
import { ESPLoader } from './ESPLoader.js'
import { initBindingPhraseGen } from './phrase.js'
import { Flasher } from './flasher.js'
import { Passthrough, Bootloader } from './passthrough.js';
import { STLink } from './stlink.js';

let hardware = null;
let device = null;
let transport;
let chip = 'none detected';
let esploader;
let connected = false;

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
    setDisplay('.' + _('method').value, 'block');
    _('terminal').style.display = 'block';
}

function checkStatus(response) {
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    return response;
}

connectUartButton.onclick = async () => {
    if (device === null) {
        device = await navigator.serial.requestPort();
    }

    try {
        const config = hardware[vendorSelect.value][typeSelect.value][modelSelect.value];

        let mode = 'default_reset';
        let baudrate = 460800;
        if (methodSelect.value == 'betaflight') {
            baudrate = 420000;
        }

        transport = new Transport(device, true);
        esploader = new ESPLoader(transport, baudrate, term, true);

        const passthrough = new Passthrough(transport, term, config.firmware);
        if (methodSelect.value == 'uart') {
            if (typeSelect.value.startsWith('rx_')) {
                await transport.connect({baud: baudrate});
                const ret = await esploader._connect_attempt();
                if (ret != 'success') {
                    await transport.disconnect();
                    await transport.connect({baud: 420000});
                    await passthrough.reset_to_bootloader();
                }
            } else {
                await transport.connect({baud: 230400});
            }
        } else if (methodSelect.value == 'betaflight') {
            baudrate = 420000;
            mode = 'no_reset';
            await transport.connect({baud: baudrate});
            await passthrough.betaflight();
        } else if (methodSelect.value == 'etx') {
            baudrate = 230400;
            mode = 'no_reset';
            await transport.connect({baud: baudrate});
            await passthrough.edgeTX();
        }

        chip = await esploader.main_fn({mode:mode});
        connected = true;
    } catch(e) {
        console.log(e);
    }
    console.log('Settings done for :' + chip);
    lblConnTo.innerHTML = 'Connected to device: ' + chip;
    lblConnTo.style.display = 'block';
    connectUartButton.style.display = 'none';
    disconnectButton.style.display = 'initial';
    eraseButton.style.display = 'initial';
    programUartButton.style.display = 'initial';
}

function get_settings() {
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
        options['rcvr-invert-tx'] = _('rcvr-invert-tx').checked;
        options['lock-on-first-connection'] = _('lock-on-first-connection').checked;
    } else {
        deviceType = 'TX';
        options['tlm-interval'] = + _('tlm-interval').value;
        options['fan-runtime'] = + _('fan-runtime').value;
        options['uart-inverted'] = _('uart-inverted').checked;
        options['unlock-higher-power'] = _('unlock-higher-power').checked;
    }
    if (typeSelect.value === 'rx_900' || typeSelect.value === 'tx_900') {
        options['domain'] = + _('domain').value;
    }
    return {config: config, firmwareUrl: firmwareUrl, options: options};
}
programUartButton.onclick = async () => {
    let {config, firmwareUrl, options} = get_settings();
    const flasher = new Flasher(deviceType, config, options, esploader);
    await flasher.flash(firmwareUrl);
}

connectStlinkButton.onclick = async () => {
    connectStlinkButton.disabled = true;
    let {config, firmwareUrl, options} = get_settings();
    await stlink.connect(config, firmwareUrl, options);
    programStlinkButton.style.display = 'initial';
}

programStlinkButton.onclick = async () => {
    await stlink.flash(_('flash-bootloader').checked);
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
