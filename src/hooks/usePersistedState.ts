import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  readStored,
  writeStored,
  removeStored,
  syncStoredFromExternal,
  WEB_STORAGE_PREFIX
} from '../utils/appStorage';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Custom hook for state persisted durably via Capacitor Preferences
 * (SharedPreferences / UserDefaults / prefixed localStorage on the web).
 *
 * State is the source of truth; persistence happens in an effect. This
 * means functional updates (`setValue(prev => ...)`) go through React's
 * own updater queue, so rapid successive updates can never clobber each
 * other, and there are no side effects in render — StrictMode and React
 * Compiler safe.
 *
 * Reads are synchronous from the appStorage cache, which main.tsx hydrates
 * before the first render — components never see a pre-hydration flash of
 * defaults. NOTE: a key must be registered in STORAGE_KEYS
 * (utils/constants.ts) for it to be hydrated at launch.
 *
 * The persistence effect compares against the last-persisted serialization
 * rather than using a "skip next" flag: a flag can be left stuck when a
 * state update bails (React skips updates to an identical value), which
 * would silently swallow the following genuine write.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void, string | null] {
  const [error, setError] = useState<string | null>(null);

  // Keep initialValue in a ref so effects don't re-run when callers
  // pass inline literals (e.g. `usePersistedState(key, [])`).
  const initialValueRef = useRef(initialValue);

  // Initial value comes synchronously from the hydrated cache.
  const [storedValue, setStoredValue] = useState<T>(() => {
    const raw = readStored(key);
    if (raw === null) return initialValue;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`Error parsing stored value for key "${key}":`, err);
      return initialValue;
    }
  });

  // The serialization last written to (or read from) storage. `undefined`
  // means the first effect run hasn't happened yet.
  const lastPersistedRef = useRef<string | undefined>(undefined);

  // Persist whenever state changes.
  useEffect(() => {
    const serialized = JSON.stringify(storedValue);

    if (lastPersistedRef.current === undefined) {
      // First run: current state is what storage already holds — or the
      // in-memory default, which is deliberately not persisted until the
      // user changes it (so unedited defaults keep tracking app updates).
      lastPersistedRef.current = serialized;
      return;
    }

    if (serialized === lastPersistedRef.current) return;
    lastPersistedRef.current = serialized;

    writeStored(key, serialized).catch((err) => {
      console.error(`Error persisting key "${key}":`, err);
      // On the web, Preferences is localStorage-backed, so quota errors
      // are still possible there.
      const message =
        err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)
          ? 'Storage quota exceeded. Please delete some data.'
          : 'Failed to save data.';
      setError(message);
    });
  }, [key, storedValue]);

  // Update state; persistence is handled by the effect above.
  const setValue = useCallback<SetValue<T>>((value) => {
    setError(null);
    setStoredValue(value);
  }, []);

  // Remove from storage and reset state without re-persisting the default.
  const removeValue = useCallback(() => {
    lastPersistedRef.current = JSON.stringify(initialValueRef.current);
    setStoredValue(initialValueRef.current);
    setError(null);
    removeStored(key).catch((err) => {
      console.error(`Error removing key "${key}":`, err);
      setError('Failed to remove data.');
    });
  }, [key]);

  // Cross-tab sync — web only. Preferences' web implementation stores
  // values in localStorage under WEB_STORAGE_PREFIX, so storage events
  // still fire for other tabs. Native has no second instance and no
  // change events: no-op there.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined;

    const prefixedKey = WEB_STORAGE_PREFIX + key;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== prefixedKey) return;
      syncStoredFromExternal(key, e.newValue);
      if (e.newValue === null) {
        // Key was removed in another tab.
        lastPersistedRef.current = JSON.stringify(initialValueRef.current);
        setStoredValue(initialValueRef.current);
        return;
      }
      try {
        const parsed = JSON.parse(e.newValue) as T;
        lastPersistedRef.current = e.newValue;
        setStoredValue(parsed);
      } catch (err) {
        console.error(`Error parsing storage event for key "${key}":`, err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue, error];
}

export default usePersistedState;
