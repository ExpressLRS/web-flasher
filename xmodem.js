import { Transport } from './webserial.js'
import { Bootloader, Passthrough } from './passthrough.js';

const log = { info: function() {}, warn: function() {}, error: function() {}, debug: function() {} };

const SOH = 0x01;
const EOT = 0x04;
const ACK = 0x06;
const NAK = 0x15;
const FILLER = 0x1A;
const CRC_MODE = 0x43; // 'C'

class Xmodem {

    XMODEM_MAX_TIMEOUTS = 5;
    XMODEM_MAX_ERRORS = 10;
    XMODEM_CRC_ATTEMPTS = 3;
    XMODEM_OP_MODE = 'crc';
    XMODEM_START_BLOCK = 1;
    timeout_seconds = 10;
    block_size = 128;

    constructor(device, logger) {
        this.device = device;
        this.logger = logger;
    }

    emit = (msg, obj) => {
        console.log(`${msg}: ${obj}`);
    }

    crc16xmodem = function(buf) {
        let crc = 0x0;

        for (let index = 0; index < buf.length; index++) {
          const byte = buf[index];
          let code = (crc >>> 8) & 0xff;

          code ^= byte & 0xff;
          code ^= code >>> 4;
          crc = (crc << 8) & 0xffff;
          crc ^= code;
          code = (code << 5) & 0xffff;
          crc ^= code;
          code = (code << 7) & 0xffff;
          crc ^= code;
        }

        return crc;
    }

