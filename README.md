# ExpressLRS Web Flasher

This is a fully web-based flasher for ExpressLRS 3.x
Currently supported flashing methods are:
- UART (Receivers do not need to be in bootloader mode)
- Betaflight passthrough
- EdgeTX passthrough
- STLink

Currently, WiFi flashing is not supported.

# Developing and testing locally

Checkout the git repository and run...
```
npm install
```
To start a development web server...
```
npm run dev
```
To build the distribution for stuffing on a web server
```
npm run dist
```
# Firmware
To actually test the code you will need a firmware folder in the same directory as `index.html` and friends.
The firmware folder, with all it's acoutrements can be downloaded from the ExpressLRS github repository.
1. Browse to `https://github.com/ExpressLRS/ExpressLRS/actions`
2. Find the `Target config cleanup` run, and click on that
3. At the bottom of the page you will find `firmware`, this is the firmware zip that you need to download
4. For development, unzip `firmware.zip` in the root folder, next to this `README.md` file.
5. For deployment, unzip `firmware.zip` in the same folder as `index.html`.
