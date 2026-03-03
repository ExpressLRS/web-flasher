const STORAGE_KEY = 'elrs-web-flasher_settings'

/**
 * Get all settings from localStorage
 * @returns {Object|null}
 */
export function getSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    } catch (e) {
        console.error('Error loading settings:', e)
        return null
    }
}

/**
 * Save all settings to localStorage
 * @param {Object} settings - Settings object with shared properties and tx/rx sub-objects
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
        console.error('Error saving settings:', e)
    }
}

/**
 * Clear all stored settings
 */
export function clearSettings() {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
        console.error('Error clearing settings:', e)
    }
}
