/**
 * Runtime target fetching from multiple GitHub repos.
 *
 * Fetches targets.json from each configured repo, strips the "generic"
 * vendor (matching TitanLRS CI behaviour), and deep-merges the results.
 */

const TARGET_REPOS = [
  // Order matters: later entries override earlier ones on conflict.
  // wvarty (custom TD targets) is the base, ELRS overwrites matching keys.
  'https://raw.githubusercontent.com/wvarty/targets/master/targets.json',
  'https://raw.githubusercontent.com/ExpressLRS/targets/master/targets.json',
]

const TARGET_LOG_PREFIX = '[Targets]'

/**
 * Remove the "generic" vendor from a targets object.
 * Mirrors the TitanLRS CI step: jq 'del(.generic)'
 */
function stripTargets(targets) {
  const result = { ...targets }
  delete result.generic
  return result
}

/**
 * Deep-merge multiple targets objects.
 * Later sources override earlier ones for matching keys.
 *
 * Three-level merge:
 *   Level 1 – vendor keys: merged across sources
 *   Level 2 – "name" is last-write-wins; radio types (tx_2400 etc.) merged by key
 *   Level 3 – target keys within a radio type: later source replaces entirely
 */
export function mergeTargets(...sources) {
  const result = {}
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue
    for (const [vendorKey, vendorData] of Object.entries(source)) {
      if (!result[vendorKey]) {
        result[vendorKey] = {}
      }
      for (const [key, value] of Object.entries(vendorData)) {
        if (key === 'name') {
          result[vendorKey].name = value
        } else {
          // Radio type – merge target entries within it
          if (!result[vendorKey][key]) {
            result[vendorKey][key] = {}
          }
          Object.assign(result[vendorKey][key], value)
        }
      }
    }
  }
  return result
}

/**
 * Extract a human-readable repo name from a raw GitHub URL.
 * e.g. "https://raw.githubusercontent.com/ExpressLRS/targets/master/targets.json"
 *    → "ExpressLRS/targets"
 */
export function repoNameFromUrl(url) {
  const match = url.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)/)
  return match ? match[1] : url
}

/**
 * Base URLs for the targets repos (without targets.json).
 * Used to fetch layout files (TX/*.json, RX/*.json) and logo files.
 * Order matches TARGET_REPOS: wvarty first, then ELRS.
 */
export const TARGET_REPO_BASE_URLS = TARGET_REPOS.map(url => url.replace('/targets.json', ''))

/**
 * Attempt to fetch a hardware file (layout or logo) from the GitHub targets repos.
 * Tries each repo in reverse order (ELRS first, then wvarty) so that the
 * higher-priority repo's file is preferred.
 *
 * @param {string} path - relative path within the targets repo, e.g. "TX/Radiomaster Nomad.json"
 * @returns {Promise<Response>} the fetch response
 * @throws if the file is not found in any repo
 */
export async function fetchHardwareFile(path) {
  console.info(`${TARGET_LOG_PREFIX} fetchHardwareFile:start`, { path })
  // Try repos in reverse order (ELRS first) since it has priority
  for (let i = TARGET_REPO_BASE_URLS.length - 1; i >= 0; i--) {
    const url = `${TARGET_REPO_BASE_URLS[i]}/${path}`
    try {
      console.debug(`${TARGET_LOG_PREFIX} fetchHardwareFile:attempt`, { url })
      const response = await fetch(url)
      if (response.ok) {
        console.info(`${TARGET_LOG_PREFIX} fetchHardwareFile:success`, { url, status: response.status })
        return response
      }
      console.warn(`${TARGET_LOG_PREFIX} fetchHardwareFile:not-found`, { url, status: response.status })
    } catch (error) {
      console.warn(`${TARGET_LOG_PREFIX} fetchHardwareFile:error`, { url, error: error?.message ?? error })
    }
  }
  console.error(`${TARGET_LOG_PREFIX} fetchHardwareFile:failed`, { path })
  throw new Error(`Hardware file not found in any targets repo: ${path}`)
}

/**
 * Fetch targets from all configured repos, strip, and merge.
 *
 * @returns {Promise<{ targets: Object|null, errors: Array<{ url: string, error: string }> }>}
 */
export async function fetchTargets() {
  console.info(`${TARGET_LOG_PREFIX} fetchTargets:start`, { repos: TARGET_REPOS })
  const results = await Promise.all(
    TARGET_REPOS.map(async (url) => {
      try {
        console.debug(`${TARGET_LOG_PREFIX} fetchTargets:attempt`, { url })
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const vendorCount = Object.keys(data || {}).length
        console.info(`${TARGET_LOG_PREFIX} fetchTargets:success`, { url, vendorCount })
        return { url, data: stripTargets(data) }
      } catch (err) {
        console.warn(`${TARGET_LOG_PREFIX} fetchTargets:error`, { url, error: err?.message ?? err })
        return { url, error: err.message }
      }
    })
  )

  const errors = results.filter(r => r.error).map(r => ({ url: r.url, error: r.error }))
  const validSources = results.filter(r => r.data).map(r => r.data)

  const targets = validSources.length > 0 ? mergeTargets(...validSources) : null

  console.info(`${TARGET_LOG_PREFIX} fetchTargets:complete`, {
    sourcesOk: validSources.length,
    sourcesFailed: errors.length,
    mergedVendors: targets ? Object.keys(targets).length : 0
  })

  return { targets, errors }
}
