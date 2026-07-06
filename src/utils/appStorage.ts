import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEYS } from './constants';

/**
 * Durable key-value persistence for app state.
 *
 * Backed by Capacitor Preferences: SharedPreferences on Android,
 * UserDefaults on iOS, prefixed localStorage on the web. WebView
 * localStorage can be evicted by the OS under storage pressure — not
 * acceptable for years of session history — while Preferences is durable
 * and rides along in OS backups (the payoff of Android allowBackup=true).
 *
 * Preferences' API is async but React state initializers are synchronous,
 * so an in-memory cache is hydrated exactly once, BEFORE React renders
 * (awaited in main.tsx). After that:
 *   - reads are synchronous from the cache (no loading gates, no
 *     pre-hydration render states anywhere in the tree)
 *   - writes update the cache immediately and write through to Preferences
 *     on a per-key promise chain, so writes to the same key can never land
 *     out of order even if the underlying bridge resolves out of order
 *
 * Adding persisted state in a future feature: register the key in
 * STORAGE_KEYS (utils/constants.ts) — that is the list this module
 * hydrates at launch — then consume it with usePersistedState.
 */

/** Every key hydrated at launch. Derived from STORAGE_KEYS — the single
 *  place new persisted keys are registered. */
export const PERSISTED_KEYS: readonly string[] = Object.values(STORAGE_KEYS);

/**
 * Preferences' web implementation stores values in localStorage under this
 * prefix (its default group). Native platforms don't use it; the web-only
 * cross-tab sync in usePersistedState listens for storage events on these
 * prefixed keys.
 */
export const WEB_STORAGE_PREFIX = 'CapacitorStorage.';

const cache = new Map<string, string>();
let hydrated = false;

/** Per-key promise chains guaranteeing writes land in dispatch order. */
const writeChains = new Map<string, Promise<void>>();

function enqueue(key: string, op: () => Promise<void>): Promise<void> {
  const prev = writeChains.get(key) ?? Promise.resolve();
  // A failed write must not poison the chain for subsequent writes; the
  // failure still propagates to this call's own caller via `next`.
  const next = prev.catch(() => undefined).then(op);
  writeChains.set(key, next);
  return next;
}

/**
 * One-time migration of legacy `sati_*` keys out of WebView localStorage
 * into Preferences. Idempotent and crash-safe:
 *   - a key is copied only if Preferences doesn't already hold it
 *   - the legacy key is removed only after the copy is verified, so any
 *     failure leaves the legacy data in place to be retried next launch
 * On the web, Preferences itself writes to localStorage under
 * WEB_STORAGE_PREFIX — a different key — so there is no self-migration.
 */
async function migrateLegacyLocalStorage(): Promise<void> {
  for (const key of PERSISTED_KEYS) {
    try {
      const legacy = localStorage.getItem(key);
      if (legacy === null) continue;

      const existing = await Preferences.get({ key });
      if (existing.value === null) {
        await Preferences.set({ key, value: legacy });
      }

      const verified = await Preferences.get({ key });
      if (verified.value !== null) {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.error(`Failed to migrate "${key}" to Preferences:`, err);
      // Legacy key is kept; migration retries on next launch.
    }
  }
}

/**
 * Run the legacy migration, then load every persisted key into the cache.
 * Must complete before the first render (awaited in main.tsx).
 * Never throws: a key that fails to read simply falls back to the
 * consuming hook's initial value.
 */
export async function hydrateAppStorage(): Promise<void> {
  if (hydrated) return;

  await migrateLegacyLocalStorage();

  await Promise.all(
    PERSISTED_KEYS.map(async (key) => {
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null) cache.set(key, value);
      } catch (err) {
        console.error(`Failed to read "${key}" from Preferences:`, err);
      }
    })
  );

  hydrated = true;
}

/** Synchronous cache read; null when the key has never been written. */
export function readStored(key: string): string | null {
  return cache.get(key) ?? null;
}

/**
 * Update the cache immediately and persist in write order.
 * Rejects if the persist fails — callers surface that to the user.
 */
export function writeStored(key: string, value: string): Promise<void> {
  cache.set(key, value);
  return enqueue(key, () => Preferences.set({ key, value }));
}

/** Remove from the cache immediately and from Preferences in write order. */
export function removeStored(key: string): Promise<void> {
  cache.delete(key);
  return enqueue(key, () => Preferences.remove({ key }));
}

/**
 * Keep the cache in step with a change made by another tab (web only), so
 * a component mounting later reads the fresh value.
 */
export function syncStoredFromExternal(key: string, value: string | null): void {
  if (value === null) {
    cache.delete(key);
  } else {
    cache.set(key, value);
  }
}

/** Test-only: reset module state between tests. */
export function resetAppStorageForTests(): void {
  cache.clear();
  writeChains.clear();
  hydrated = false;
}
