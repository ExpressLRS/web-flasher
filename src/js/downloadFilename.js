import { store } from './state.js'

/**
 * Version for filename: use display version (e.g. "3.5.3") not the hash in store.version.
 * Ensures v-prefix for semantic versions.
 */
function normalizeVersion() {
  const label = store.versionLabel
  if (label) {
    const s = String(label).trim()
    return /^v\d/.test(s) ? s : s ? 'v' + s : 'unknown'
  }
  return 'unknown'
}

/**
 * Sanitize a segment for use in filename (alphanumeric, dot, hyphen, underscore only).
 */
function sanitize(s) {
  if (s == null || s === '') return ''
  return String(s).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || ''
}

/**
 * Derive config summary label: default, bindphrase, or custom.
 */
function getConfigLabel() {
  const opts = store.options
  if (opts.uid) return 'bindphrase'
  if (opts.ssid) return 'custom'
  if (opts.wifiOnInternal !== 60) return 'custom'
  if (store.firmware === 'firmware' && store.target?.config) {
    const tx = opts.tx || {}
    const rx = opts.rx || {}
    if (tx.telemetryInterval !== 240 || tx.uartInverted !== true || tx.fanMinRuntime !== 30 ||
        tx.higherPower !== false || rx.uartBaud !== 420000 || rx.lockOnFirstConnect !== true) {
      return 'custom'
    }
  }
  return 'default'
}

/** 
 * Dotted path into targets.json: vendor.radio.target (firmware) or vendor.target (backpack). 
 */
function getTargetDottedPath() {
  const t = store.target
  if (!t) return ''
  if (store.firmware === 'backpack') {
    return [t.vendor, t.target].filter(Boolean).join('.')
  }
  return [t.vendor, t.radio, t.target].filter(Boolean).join('.')
}

/**
 * @param {string} ext - File extension including leading dot if desired, e.g. '.bin.gz' or 'zip'
 * @returns {string} Filename for the download
 */
export function getDownloadFilename(ext = '.bin.gz') {
  const version = normalizeVersion()
  const target = sanitize(getTargetDottedPath()) || 'target'
  const region = store.firmware === 'backpack' ? '' : (sanitize(store.options.region) || 'FCC')
  const configLabel = getConfigLabel()

  const name = ['ELRS', version, target, region, configLabel].filter(Boolean).join('-')
  return name + ext
}
