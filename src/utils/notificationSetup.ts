import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { DEFAULT_SOUNDS } from './constants';

/**
 * One-time notification setup for the Part 9 sound design.
 *
 * The end-of-session notification's job changed: bells now ring natively
 * (SessionAudio pipeline on Android always; on iOS whenever ambient audio
 * keeps the app alive), so the notification must not ALSO ding — but it is
 * still always scheduled, because per the settled Part 7 decision (no
 * full-screen intent, no waking the screen) it is the only visible trace of
 * completion for an eyes-closed sitter who picks up their phone later.
 *
 * Android: notifications on a dedicated IMPORTANCE_LOW channel — silent, no
 * heads-up, still visible in the shade.
 *
 * iOS: no `sound` by default (the iOS default when unset). EXCEPT for
 * silent sessions (no ambient), where iOS suspends the app and nothing can
 * ring natively — there the notification IS the bell: it carries a CAF copy
 * of the chosen ending bell as its notification sound. iOS only accepts
 * aiff/wav/caf for notification sounds (30s max), so IMA4-encoded CAF
 * versions of the bundled bells ship in public/sounds/notif/ and are copied
 * to Library/Sounds on first run (where UNNotificationSound looks them up).
 */

/** Android channel for the end-of-session notification: silent, shade-only. */
export const SESSION_END_CHANNEL_ID = 'sati_session_end';

/** Bundled bell ids that have a CAF notification-sound counterpart. */
const NOTIFICATION_SOUND_IDS = Object.values(DEFAULT_SOUNDS)
  .filter(sound => sound.type === 'bell')
  .map(sound => sound.id);

const LIBRARY_SOUNDS_DIR = 'Sounds';

/**
 * The notification-sound file name for an ending sound id (iOS).
 * Custom sounds have no CAF counterpart (they are user MP3/M4A uploads and
 * can exceed 30s), so they fall back to the classic bell — an approximation,
 * but the sit still ends with a bell rather than silence. 'none' stays
 * genuinely silent: the user asked for no ending sound.
 */
export function notificationSoundName(endingSoundId: string): string | null {
  if (endingSoundId === 'none') return null;
  if (NOTIFICATION_SOUND_IDS.includes(endingSoundId)) return `${endingSoundId}.caf`;
  return 'bell.caf';
}

async function copySoundToLibrary(id: string): Promise<void> {
  const path = `${LIBRARY_SOUNDS_DIR}/${id}.caf`;

  try {
    await Filesystem.stat({ path, directory: Directory.Library });
    return; // already in place
  } catch {
    // Missing — copy it below.
  }

  const response = await fetch(`/sounds/notif/${id}.caf`);
  if (!response.ok) throw new Error(`Fetch failed for ${id}.caf (${response.status})`);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${id}.caf`));
    reader.readAsDataURL(blob);
  });
  const commaIndex = dataUrl.indexOf(',');

  await Filesystem.writeFile({
    path,
    directory: Directory.Library,
    data: commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl,
    recursive: true
  });
}

/**
 * Idempotent, fire-and-forget notification setup. Failures are logged and
 * swallowed: a missing channel falls back to the plugin default channel, and
 * a missing sound file makes iOS fall back to the default notification
 * sound — degraded, never broken.
 */
export async function initNotificationSetup(): Promise<void> {
  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: SESSION_END_CHANNEL_ID,
        name: 'Session complete',
        description: 'Shown when a meditation session ends',
        importance: 2 // IMPORTANCE_LOW: visible in the shade, no sound, no heads-up
      });
    } catch (err) {
      console.error('Failed to create session-end notification channel:', err);
    }
    return;
  }

  if (platform === 'ios') {
    for (const id of NOTIFICATION_SOUND_IDS) {
      try {
        await copySoundToLibrary(id);
      } catch (err) {
        console.error(`Failed to install notification sound "${id}":`, err);
      }
    }
  }
}
