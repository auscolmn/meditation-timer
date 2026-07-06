import { describe, it, expect, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  hydrateAppStorage,
  readStored,
  writeStored,
  removeStored,
  syncStoredFromExternal,
  resetAppStorageForTests,
  PERSISTED_KEYS,
  WEB_STORAGE_PREFIX
} from '../appStorage';
import { STORAGE_KEYS } from '../constants';

// In the test environment Capacitor runs its web implementation, which
// stores values in (mocked) localStorage under WEB_STORAGE_PREFIX — the
// same behavior as the real web deployment.

describe('appStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppStorageForTests();
  });

  it('derives the hydrated key list from STORAGE_KEYS', () => {
    expect(PERSISTED_KEYS).toEqual(Object.values(STORAGE_KEYS));
  });

  it('hydrates values already stored in Preferences', async () => {
    await Preferences.set({ key: STORAGE_KEYS.SESSIONS, value: '[{"id":"a"}]' });

    await hydrateAppStorage();

    expect(readStored(STORAGE_KEYS.SESSIONS)).toBe('[{"id":"a"}]');
  });

  it('migrates legacy localStorage keys into Preferences and clears them', async () => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, '[{"id":"legacy"}]');

    await hydrateAppStorage();

    // Readable from the cache
    expect(readStored(STORAGE_KEYS.SESSIONS)).toBe('[{"id":"legacy"}]');
    // Landed in Preferences (prefixed key on web)
    expect(localStorage.getItem(WEB_STORAGE_PREFIX + STORAGE_KEYS.SESSIONS)).toBe('[{"id":"legacy"}]');
    // Legacy key cleared only after the copy was verified
    expect(localStorage.getItem(STORAGE_KEYS.SESSIONS)).toBeNull();
  });

  it('never overwrites Preferences data with a lingering legacy key', async () => {
    // Preferences already holds newer data; a stale legacy key remains
    await Preferences.set({ key: STORAGE_KEYS.SETTINGS, value: '{"v":"new"}' });
    localStorage.setItem(STORAGE_KEYS.SETTINGS, '{"v":"stale"}');

    await hydrateAppStorage();

    expect(readStored(STORAGE_KEYS.SETTINGS)).toBe('{"v":"new"}');
    // The stale legacy key is still cleaned up
    expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
  });

  it('is idempotent across repeated hydration calls', async () => {
    localStorage.setItem(STORAGE_KEYS.PRESETS, '["p1"]');

    await hydrateAppStorage();
    await hydrateAppStorage();

    expect(readStored(STORAGE_KEYS.PRESETS)).toBe('["p1"]');
  });

  it('writes through to Preferences and reads back synchronously', async () => {
    await hydrateAppStorage();

    const write = writeStored(STORAGE_KEYS.QUOTES, '["q"]');
    // Cache reflects the write immediately, before the async persist lands
    expect(readStored(STORAGE_KEYS.QUOTES)).toBe('["q"]');

    await write;
    expect(localStorage.getItem(WEB_STORAGE_PREFIX + STORAGE_KEYS.QUOTES)).toBe('["q"]');
  });

  it('applies rapid successive writes in order (last write wins)', async () => {
    await hydrateAppStorage();

    const writes = Promise.all([
      writeStored(STORAGE_KEYS.SESSIONS, '"first"'),
      writeStored(STORAGE_KEYS.SESSIONS, '"second"'),
      writeStored(STORAGE_KEYS.SESSIONS, '"third"')
    ]);

    expect(readStored(STORAGE_KEYS.SESSIONS)).toBe('"third"');
    await writes;
    expect(localStorage.getItem(WEB_STORAGE_PREFIX + STORAGE_KEYS.SESSIONS)).toBe('"third"');
  });

  it('removes from cache and Preferences', async () => {
    await hydrateAppStorage();
    await writeStored(STORAGE_KEYS.CUSTOM_SOUNDS, '["s"]');

    await removeStored(STORAGE_KEYS.CUSTOM_SOUNDS);

    expect(readStored(STORAGE_KEYS.CUSTOM_SOUNDS)).toBeNull();
    expect(localStorage.getItem(WEB_STORAGE_PREFIX + STORAGE_KEYS.CUSTOM_SOUNDS)).toBeNull();
  });

  it('updates the cache from external (cross-tab) changes', async () => {
    await hydrateAppStorage();

    syncStoredFromExternal(STORAGE_KEYS.SETTINGS, '{"theme":"dark"}');
    expect(readStored(STORAGE_KEYS.SETTINGS)).toBe('{"theme":"dark"}');

    syncStoredFromExternal(STORAGE_KEYS.SETTINGS, null);
    expect(readStored(STORAGE_KEYS.SETTINGS)).toBeNull();
  });
});
