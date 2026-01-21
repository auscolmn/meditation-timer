import { createContext, useContext, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_QUOTES, DEFAULT_SETTINGS } from '../utils/constants';
import { getTodayString } from '../utils/dateUtils';

// Create the context
const AppContext = createContext(null);

/**
 * App Context Provider - manages global state for sessions, settings, and quotes
 */
export function AppProvider({ children }) {
  // Sessions state
  const [sessions, setSessions] = useLocalStorage(STORAGE_KEYS.SESSIONS, []);

  // Settings state
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

  // Quotes state
  const [quotes, setQuotes] = useLocalStorage(STORAGE_KEYS.QUOTES, DEFAULT_QUOTES);

  // Custom sounds state
  const [customSounds, setCustomSounds] = useLocalStorage(STORAGE_KEYS.CUSTOM_SOUNDS, []);

  // Daily quote tracking
  const [lastQuoteDate, setLastQuoteDate] = useLocalStorage(STORAGE_KEYS.LAST_QUOTE_DATE, null);
  const [dailyQuoteIndex, setDailyQuoteIndex] = useLocalStorage(STORAGE_KEYS.DAILY_QUOTE_INDEX, 0);

  // Session actions
  const addSession = useCallback((session) => {
    const newSession = {
      id: crypto.randomUUID(),
      date: getTodayString(),
      timestamp: new Date().toISOString(),
      ...session
    };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  }, [setSessions]);

  const deleteSession = useCallback((sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, [setSessions]);

  const addManualSession = useCallback((date, duration) => {
    const session = {
      id: crypto.randomUUID(),
      date,
      timestamp: new Date().toISOString(),
      duration,
      completed: true,
      endedEarly: false,
      manual: true
    };
    setSessions(prev => [...prev, session]);
    return session;
  }, [setSessions]);

  // Settings actions
  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, [setSettings]);

  // Quote actions
  const addQuote = useCallback((quote) => {
    const newQuote = {
      id: crypto.randomUUID(),
      ...quote
    };
    setQuotes(prev => [...prev, newQuote]);
    return newQuote;
  }, [setQuotes]);

  const updateQuote = useCallback((quoteId, updates) => {
    setQuotes(prev => prev.map(q =>
      q.id === quoteId ? { ...q, ...updates } : q
    ));
  }, [setQuotes]);

  const deleteQuote = useCallback((quoteId) => {
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
  }, [setQuotes]);

  const resetQuotes = useCallback(() => {
    setQuotes(DEFAULT_QUOTES);
  }, [setQuotes]);

  // Custom sound actions
  const addCustomSound = useCallback((sound) => {
    const newSound = {
      id: crypto.randomUUID(),
      ...sound
    };
    setCustomSounds(prev => [...prev, newSound]);
    return newSound;
  }, [setCustomSounds]);

  const deleteCustomSound = useCallback((soundId) => {
    setCustomSounds(prev => prev.filter(s => s.id !== soundId));
  }, [setCustomSounds]);

  // Get daily quote
  const getDailyQuote = useCallback(() => {
    const today = getTodayString();

    if (quotes.length === 0) return null;

    // Check if we need a new quote for today
    if (lastQuoteDate !== today) {
      // Select a new random quote
      const newIndex = Math.floor(Math.random() * quotes.length);
      setLastQuoteDate(today);
      setDailyQuoteIndex(newIndex);
      return quotes[newIndex];
    }

    // Return the same quote for today
    const safeIndex = dailyQuoteIndex < quotes.length ? dailyQuoteIndex : 0;
    return quotes[safeIndex];
  }, [quotes, lastQuoteDate, dailyQuoteIndex, setLastQuoteDate, setDailyQuoteIndex]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    sessions,
    settings,
    quotes,
    customSounds,

    // Session actions
    addSession,
    deleteSession,
    addManualSession,

    // Settings actions
    updateSettings,

    // Quote actions
    addQuote,
    updateQuote,
    deleteQuote,
    resetQuotes,
    getDailyQuote,

    // Custom sound actions
    addCustomSound,
    deleteCustomSound
  }), [
    sessions,
    settings,
    quotes,
    customSounds,
    addSession,
    deleteSession,
    addManualSession,
    updateSettings,
    addQuote,
    updateQuote,
    deleteQuote,
    resetQuotes,
    getDailyQuote,
    addCustomSound,
    deleteCustomSound
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Custom hook to use the app context
 * @returns {Object} App context value
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
