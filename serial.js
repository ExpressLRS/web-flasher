class Bootloader {

    constructor() {
        this.INIT_SEQ = {
            'CRSF': [0xEC, 0x04, 0x32, this.ord('b'), this.ord('l')],
            'GHST': [0x89, 0x04, 0x32, this.ord('b'), this.ord('l')]
        };
        this.BIND_SEQ = {
            'CRSF': [0xEC, 0x04, 0x32, this.ord('b'), this.ord('d')],
            'GHST': [0x89, 0x04, 0x32, this.ord('b'), this.ord('d')]
        };
    }

    ord(s) {
        return s.charCodeAt(0);
    }

    calc_crc8(payload, poly=0xD5) {
        let crc = 0;
        for(let pos=0 ; pos<payload.byteLength ; pos++) {
            crc ^= payload[pos];
            for ( var j = 0; j < 8; ++j ) {
                if ((crc & 0x80) !== 0) {
                     crc = ((crc << 1) ^ poly) % 256
                } else {
                     crc = (crc << 1) % 256
                }
            }
        }
        return crc;
    }

    get_telemetry_seq(seq, key = null) {
        let payload = new Uint8Array(seq);
        let u8_array = new Uint8Array();
        if (key != null) {
            var i;
            let len = key.length;
            u8_array = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                u8_array[i] = key.charCodeAt(i);
            }
        }
        var tmp = new Uint8Array(payload.byteLength + u8_array.byteLength + 1);
        tmp.set(payload, 0);
        tmp.set([payload[1] + u8_array.byteLength], 1);
        tmp.set(u8_array, payload.byteLength);
        const crc = this.calc_crc8(tmp.slice(2, tmp.byteLength-1));
        tmp.set([crc], payload.byteLength + u8_array.byteLength);
        return tmp;
    }

    get_init_seq(module, key = null) {
      return this.get_telemetry_seq(this.INIT_SEQ[module], key);
    }

    get_bind_seq(module, key = null) {
      return this.get_telemetry_seq(this.BIND_SEQ[module], key);
    }
}

class Passthrough {
    constructor(transport, baudrate, terminal, flash_target, half_duplex=false, uploadforce=false) {
        this.transport = transport;
        this.baudrate = baudrate;
        this.terminal = terminal;
        this.flash_target = flash_target;
        this.half_duplex = half_duplex;
        this.uploadforce = uploadforce;
    }

    _validate_serialrx = async (config, expected) => {
        let found = false;
        await this.transport.write_string('get ' + config + '\r\n');
        let line = await this.transport.read_line({timeout:100});
        for (const key of expected) {
            if (line.trim().indexOf(' = ' + key)) {
                found = true;
                break;
            }
        }
        return found;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(str) {
        this.terminal.writeln(str);
    }

    startBetaflight = async () => {
        this.log('======== PASSTHROUGH INIT ========');

        this.transport.set_delimiters(['# ', 'CCC']);
        await this.transport.write_string('#\r\n');
        const line = await this.transport.read_line({timeout:200});
        if (line.indexOf('CCC') != -1) {
            this.log('Passthrough already enabled and bootloader active');
            return;
        }
        if(!line.trim().endsWith('#')) {
            this.log('No CLI available. Already in passthrough mode?, If this fails reboot FC and try again!');
            return;
        }

        this.transport.set_delimiters(['# ']);

        let waitfor = [];
        if (this.half_duplex) {
            waitfor = ['GHST'];
        } else {
            waitfor = ['CRSF', 'ELRS'];
        }
        let serial_check = [];
        if (!await this._validate_serialrx('serialrx_provider', waitfor))
            serial_check.push('Serial Receiver Protocol is not set to CRSF! Hint: set serialrx_provider = CRSF');
        if (!await this._validate_serialrx('serialrx_inverted', ['OFF']))
            serial_check.push('Serial Receiver UART is inverted! Hint: set serialrx_inverted = OFF');
        if (!await this._validate_serialrx('serialrx_halfduplex', ['OFF', 'AUTO']))
            serial_check.push('Serial Receiver UART is not in full duplex! Hint: set serialrx_halfduplex = OFF');
        if (!await this._validate_serialrx('rx_spi_protocol', ['EXPRESSLRS']))
            serial_check.push('ExpressLRS SPI RX detected\n\nUpdate via betaflight to flash your RX\nhttps://www.expresslrs.org/2.0/hardware/spi-receivers/');

        if (serial_check.length > 0) {
            this.log('\n\n [ERROR] Invalid serial RX configuration detected:');
            for (const err of serial_check) {
                this.log('    !!! ' + err + ' !!!');
            }
            this.log('\n    Please change the configuration and try again!');
            throw('Passthrough failed');
        }

        this.log('\nAttempting to detect FC UART configuration...');

        this.transport.set_delimiters(['\n']);
        await this.transport.write_string('serial\r\n');

        let index = false;
        while(true) {
            const line = await this.transport.read_line({timeout:200});
            if (line.indexOf('#') != -1) {
                break;
            }
            if (line.startsWith('serial')) {
                const regexp = /serial (?<port>[0-9]+) 64 /;
                const config = line.match(regexp);
                if (config && config.groups && config.groups.port) {
                    index = config.groups.port;
                    break;
                }
            }
        }
        if (!index) {
            this.log('!!! RX Serial not found !!!!\n  Check configuration and try again...');
            throw('not found');
        }

        await this.transport.write_string(`serialpassthrough ${index} ${this.baudrate}\r\n`);
        await this._sleep(200);
        try {
            for (let i=0 ; i<10 ; i++)
                await this.transport.read_line({timeout:200});
        } catch (e) {
        }

        this.log('======== PASSTHROUGH DONE ========');

        await this.reset_to_bootloader();
    }

    reset_to_bootloader = async () => {
        this.log('======== RESET TO BOOTLOADER ========');
        const bootloader = new Bootloader();
        if (this.half_duplex) {
            this.log('Using half duplex (GHST)');
            await this.transport.write_array(bootloader.get_init_seq('GHST'));
        } else {
            this.log('Using full duplex (CRSF)');
            const train = new Uint8Array(32);
            train.fill(0x55);
            await this.transport.write_array(new Uint8Array([0x07, 0x07, 0x12, 0x20]));
            await this.transport.write_array(train);
            await this._sleep(200);
            await this.transport.write_array(bootloader.get_init_seq('CRSF'));
            await this._sleep(200);
        }
        let rx_target = "";
        try {
            this.transport.set_delimiters('\n');
            for (let i=0 ; i<10 ; i++) {
                let line = await this.transport.read_line({timeout:200});
                if (line !== undefined) rx_target += line.trim();
            }
        } catch (e) {
            console.log(e);
        }

        if (rx_target == '')
            this.log('Cannot detect RX target, blindly flashing!');
        else if (this.uploadforce)
            this.log(`Force flashing ${this.flash_target}, detected ${rx_target}`);
        else if (rx_target.toUpperCase() != this.flash_target.toUpperCase()) {
            // if query_yes_no('\n\n\nWrong target selected! your RX is '%s', trying to flash '%s', continue? Y/N\n' % (rx_target, this.flash_target)):
            //     this.log('Ok, flashing anyway!');
            // else:
                this.log(`Wrong target selected your RX is '${rx_target}', trying to flash '${this.flash_target}'`);
                throw('mismatch');
        }
        else if (this.flash_target != '')
            this.log(`Verified RX target '${this.flash_target}'`);
        await this._sleep(500);
        this.log('======== BOOTLOADER ENGAGED ========');
    }
}

export { Passthrough, Bootloader };
