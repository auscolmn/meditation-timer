import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for syncing state with localStorage
 * @param {string} key - localStorage key
 * @param {*} initialValue - Default value if key doesn't exist
 * @returns {[*, Function, Function, string|null]} [value, setValue, removeValue, error]
 */
export function useLocalStorage(key, initialValue) {
  const [error, setError] = useState(null);

  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState(() => {
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
  const setValue = useCallback((value) => {
    try {
      setError(null);
      // Allow value to be a function (like useState)
      const valueToStore = value instanceof Function ? value(storedValueRef.current) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error(`Error setting localStorage key "${key}":`, err);
      // Handle quota exceeded error
      if (err.name === 'QuotaExceededError' || err.code === 22) {
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
    const handleStorageChange = (e) => {
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
