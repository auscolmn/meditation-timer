import { useState, useEffect, useCallback, useRef } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Custom hook for syncing state with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void, string | null] {
  const [error, setError] = useState<string | null>(null);

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

  // Use ref to access current value without adding to dependencies
  const storedValueRef = useRef(storedValue);
  useEffect(() => {
    storedValueRef.current = storedValue;
  }, [storedValue]);

  // Update localStorage when state changes
  const setValue = useCallback<SetValue<T>>((value) => {
    try {
      setError(null);
      // Allow value to be a function (like useState)
      const valueToStore = value instanceof Function ? value(storedValueRef.current) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error(`Error setting localStorage key "${key}":`, err);
      // Handle quota exceeded error
      if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
        setError('Storage quota exceeded. Please delete some data.');
      } else {
        setError('Failed to save data.');
      }
    }
  }, [key]);

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      setError(null);
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (err) {
      console.error(`Error removing localStorage key "${key}":`, err);
      setError('Failed to remove data.');
    }
  }, [key, initialValue]);

  // Sync with other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (err) {
          console.error(`Error parsing storage event for key "${key}":`, err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue, error];
}

export default useLocalStorage;
