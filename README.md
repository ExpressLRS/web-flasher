# TitanLRS Web Flasher

Web-hosted flasher for TitanLRS firmware (ExpressLRS fork for Titan Dynamics).

# Using the Titan Web Flasher


Usage guide: https://github.com/Titan-Dynamics/titan-web-flasher/wiki/Using-the-Titan-Web-Flasher

## Supported Flashing Methods

- UART (Receivers do not need to be in bootloader mode)
- Betaflight passthrough
- EdgeTX passthrough

## Developing and Testing Locally

### 1. Download Firmware

Download TitanLRS firmware from GitHub Releases:

```bash
./get_artifacts.sh
```

To download a specific version (used for both firmware and backpack), pass it as an argument:

```bash
./get_artifacts.sh <version>
```

Available firmware versions: https://github.com/Titan-Dynamics/TitanLRS/releases
Available backpack versions: https://github.com/Titan-Dynamics/TitanLRS-Backpack/releases

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The development server will start (typically at http://localhost:5173).

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Firmware Structure

The `get_artifacts.sh` script downloads firmware from TitanLRS GitHub Releases and creates the following structure:

```
public/assets/
├── firmware/
│   ├── index.json           # Version index
│   ├── {VERSION}/           # e.g., 4.0.0-TD
│   │   ├── FCC/            # FCC region firmware
│   │   ├── LBT/            # LBT region firmware
│   │   └── hardware/
│   └── hardware/
│       └── targets.json
└── backpack/
    └── index.json
```

## Repository Information

- **Web Flasher Fork**: https://github.com/Titan-Dynamics/web-flasher
- **Firmware Source**: https://github.com/Titan-Dynamics/TitanLRS/releases
- **Backpack Source**: https://github.com/Titan-Dynamics/TitanLRS-Backpack/releases
- **Upstream**: https://github.com/ExpressLRS/web-flasher

## License

Developed by the ExpressLRS community. Adapted for TitanLRS by Titan Dynamics.
