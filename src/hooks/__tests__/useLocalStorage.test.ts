import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    expect(result.current[0]).toBe('initialValue');
  });

  it('should return stored value from localStorage', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  it('should update localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(JSON.parse(localStorage.getItem('testKey')!)).toBe('newValue');
  });

  it('should accept function as value (like useState)', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
  });

  it('should remove value from localStorage', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('initialValue');
    expect(localStorage.getItem('testKey')).toBeNull();
  });

  it('should handle complex objects', () => {
    const complexObject = {
      name: 'Test',
      count: 42,
      nested: { value: true }
    };

    const { result } = renderHook(() => useLocalStorage('testKey', complexObject));

    expect(result.current[0]).toEqual(complexObject);

    const newObject = { ...complexObject, count: 100 };
    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
  });

  it('should handle arrays', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('testKey', []));

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
    const { result } = renderHook(() => useLocalStorage('testKey', 'value'));

    expect(result.current[3]).toBeNull(); // error
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('testKey', 'not valid json');

    const { result } = renderHook(() => useLocalStorage('testKey', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });

  it('should use different storage for different keys', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));

    act(() => {
      result1.current[1]('newValue1');
    });

    expect(result1.current[0]).toBe('newValue1');
    expect(result2.current[0]).toBe('value2');
  });
});
