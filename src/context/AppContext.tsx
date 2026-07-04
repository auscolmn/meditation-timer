import { createContext, useContext, useCallback, useMemo, useState, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_QUOTES, DEFAULT_SETTINGS } from '../utils/constants';
import { getTodayString } from '../utils/dateUtils';
import type {
  Session,
  Settings,
  Quote,
  CustomSound,
  TimerPreset,
  ExportData,
  AppContextValue,
  DraftTimerSettings
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


  // Draft timer settings (persists during navigation, not in localStorage)
  const [draftTimerSettings, setDraftTimerSettings] = useState<DraftTimerSettings | null>(null);

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

  // Get daily quote — derived deterministically from the date, so it is
  // pure (safe to call during render) and consistent for the whole day.
  const getDailyQuote = useCallback((): Quote | null => {
    if (quotes.length === 0) return null;
    const today = getTodayString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
    }
    return quotes[hash % quotes.length];
  }, [quotes]);

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
        presets
      }
    };
  }, [sessions, settings, quotes, customSounds, presets]);

  // Import all data
  const importAllData = useCallback((data: ExportData) => {
    if (data.data.sessions) setSessions(data.data.sessions);
    if (data.data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.data.settings });
    if (data.data.quotes) setQuotes(data.data.quotes);
    if (data.data.customSounds) setCustomSounds(data.data.customSounds);
    if (data.data.presets) setPresets(data.data.presets);
  }, [setSessions, setSettings, setQuotes, setCustomSounds, setPresets]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo((): AppContextValue => ({
    // State
    sessions,
    settings,
    quotes,
    customSounds,
    presets,
    draftTimerSettings,

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

  
    // Data management
    exportAllData,
    importAllData,

    // Draft timer settings
    setDraftTimerSettings
  }), [
    sessions,
    settings,
    quotes,
    customSounds,
    presets,
    draftTimerSettings,
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
