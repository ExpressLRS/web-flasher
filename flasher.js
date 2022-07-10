'use strict';

import { Transport } from './webserial.js'
import { ESPLoader } from './ESPLoader.js'
import { Passthrough } from './passthrough.js';

function _(el) {
    return document.getElementById(el);
}

class Flasher {
    constructor(device, type, method, config, options, firmwareUrl, term) {
        this.device = device;
        this.type = type;
        this.method = method;
        this.config = config;
        this.options = options;
        this.firmwareUrl = firmwareUrl;
        this.term = term;
    }

    connect = async() => {
        let mode = 'default_reset';
        let baudrate = 460800;
        if (this.method == 'betaflight') {
            baudrate = 420000;
        }

        const transport = new Transport(this.device, true);
        this.esploader = new ESPLoader(transport, baudrate, this.term, true);

        const passthrough = new Passthrough(transport, this.term, this.config.firmware);
        if (this.method == 'uart') {
            if (this.type === 'RX') {
                await transport.connect({baud: baudrate});
                const ret = await this.esploader._connect_attempt();
                if (ret != 'success') {
                    await transport.disconnect();
                    await transport.connect({baud: 420000});
                    await passthrough.reset_to_bootloader();
                }
            } else {
                await transport.connect({baud: 230400});
            }
        } else if (this.method == 'betaflight') {
            baudrate = 420000;
            mode = 'no_reset';
            await transport.connect({baud: baudrate});
            await passthrough.betaflight();
        } else if (this.method == 'etx') {
            baudrate = 230400;
            mode = 'no_reset';
            await transport.connect({baud: baudrate});
            await passthrough.edgeTX();
        }

        let chip = await this.esploader.main_fn({mode:mode});
        console.log('Settings done for :' + chip);
        return chip;
    }

    flash = async () => {
        var list = [];
        list.push(this.fetchFile('firmware/hardware/' + this.type + '/' + this.config.layout_file, 0));
        if (this.config.platform === 'esp32') {
            list.push(this.fetchFile('firmware/bootloader_dio_40m.bin', 0x1000));
            list.push(this.fetchFile('firmware/partitions.bin', 0x8000));
            list.push(this.fetchFile('firmware/boot_app0.bin', 0xE000));
            list.push(this.fetchFile(this.firmwareUrl, 0x10000, this.configure));
        } else if (this.config.platform === 'esp8285') {
            list.push(this.fetchFile(this.firmwareUrl, 0x0, this.configure));
        }

        const loader = this.esploader;
        Promise
            .all(list)
            .then(files => {
                files[files.length - 1].data += files[0].data + '\x00';
                return files.splice(1);
            })
            .then(files => loader.write_flash({ fileArray: files, flash_size: 'keep' }))
            .then(_ => loader.soft_reset());
    }

    findFirmwareEnd = (binary) => {
        let pos = 0x0;
        if (this.config.platform === 'esp8285') pos = 0x1000;
        if (binary.charCodeAt(pos) != 0xE9) throw 'The file provided does not the right magic for a firmware file!';
        let segments = binary.charCodeAt(pos + 1);
        if (this.config.platform === 'esp32') pos = 24;
        else pos = 0x1008;
        while (segments--) {
            const size = binary.charCodeAt(pos + 4) + (binary.charCodeAt(pos + 5) << 8) + (binary.charCodeAt(pos + 6) << 16) + (binary.charCodeAt(pos + 7) << 24);
            pos += 8 + size;
        }
        pos = (pos + 16) & ~15
        if (this.config.platform === 'esp32') pos += 32;
        console.log(pos.toString(16));
        return pos
    }

    configure = (binary) => {
        let end = this.findFirmwareEnd(binary);
        binary = binary.substring(0, end);
        binary += this.config.product_name.padEnd(128, '\x00');
        binary += this.config.lua_name.padEnd(16, '\x00');
        binary += JSON.stringify(this.options).padEnd(512, '\x00');
        return binary;
    }

    checkStatus = (response) => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        return response;
    }

    fetchFile = async (file, addr, transform = (e) => e) => {
        const response = await fetch(file);
        const blob = await this.checkStatus(response).blob();
        const binary = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function found() {
                resolve(reader.result);
            };
            reader.readAsBinaryString(blob);
        });
        return ({ data: transform(binary), address: addr });
    }
}

export { Flasher };
