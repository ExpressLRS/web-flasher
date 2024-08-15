# ExpressLRS Web Flasher

This is a fully web-based flasher for ExpressLRS 3.x
Currently supported flashing methods are:
- UART (Receivers do not need to be in bootloader mode)
- Betaflight passthrough
- EdgeTX passthrough
- STLink
- Wifi - with mdns lookup and 2.5 upgrade via a locally running proxy

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
To actually test the code you will need a firmware folder at the root of the project.
The firmware folder, with all it's accoutrement's can be downloaded from the ExpressLRS artifact repository by
executing the `get_artifacts.sh` command. This will download all the release artifacts and put all the versions
into the `index.js` file for testing locally.
When committing you changes, you will note that there is a comment above where the versions were placed in the
`index.js` file telling you not to commit changes to that line. So it is very important to revert the changes
to the `versions` line before committing you changes.
