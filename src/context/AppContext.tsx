import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { STORAGE_KEYS, DEFAULT_QUOTES, DEFAULT_SETTINGS } from '../utils/constants';
import { getTodayString } from '../utils/dateUtils';
import {
  saveSoundFile,
  deleteSoundFile,
  readSoundAsDataUrl,
  clearSoundSrcCache,
  mimeFromDataUrl
} from '../utils/soundStorage';
import type {
  Session,
  Settings,
  Quote,
  CustomSound,
  ExportedCustomSound,
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
  const [sessions, setSessions, , sessionsError] = usePersistedState<Session[]>(STORAGE_KEYS.SESSIONS, []);

  // Settings state
  const [settings, setSettings, , settingsError] = usePersistedState<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

  // Quotes state
  const [quotes, setQuotes, , quotesError] = usePersistedState<Quote[]>(STORAGE_KEYS.QUOTES, DEFAULT_QUOTES);

  // Custom sounds state
  const [customSounds, setCustomSounds, , customSoundsError] = usePersistedState<CustomSound[]>(STORAGE_KEYS.CUSTOM_SOUNDS, []);

  // Presets state
  const [presets, setPresets, , presetsError] = usePersistedState<TimerPreset[]>(STORAGE_KEYS.PRESETS, []);

  // First persistence failure across all stores, surfaced globally by
  // StorageErrorToast. A failed save of years of session history must
  // never die silently (Part 2 lesson: dropped storage errors hide quota
  // failures upstream). Clears when the next write to that store succeeds.
  const storageError =
    sessionsError ?? settingsError ?? quotesError ?? customSoundsError ?? presetsError;


  // Draft timer settings (survives navigation only; deliberately not persisted)
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

  // Custom sound actions.
  // The caller (SoundUpload) writes the audio file to the filesystem first,
  // then registers the metadata here — so a sound only ever appears in state
  // once its file is safely persisted.
  const addCustomSound = useCallback((sound: CustomSound): CustomSound => {
    setCustomSounds(prev => [...prev, sound]);
    return sound;
  }, [setCustomSounds]);

  const deleteCustomSound = useCallback((soundId: string) => {
    // Side effect kept out of the state updater (StrictMode-safe).
    const sound = customSounds.find(s => s.id === soundId);
    if (sound) {
      void deleteSoundFile(sound);
    }
    setCustomSounds(prev => prev.filter(s => s.id !== soundId));
  }, [customSounds, setCustomSounds]);

  // One-time migration: sounds saved before the filesystem move carry their
  // audio inline as a base64 dataUrl in localStorage. Write each to a file
  // and keep only metadata in state, freeing the localStorage quota.
  const soundMigrationRan = useRef(false);
  useEffect(() => {
    if (soundMigrationRan.current) return;
    soundMigrationRan.current = true;

    type LegacyOrCurrent = CustomSound | (ExportedCustomSound & { fileName?: undefined });
    const sounds = customSounds as LegacyOrCurrent[];
    if (!sounds.some(s => s.fileName === undefined)) return;

    void (async () => {
      const migrated: CustomSound[] = [];
      for (const s of sounds) {
        if (s.fileName !== undefined) {
          migrated.push(s);
          continue;
        }
        try {
          const mimeType = mimeFromDataUrl(s.dataUrl) ?? 'audio/mpeg';
          const fileName = await saveSoundFile(s.id, mimeType, s.dataUrl);
          migrated.push({ id: s.id, name: s.name, type: s.type, fileName, mimeType });
        } catch (err) {
          console.error(`Failed to migrate custom sound "${s.name}":`, err);
          // Keep the legacy entry so audio isn't lost; retried next launch.
          migrated.push(s as unknown as CustomSound);
        }
      }
      setCustomSounds(migrated);
    })();
  }, [customSounds, setCustomSounds]);

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

  // Export all data. Sound audio lives in the filesystem, so it's read back
  // and embedded as base64 data URLs, keeping backups fully self-contained
  // and portable across devices. Sounds whose files are missing are skipped.
  const exportAllData = useCallback(async (): Promise<ExportData> => {
    const exportedSounds: ExportedCustomSound[] = [];
    for (const sound of customSounds) {
      const dataUrl = await readSoundAsDataUrl(sound);
      if (dataUrl) {
        exportedSounds.push({ id: sound.id, name: sound.name, type: sound.type, dataUrl });
      }
    }
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {
        sessions,
        settings,
        quotes,
        customSounds: exportedSounds,
        presets
      }
    };
  }, [sessions, settings, quotes, customSounds, presets]);

  // Import all data, replacing current data. Embedded sound audio is written
  // out to files; existing sound files are removed first.
  const importAllData = useCallback(async (data: ExportData) => {
    if (data.data.customSounds) {
      for (const existing of customSounds) {
        await deleteSoundFile(existing);
      }
      clearSoundSrcCache();

      const importedSounds: CustomSound[] = [];
      for (const s of data.data.customSounds) {
        const mimeType = mimeFromDataUrl(s.dataUrl) ?? 'audio/mpeg';
        const fileName = await saveSoundFile(s.id, mimeType, s.dataUrl);
        importedSounds.push({ id: s.id, name: s.name, type: s.type, fileName, mimeType });
      }
      setCustomSounds(importedSounds);
    }
    if (data.data.sessions) setSessions(data.data.sessions);
    if (data.data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.data.settings });
    if (data.data.quotes) setQuotes(data.data.quotes);
    if (data.data.presets) setPresets(data.data.presets);
  }, [customSounds, setSessions, setSettings, setQuotes, setCustomSounds, setPresets]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo((): AppContextValue => ({
    // State
    sessions,
    settings,
    quotes,
    customSounds,
    presets,
    draftTimerSettings,
    storageError,

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
    storageError,
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
