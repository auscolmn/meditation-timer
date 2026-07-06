import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistedState } from '../usePersistedState';
import {
  hydrateAppStorage,
  writeStored,
  resetAppStorageForTests,
  WEB_STORAGE_PREFIX
} from '../../utils/appStorage';

// Persisted value visible to Preferences' web implementation (which backs
// onto mocked localStorage under WEB_STORAGE_PREFIX in tests).
function persisted(key: string): string | null {
  return localStorage.getItem(WEB_STORAGE_PREFIX + key);
}

describe('usePersistedState', () => {
  beforeEach(async () => {
    localStorage.clear();
    resetAppStorageForTests();
    await hydrateAppStorage();
  });

  it('should return initial value when storage is empty', () => {
    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));

    expect(result.current[0]).toBe('initialValue');
  });

  it('should return stored value from storage', async () => {
    await writeStored('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  it('should persist to storage when setValue is called', async () => {
    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    await waitFor(() => {
      expect(JSON.parse(persisted('testKey')!)).toBe('newValue');
    });
  });

  it('should accept function as value (like useState)', () => {
    const { result } = renderHook(() => usePersistedState('counter', 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
  });

  it('should not persist an unchanged default until it is set', async () => {
    renderHook(() => usePersistedState('testKey', 'defaultValue'));

    // Flush any pending writes
    await act(async () => {});

    // Unedited defaults keep tracking app updates rather than being frozen
    expect(persisted('testKey')).toBeNull();
  });

  it('should remove value from storage', async () => {
    await writeStored('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('initialValue');
    await waitFor(() => {
      expect(persisted('testKey')).toBeNull();
    });
  });

  it('should persist the next write after a no-op remove (stuck-skip regression)', async () => {
    // removeValue while the value already equals the default: the state
    // update bails, which left the old skip-flag implementation stuck and
    // silently swallowed the following genuine write.
    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));

    act(() => {
      result.current[2](); // removeValue on an untouched hook
    });

    act(() => {
      result.current[1]('mustPersist');
    });

    expect(result.current[0]).toBe('mustPersist');
    await waitFor(() => {
      expect(JSON.parse(persisted('testKey')!)).toBe('mustPersist');
    });
  });

  it('should handle complex objects', () => {
    const complexObject = {
      name: 'Test',
      count: 42,
      nested: { value: true }
    };

    const { result } = renderHook(() => usePersistedState('testKey', complexObject));

    expect(result.current[0]).toEqual(complexObject);

    const newObject = { ...complexObject, count: 100 };
    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
  });

  it('should handle arrays', () => {
    const { result } = renderHook(() => usePersistedState<string[]>('testKey', []));

    act(() => {
      result.current[1](['item1', 'item2']);
    });

    expect(result.current[0]).toEqual(['item1', 'item2']);

    act(() => {
      result.current[1]((prev: string[]) => [...prev, 'item3']);
    });

    expect(result.current[0]).toEqual(['item1', 'item2', 'item3']);
  });

  it('should return null error initially', () => {
    const { result } = renderHook(() => usePersistedState('testKey', 'value'));

    expect(result.current[3]).toBeNull(); // error
  });

  it('should handle invalid JSON in storage gracefully', async () => {
    await writeStored('testKey', 'not valid json');

    const { result } = renderHook(() => usePersistedState('testKey', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });

  it('should use different storage for different keys', () => {
    const { result: result1 } = renderHook(() => usePersistedState('key1', 'value1'));
    const { result: result2 } = renderHook(() => usePersistedState('key2', 'value2'));

    act(() => {
      result1.current[1]('newValue1');
    });

    expect(result1.current[0]).toBe('newValue1');
    expect(result2.current[0]).toBe('value2');
  });

  it('should sync state from a storage event in another tab (web)', () => {
    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: WEB_STORAGE_PREFIX + 'testKey',
          newValue: JSON.stringify('externalValue')
        })
      );
    });

    expect(result.current[0]).toBe('externalValue');
  });

  it('should reset to initial value when another tab removes the key (web)', async () => {
    await writeStored('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));
    expect(result.current[0]).toBe('storedValue');

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: WEB_STORAGE_PREFIX + 'testKey',
          newValue: null
        })
      );
    });

    expect(result.current[0]).toBe('initialValue');
  });

  it('should ignore storage events for unprefixed or unrelated keys', () => {
    const { result } = renderHook(() => usePersistedState('testKey', 'initialValue'));

    act(() => {
      // Unprefixed (raw legacy key) and a different prefixed key
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'testKey', newValue: JSON.stringify('x') })
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: WEB_STORAGE_PREFIX + 'otherKey',
          newValue: JSON.stringify('y')
        })
      );
    });

    expect(result.current[0]).toBe('initialValue');
  });
});
