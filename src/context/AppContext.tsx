import { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_QUOTES, DEFAULT_SETTINGS } from '../utils/constants';
import { getTodayString, formatDateString } from '../utils/dateUtils';
import { format } from 'date-fns';
import type {
  Session,
  Settings,
  Quote,
  CustomSound,
  TimerPreset,
  StreakFreeze,
  ExportData,
  AppContextValue
} from '../types';

// Create the context
const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

/**
 * App Context Provider - manages global state for sessions, settings, quotes, etc.
 */
export function AppProvider({ children }: AppProviderProps) {
  // Sessions state
  const [sessions, setSessions] = useLocalStorage<Session[]>(STORAGE_KEYS.SESSIONS, []);

  // Settings state
  const [settings, setSettings] = useLocalStorage<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

  // Quotes state
  const [quotes, setQuotes] = useLocalStorage<Quote[]>(STORAGE_KEYS.QUOTES, DEFAULT_QUOTES);

  // Custom sounds state
  const [customSounds, setCustomSounds] = useLocalStorage<CustomSound[]>(STORAGE_KEYS.CUSTOM_SOUNDS, []);

  // Presets state
  const [presets, setPresets] = useLocalStorage<TimerPreset[]>(STORAGE_KEYS.PRESETS, []);

  // Streak freezes state
  const [streakFreezes, setStreakFreezes] = useLocalStorage<StreakFreeze[]>(STORAGE_KEYS.STREAK_FREEZES, []);

  // Daily quote tracking
  const [lastQuoteDate, setLastQuoteDate] = useLocalStorage<string | null>(STORAGE_KEYS.LAST_QUOTE_DATE, null);
  const [dailyQuoteIndex, setDailyQuoteIndex] = useLocalStorage<number>(STORAGE_KEYS.DAILY_QUOTE_INDEX, 0);

  // Session actions
  const addSession = useCallback((session: Omit<Session, 'id' | 'date' | 'timestamp'>): Session => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      date: getTodayString(),
      timestamp: new Date().toISOString(),
      ...session
    };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  }, [setSessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, [setSessions]);

  const addManualSession = useCallback((date: string, duration: number): Session => {
    const session: Session = {
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
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, [setSettings]);

  // Quote actions
  const addQuote = useCallback((quote: Omit<Quote, 'id'>): Quote => {
    const newQuote: Quote = {
      id: crypto.randomUUID(),
      ...quote
    };
    setQuotes(prev => [...prev, newQuote]);
    return newQuote;
  }, [setQuotes]);

  const updateQuote = useCallback((quoteId: string, updates: Partial<Quote>) => {
    setQuotes(prev => prev.map(q =>
      q.id === quoteId ? { ...q, ...updates } : q
    ));
  }, [setQuotes]);

  const deleteQuote = useCallback((quoteId: string) => {
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
  }, [setQuotes]);

  const resetQuotes = useCallback(() => {
    setQuotes(DEFAULT_QUOTES);
  }, [setQuotes]);

  // Custom sound actions
  const addCustomSound = useCallback((sound: Omit<CustomSound, 'id'>): CustomSound => {
    const newSound: CustomSound = {
      id: crypto.randomUUID(),
      ...sound
    };
    setCustomSounds(prev => [...prev, newSound]);
    return newSound;
  }, [setCustomSounds]);

  const deleteCustomSound = useCallback((soundId: string) => {
    setCustomSounds(prev => prev.filter(s => s.id !== soundId));
  }, [setCustomSounds]);

  // Preset actions
  const addPreset = useCallback((preset: Omit<TimerPreset, 'id' | 'createdAt'>): TimerPreset => {
    const newPreset: TimerPreset = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...preset
    };
    setPresets(prev => [...prev, newPreset]);
    return newPreset;
  }, [setPresets]);

  const updatePreset = useCallback((presetId: string, updates: Partial<TimerPreset>) => {
    setPresets(prev => prev.map(p =>
      p.id === presetId ? { ...p, ...updates } : p
    ));
  }, [setPresets]);

  const deletePreset = useCallback((presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
  }, [setPresets]);

  // Streak freeze actions
  const addStreakFreeze = useCallback((date: string, reason?: string): StreakFreeze => {
    const newFreeze: StreakFreeze = {
      id: crypto.randomUUID(),
      date,
      reason,
      createdAt: new Date().toISOString()
    };
    setStreakFreezes(prev => [...prev, newFreeze]);
    return newFreeze;
  }, [setStreakFreezes]);

  const deleteStreakFreeze = useCallback((freezeId: string) => {
    setStreakFreezes(prev => prev.filter(f => f.id !== freezeId));
  }, [setStreakFreezes]);

  const useFreeze = useCallback((): boolean => {
    const available = settings.freezesAvailable ?? 0;
    if (available <= 0) return false;

    const yesterday = formatDateString(new Date(Date.now() - 86400000));
    addStreakFreeze(yesterday, 'Streak freeze used');
    updateSettings({ freezesAvailable: available - 1 });
    return true;
  }, [settings.freezesAvailable, addStreakFreeze, updateSettings]);

  const grantMonthlyFreezes = useCallback(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    if (settings.lastFreezeGrantMonth !== currentMonth) {
      updateSettings({
        freezesAvailable: settings.freezesPerMonth ?? 2,
        lastFreezeGrantMonth: currentMonth
      });
    }
  }, [settings.lastFreezeGrantMonth, settings.freezesPerMonth, updateSettings]);

  // Get daily quote
  const getDailyQuote = useCallback((): Quote | null => {
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

  // Export all data
  const exportAllData = useCallback((): ExportData => {
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {
        sessions,
        settings,
        quotes,
        customSounds,
        presets,
        streakFreezes
      }
    };
  }, [sessions, settings, quotes, customSounds, presets, streakFreezes]);

  // Import all data
  const importAllData = useCallback((data: ExportData) => {
    if (data.data.sessions) setSessions(data.data.sessions);
    if (data.data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.data.settings });
    if (data.data.quotes) setQuotes(data.data.quotes);
    if (data.data.customSounds) setCustomSounds(data.data.customSounds);
    if (data.data.presets) setPresets(data.data.presets);
    if (data.data.streakFreezes) setStreakFreezes(data.data.streakFreezes);
  }, [setSessions, setSettings, setQuotes, setCustomSounds, setPresets, setStreakFreezes]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo((): AppContextValue => ({
    // State
    sessions,
    settings,
    quotes,
    customSounds,
    presets,
    streakFreezes,

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
    deleteCustomSound,

    // Preset actions
    addPreset,
    updatePreset,
    deletePreset,

    // Streak freeze actions
    addStreakFreeze,
    deleteStreakFreeze,
    useFreeze,
    grantMonthlyFreezes,

    // Data management
    exportAllData,
    importAllData
  }), [
    sessions,
    settings,
    quotes,
    customSounds,
    presets,
    streakFreezes,
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
    deleteCustomSound,
    addPreset,
    updatePreset,
    deletePreset,
    addStreakFreeze,
    deleteStreakFreeze,
    useFreeze,
    grantMonthlyFreezes,
    exportAllData,
    importAllData
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Custom hook to use the app context
 */
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
