'use strict';

function _(el) {
    return document.getElementById(el);
}

class Flasher {
    constructor(config, options, esploader) {
        this.config = config;
        this.options = options;
        this.esploader = esploader;
    }

    configure = (binary) => {
        return binary;
    }

    flash = async (url) => {
        var list = [];
        if (this.config.platform === 'esp32') {
            list.push(this.fetchFile('firmware/bootloader_dio_40m.bin', 0x1000));
            list.push(this.fetchFile('firmware/partitions.bin', 0x8000));
            list.push(this.fetchFile('firmware/boot_app0.bin', 0xE000));
            list.push(this.fetchFile(url, 0x10000, this.configure));
        } else if (this.config.platform === 'esp8285') {
            list.push(this.fetchFile(url, 0x0, this.configure));
        }

        const loader = this.esploader;
        Promise
        .all(list)
        .then(files => {
            console.log(files);
            return loader.write_flash({ fileArray: files, flash_size: 'keep' });
        });
    }

    checkStatus = (response) => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        return response;
    }

    fetchFile = (file, addr, transform = (e) => e) => {
        return fetch(file)
            .then(response => this.checkStatus(response) && response.blob())
            .then(blob => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = function found () {
                      resolve(reader.result)
                    }
                    reader.readAsBinaryString(blob);
                  })
            })
            .then(binary => ({ data: transform(binary), address: addr }));
    }
}

export { Flasher };
