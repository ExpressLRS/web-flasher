import { store } from './state.js'

/**
 * Normalize version for filename (e.g. "v3.5.3" or path segment).
 * Replaces path separators and ensures v-prefix when version looks numeric.
 */
function normalizeVersion(version) {
  if (!version) return 'unknown'
  const s = String(version).replace(/\//g, '-').trim()
  if (/^\d/.test(s)) return 'v' + s
  return s
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
 * @param {string} ext - File extension including leading dot if desired, e.g. '.bin.gz' or 'zip'
 * @returns {string} Filename for the download
 */
export function getDownloadFilename(ext = '.bin.gz') {
  const version = normalizeVersion(store.version)
  const target = sanitize(store.target?.config?.firmware) || 'target'
  const region = store.firmware === 'backpack' ? '' : (sanitize(store.options.region) || 'FCC')
  const configLabel = getConfigLabel()

  const base = ['ELRS', version, target].filter(Boolean).join('-')
  const suffix = [region, configLabel].filter(Boolean).join('-')
  const name = suffix ? `${base}-${suffix}` : base

  return name + ext
}