    send = async (dataBuffer) => {
        const _self = this;
        const packagedBuffer = new Array();
        var blockNumber = this.XMODEM_START_BLOCK;
        var sent_eof = false;

        log.info(dataBuffer.length);

        // FILLER
        for(let i=0; i < this.XMODEM_START_BLOCK; i++) {
            packagedBuffer.push('');
        }

        while (dataBuffer.length > 0) {
            const chunk =  dataBuffer.slice(0, this.block_size);
            const current_block = new Uint8Array(this.block_size);
            current_block.set(chunk, 0);
            for (let i = chunk.length ; i<this.block_size ; i++) {
                current_block[i] = FILLER;
            }
            dataBuffer = dataBuffer.slice(this.block_size);
            packagedBuffer.push(current_block);
        }

        let sending = true;

        /**
         * Ready to send event, buffer has been broken into individual blocks to be sent.
         * @event Xmodem#ready
         * @property {integer} - Indicates how many blocks are ready for transmission
         */
        _self.emit('ready', packagedBuffer.length - 1); // We don't count the filler

        let sendBlock = this.sendBlock;
        let write = this.write;
        const sendData = async (data) => {
            /*
            * Here we handle the beginning of the transmission
            * The receiver initiates the transfer by either calling
            * checksum mode or CRC mode.
            */
            if(data[0] === CRC_MODE && blockNumber === _self.XMODEM_START_BLOCK) {
                log.info('[SEND] - received C byte for CRC transfer!');
                _self.XMODEM_OP_MODE = 'crc';
                if(packagedBuffer.length > blockNumber) {
                    /**
                     * Transmission Start event. A successful start of transmission.
                     * @event Xmodem#start
                     * @property {string} - Indicates transmission mode 'crc' or 'normal'
                     */
                    _self.emit('start', _self.XMODEM_OP_MODE);
                    await sendBlock(blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                    _self.emit('send', blockNumber);
                    blockNumber++;
                }
            }
            else if(data[0] === NAK && blockNumber === _self.XMODEM_START_BLOCK) {
                log.info('[SEND] - received NAK byte for standard checksum transfer!');
                _self.XMODEM_OP_MODE = 'normal';
                if(packagedBuffer.length > blockNumber) {
                    _self.emit('start', _self.XMODEM_OP_MODE);
                    await sendBlock(blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                    _self.emit('send', blockNumber);
                    blockNumber++;
                }
            }
            /*
            * Here we handle the actual transmission of data and
            * retransmission in case the block was not accepted.
            */
            else if(data[0] === ACK && blockNumber > _self.XMODEM_START_BLOCK) {
                // Woohooo we are ready to send the next block! :)
                log.info('ACK RECEIVED');
                _self.emit('recv', 'ACK');
                if(packagedBuffer.length > blockNumber) {
                    await sendBlock(blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                    _self.emit('send', blockNumber);
                    blockNumber++;
                    if (blockNumber % 10 === 0) {
                        const percent = Math.floor(blockNumber * 100 / packagedBuffer.length);
                        _self.logger.log(`${percent}% uploaded...`);
                    }
                }
                else if(packagedBuffer.length === blockNumber) {
                    // We are EOT
                    if(sent_eof === false) {
                        sent_eof = true;
                        log.info('WE HAVE RUN OUT OF STUFF TO SEND, EOT EOT!');
                        _self.emit('send', 'EOT');
                        await write(new Uint8Array([EOT]));
                    }
                    else {
                        // We are finished!
                        log.info('[SEND] - Finished!');
                        _self.emit('stop', 0);
                        sending = false;
                    }
                }
            }
            else if(data[0] === NAK && blockNumber > _self.XMODEM_START_BLOCK) {
                if (blockNumber === packagedBuffer.length && sent_eof) {
                    log.info('[SEND] - Resending EOT, because receiver responded with NAK.');
                    _self.emit('send', 'EOT');
                    await write(new Uint8Array([EOT]));
                } else {
                    log.info('[SEND] - Packet corruption detected, resending previous block.');
                    _self.emit('recv', 'NAK');
                    blockNumber--;
                    if(packagedBuffer.length > blockNumber) {
                        await sendBlock(blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                        _self.emit('send', blockNumber);
                        blockNumber++;
                    }
                }
            }
            else {
                log.warn('GOT SOME UNEXPECTED DATA which was not handled properly!');
                log.warn('===>');
                log.warn(data);
                log.warn('<===');
                log.warn('blockNumber: ' + blockNumber);
            }
        };

        while (sending) {
            const reader = this.device.readable.getReader();
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                throw ("cancelled");
            }
            reader.releaseLock();
            await sendData(value);
        }
        this.logger.log('Flash complete!');
    }

    sendBlock = async (blockNr, blockData, mode) => {
        function _appendBuffer(buffer1, buffer2) {
            var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
            tmp.set(buffer1, 0);
            tmp.set(buffer2, buffer1.byteLength);
            return tmp;
        }

        var crcCalc = 0;
        var sendBuffer = _appendBuffer(new Uint8Array([SOH, blockNr, (0xFF - blockNr)]), blockData);
        log.info('SENDBLOCK! Data length: ' + blockData.byteLength);
        log.info(sendBuffer);
        if(mode === 'crc') {
            var crc = this.crc16xmodem(blockData);
            sendBuffer = _appendBuffer(sendBuffer, new Uint8Array([(crc >>> 8) & 0xff, crc & 0xff]));
        }
        else {
            // Count only the blockData into the checksum
            for(let i = 3; i < sendBuffer.byteLength; i++) {
                crcCalc = crcCalc + sendBuffer.readUInt8(i);
            }
            crcCalc = crcCalc % 256;
            sendBuffer = _appendBuffer(sendBuffer, new Uint8Array([crcCalc]));
        }
        log.info('Sending buffer with total length: ' + sendBuffer.length);
        await this.write(sendBuffer);
    }

    write = async (buf) => {
        const writer = this.device.writable.getWriter();
        await writer.write(buf.buffer);
        writer.releaseLock();
    }
}

class XmodemFlasher {
    constructor(device, deviceType, method, config, options, firmwareUrl, terminal) {
        this.device = device;
        this.config = config;
        this.options = options;
        this.firmwareUrl = firmwareUrl;
        this.terminal = terminal;
        this.xmodem = new Xmodem(this.device, this);
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(str) {
        this.terminal.writeln(str);
    }

    connect = async () => {
        if (this.config.firmware.startsWith('GHOST')) {
            this.init_seq1 = Bootloader.get_init_seq('GHST');
        } else {
            this.init_seq1 = Bootloader.get_init_seq('CRSF');
        }

        this.transport = new Transport(this.device, true);
        await this.transport.connect({baud: 420000});
        this.passthrough = new Passthrough(this.transport, this.terminal, this.config.firmware);
        return 'XModem Flasher';
    }

    flash = async (binary, force = false) => {
        this.log("Beginning flash...");
        this.transport.set_delimiters(['CCC']);
        const data = await this.transport.read_line({timeout:2000});
        let got_bootloader = data.endsWith('CCC');
        if (!got_bootloader) {
            let delay_seq2 = 500;
            await this.passthrough.betaflight();
            this.transport.set_delimiters(['CCC']);
            const data = await this.transport.read_line({timeout:2000});
            let got_bootloader = data.endsWith('CCC');
            if (!got_bootloader) {
                this.transport.set_delimiters(['\n', 'CCC']);
                let currAttempt = 0;
                this.log('\nAttempting to reboot into bootloader...\n');
                while (!got_bootloader) {
                    currAttempt ++;
                    if (10 < currAttempt) {
                        throw ('[FAILED] to get to BL in reasonable time');
                    }
                    this.log(`[${currAttempt}] retry...`);

                    await this.transport.write(this.init_seq1);

                    const start = Date.now();
                    do {
                        const line = await this.transport.read_line({timeout: 2000});
                        if (line == '')
                            continue;

                        if (line.indexOf('BL_TYPE') != -1) {
                            const bl_type = line.substring(8).trim();
                            this.log(`    Bootloader type found : '${bl_type}`);
                            delay_seq2 = 100;
                            continue;
                        }

                        let versionMatch = line.match(/=== (?<version>[vV].*) ===/);
                        if (versionMatch && versionMatch.groups && versionMatch.groups.version) {
                            this.log(`    Bootloader version found : '${versionMatch.groups.version}'`);
                        }
                        else if (line.indexOf('hold down button') != -1) {
                            this._sleep(delay_seq2);
                            await this.transport.write_string('bbbbbb');
                            got_bootloader = true;
                            break;
                        }
                        else if (line.indexOf('CCC') != -1) {
                            got_bootloader = true;
                            break;
                        }
                        else if (line.indexOf('_RX_') != -1) {
                            let flash_target = this.config.firmware.toUpperCase();

                            if (line.trim() !== flash_target && !force) {
                            //     if query_yes_no("\n\n\nWrong target selected! your RX is '%s', trying to flash '%s', continue? Y/N\n" % (line, flash_target)):
                            //         force = true
                            //         continue
                            //     else:
                                this.log(`Wrong target selected your RX is '${line.trim()}', trying to flash '${flash_target}'`);
                                throw "mismatch";
                            } else if (flash_target !== '') {
                                this.log(`Verified RX target '${flash_target}'`);
                            }
                        }
                    } while (Date.now() - start < 2000);
                }
                this.log(`    Got into bootloader after: ${currAttempt} attempts`);
                this.log('Wait sync...');
                this.transport.set_delimiters(['CCC']);
                const data = await this.transport.read_line({timeout:15000});
                if (data.indexOf('CCC') == -1) {
                    this.log('[FAILED] Unable to communicate with bootloader...');
                    throw ('failed');
                }
                this.log(' sync OK\n')
            } else {
                this.log('\nWe were already in bootloader\n')
            }
        } else {
            this.log('\nWe were already in bootloader\n')
        }
        await this.xmodem.send(binary);
    }

    checkStatus = (response) => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        return response;
    }

    fetchFile = async (file, transform = (e) => e) => {
        const response = await fetch(file);
        const blob = await this.checkStatus(response).blob();
        const binary = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function found() {
                resolve(new Uint8Array(reader.result));
            };
            reader.readAsArrayBuffer(blob);
        });
        return transform(binary);
    }
}

export { XmodemFlasher };
