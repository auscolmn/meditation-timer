import { STORAGE_KEYS, DEFAULT_QUOTES, DEFAULT_SETTINGS } from './constants';

/**
 * Get data from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Parsed data or default value
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Set data in localStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded');
    }
    return false;
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
}

/**
 * Get all meditation sessions
 * @returns {Array} Array of session objects
 */
export function getSessions() {
  return getStorageItem(STORAGE_KEYS.SESSIONS, []);
}

/**
 * Save sessions array
 * @param {Array} sessions - Sessions to save
 */
export function saveSessions(sessions) {
  return setStorageItem(STORAGE_KEYS.SESSIONS, sessions);
}

/**
 * Add a new session
 * @param {Object} session - Session object to add
 * @returns {boolean} Success status
 */
export function addSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  return saveSessions(sessions);
}

/**
 * Delete a session by ID
 * @param {string} sessionId - ID of session to delete
 * @returns {boolean} Success status
 */
export function deleteSession(sessionId) {
  const sessions = getSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  return saveSessions(filtered);
}

/**
 * Get all quotes
 * @returns {Array} Array of quote objects
 */
export function getQuotes() {
  const quotes = getStorageItem(STORAGE_KEYS.QUOTES, null);
  if (quotes === null) {
    // Initialize with default quotes
    setStorageItem(STORAGE_KEYS.QUOTES, DEFAULT_QUOTES);
    return DEFAULT_QUOTES;
  }
  return quotes;
}

/**
 * Save quotes array
 * @param {Array} quotes - Quotes to save
 */
export function saveQuotes(quotes) {
  return setStorageItem(STORAGE_KEYS.QUOTES, quotes);
}

/**
 * Add a new quote
 * @param {Object} quote - Quote object to add
 */
export function addQuote(quote) {
  const quotes = getQuotes();
  quotes.push(quote);
  return saveQuotes(quotes);
}

/**
 * Update a quote
 * @param {string} quoteId - ID of quote to update
 * @param {Object} updates - Fields to update
 */
export function updateQuote(quoteId, updates) {
  const quotes = getQuotes();
  const index = quotes.findIndex(q => q.id === quoteId);
  if (index !== -1) {
    quotes[index] = { ...quotes[index], ...updates };
    return saveQuotes(quotes);
  }
  return false;
}

/**
 * Delete a quote by ID
 * @param {string} quoteId - ID of quote to delete
 */
export function deleteQuote(quoteId) {
  const quotes = getQuotes();
  const filtered = quotes.filter(q => q.id !== quoteId);
  return saveQuotes(filtered);
}

/**
 * Get app settings
 * @returns {Object} Settings object
 */
export function getSettings() {
  return getStorageItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

/**
 * Save app settings
 * @param {Object} settings - Settings to save
 */
export function saveSettings(settings) {
  return setStorageItem(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Update specific settings
 * @param {Object} updates - Settings fields to update
 */
export function updateSettings(updates) {
  const settings = getSettings();
  const updated = { ...settings, ...updates };
  return saveSettings(updated);
}

/**
 * Get custom sounds
 * @returns {Array} Array of custom sound objects
 */
export function getCustomSounds() {
  return getStorageItem(STORAGE_KEYS.CUSTOM_SOUNDS, []);
}

/**
 * Save custom sounds array
 * @param {Array} sounds - Custom sounds to save
 */
export function saveCustomSounds(sounds) {
  return setStorageItem(STORAGE_KEYS.CUSTOM_SOUNDS, sounds);
}

/**
 * Add a custom sound
 * @param {Object} sound - Sound object with id, name, dataUrl, type
 */
export function addCustomSound(sound) {
  const sounds = getCustomSounds();
  sounds.push(sound);
  return saveCustomSounds(sounds);
}

/**
 * Delete a custom sound by ID
 * @param {string} soundId - ID of sound to delete
 */
export function deleteCustomSound(soundId) {
  const sounds = getCustomSounds();
  const filtered = sounds.filter(s => s.id !== soundId);
  return saveCustomSounds(filtered);
}

/**
 * Get the daily quote index and date
 * @returns {Object} { date: string, index: number }
 */
export function getDailyQuoteInfo() {
  const lastDate = getStorageItem(STORAGE_KEYS.LAST_QUOTE_DATE, null);
  const index = getStorageItem(STORAGE_KEYS.DAILY_QUOTE_INDEX, 0);
  return { date: lastDate, index };
}

/**
 * Save daily quote info
 * @param {string} date - Current date (YYYY-MM-DD)
 * @param {number} index - Quote index
 */
export function saveDailyQuoteInfo(date, index) {
  setStorageItem(STORAGE_KEYS.LAST_QUOTE_DATE, date);
  setStorageItem(STORAGE_KEYS.DAILY_QUOTE_INDEX, index);
}

/**
 * Estimate localStorage usage
 * @returns {Object} { used: number, total: number, percentage: number }
 */
export function getStorageUsage() {
  let used = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
    }
  }
  // Most browsers allow ~5-10MB
  const total = 5 * 1024 * 1024; // Assume 5MB
  return {
    used,
    total,
    percentage: Math.round((used / total) * 100)
  };
}
