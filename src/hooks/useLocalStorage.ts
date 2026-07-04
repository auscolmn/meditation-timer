import { useState, useEffect, useCallback, useRef } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Custom hook for syncing state with localStorage.
 *
 * State is the source of truth; persistence happens in an effect.
 * This means functional updates (`setValue(prev => ...)`) go through
 * React's own updater queue, so rapid successive updates can never
 * clobber each other (no stale-ref reads).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void, string | null] {
  const [error, setError] = useState<string | null>(null);

  // Keep initialValue in a ref so effects don't re-run when callers
  // pass inline literals (e.g. `useLocalStorage(key, [])`).
  const initialValueRef = useRef(initialValue);

  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.error(`Error reading localStorage key "${key}":`, err);
      return initialValue;
    }
  });

  // When true, the next persistence effect run is skipped
  // (used on mount, on removal, and on cross-tab syncs).
  const skipPersistRef = useRef(true);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (err) {
      console.error(`Error setting localStorage key "${key}":`, err);
      // Report asynchronously to avoid cascading synchronous renders
      const message =
        err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)
          ? 'Storage quota exceeded. Please delete some data.'
          : 'Failed to save data.';
      queueMicrotask(() => setError(message));
    }
  }, [key, storedValue]);

  // Update state; persistence is handled by the effect above.
  const setValue = useCallback<SetValue<T>>((value) => {
    setError(null);
    setStoredValue(value);
  }, []);

  // Remove from localStorage and reset state without re-persisting
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      skipPersistRef.current = true;
      setStoredValue(initialValueRef.current);
      setError(null);
    } catch (err) {
      console.error(`Error removing localStorage key "${key}":`, err);
      setError('Failed to remove data.');
    }
  }, [key]);

  // Sync with other tabs/windows (including deletions)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return;
      skipPersistRef.current = true;
      if (e.newValue === null) {
        // Key was removed in another tab
        setStoredValue(initialValueRef.current);
        return;
      }
      try {
        setStoredValue(JSON.parse(e.newValue));
      } catch (err) {
        console.error(`Error parsing storage event for key "${key}":`, err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue, error];
}

export default useLocalStorage;
