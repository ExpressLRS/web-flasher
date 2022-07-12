'use strict';

export class Configure {
    static #MAGIC =  new Uint8Array([0xBE, 0xEF, 0xBA, 0xBE, 0xCA, 0xFE, 0xF0, 0x0D]);

    static #find_patch_location(binary) {
        let offset = 0;
        return binary.findIndex((_, i, a) => {
            let j = 0;
            while (j<Configure.#MAGIC.length && a[i+j]===Configure.#MAGIC[j]) {
                j++;
            }
            return j === Configure.#MAGIC.length;
        });
    }

    static #write32(binary, pos, val) {
        if (val !== undefined) {
            binary[pos + 0] = (val >> 0) & 0xFF;
            binary[pos + 1] = (val >> 8) & 0xFF;
            binary[pos + 2] = (val >> 16) & 0xFF;
            binary[pos + 3] = (val >> 24) & 0xFF;
        }
        return pos + 4;
    }

    static #patch_buzzer(binary, pos, options) {
        pos += 1;
        pos += 32*64;
        return pos;
    }

    static #patch_tx_params(binary, pos, options) {
        pos = write32(binary, pos, options['tlm-report']);
        pos = write32(binary, pos, options['fan-runtime']);
        let val = binary[pos]
        if (options['uart-inverted'] !== undefined) {
            val &= ~1;
            val |= options['uart-inverted'] ? 1 : 0;
        }
        if (options['unlock-higher-power'] !== undefined) {
            val &= ~2;
            val |= options['unlock-higher-power'] ? 2 : 0;
        }
        binary[pos] = val;
        return pos + 1;
    }

    static #patch_rx_params(binary, pos, options) {
        pos = this.#write32(binary, pos, options['rcvr-uart-baud']);
        let val = binary[pos]
        if (options['rcvr-invert-tx'] !== undefined) {
            val &= ~1;
            val |= options['rcvr-invert-tx'] ? 1 : 0;
        }
        if (options['lock-on-first-connection'] !== undefined) {
            val &= ~2;
            val |= options['lock-on-first-connection'] ? 2 : 0;
        }
        if (options['r9mm-mini-sbus'] !== undefined) {
            val &= ~4;
            val |= options['r9mm-mini-sbus'] ? 4 : 0;
        }
        binary[pos] = val;
        return pos + 1
    }

    static #patch_firmware(binary, pos, options) {
        pos += 8 + 2; // Skip magic & version
        const hardware = binary[pos];
        const _hasBuzzer = hardware & 2;
        const _deviceType = (hardware >> 4) & 7;
        const _radioChip = (hardware >> 7) & 1;
        pos += 1; // Skip the hardware flag

        // Poke in the domain
        if (_radioChip == 0 && options.domain) // SX127X
            binary[pos] = options.domain;
        pos += 1;

        // Poke in the UID (if there is one)
        if (options.uid) {
            binary[pos] = 1;
            for (let i=0 ; i<6 ; i++) {
                binary[pos+1+i] = options.uid[i];
            }
        } else {
            binary[pos] = 0;
        }
        pos += 7;

        if (_deviceType == 0) { // TX target
            pos = this.#patch_tx_params(binary, pos, options)
            if (_hasBuzzer) { // Has a Buzzer
                pos = this.#patch_buzzer(binary, pos, options);
            }
        }
        if (_deviceType == 1) { // RX target
            pos = this.#patch_rx_params(binary, pos, options);
        }
    }

    static stm32(binary, options) {
        let pos = this.#find_patch_location(binary);
        if (pos == -1) throw 'Configuration magic not found in firmware file. Is this a 3.x firmware?';
        this.#patch_firmware(binary, pos, options);
    }
}