import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { CustomSound } from '../types';

/**
 * Custom sound blob storage.
 *
 * Sound audio data lives in the Capacitor Filesystem (real files in the
 * app's data directory on Android/iOS; IndexedDB-backed on the web), while
 * only lightweight metadata ({ id, name, type, fileName, mimeType }) is kept
 * in app state / Capacitor Preferences. This avoids the storage quota that
 * base64 audio previously risked blowing, survives WebView data eviction on
 * native, and gives the future native background-audio pipeline the file
 * URIs it needs.
 */

const SOUNDS_DIR = 'sounds';

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
};

/** Map a MIME type to a file extension (defaults to 'bin' for unknowns). */
export function extensionForMime(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType.toLowerCase()] ?? 'bin';
}

/**
 * Infer a MIME type from a filename extension. Used as a fallback when the
 * browser/OS reports an empty File.type (common for m4a on some platforms).
 */
export function mimeFromFilename(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? MIME_BY_EXTENSION[ext] ?? null : null;
}

/** Extract the MIME type from a data URL, e.g. "data:audio/mpeg;base64,...". */
export function mimeFromDataUrl(dataUrl: string): string | null {
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return match ? match[1] : null;
}

/** Strip the "data:...;base64," prefix, leaving the raw base64 payload. */
export function base64FromDataUrl(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

/** Build the storage path for a sound file. */
export function soundFileName(id: string, mimeType: string): string {
  return `${SOUNDS_DIR}/${id}.${extensionForMime(mimeType)}`;
}

// Resolved playable src per sound id, so each file is only bridged/read once
// per app run. Data directory files are stable, so cache invalidation only
// happens on delete/import (evictSoundSrc / clearSoundSrcCache).
const srcCache = new Map<string, string>();

/**
 * Write a sound's audio data (as a data URL) to the filesystem.
 * Returns the stored file name.
 */
export async function saveSoundFile(
  id: string,
  mimeType: string,
  dataUrl: string
): Promise<string> {
  const fileName = soundFileName(id, mimeType);
  await Filesystem.writeFile({
    path: fileName,
    directory: Directory.Data,
    data: base64FromDataUrl(dataUrl),
    recursive: true,
  });
  srcCache.delete(id);
  return fileName;
}

/** Delete a sound file. Never throws — a missing file is already "deleted". */
export async function deleteSoundFile(sound: Pick<CustomSound, 'id' | 'fileName'>): Promise<void> {
  srcCache.delete(sound.id);
  try {
    await Filesystem.deleteFile({ path: sound.fileName, directory: Directory.Data });
  } catch {
    // File already gone (or never written) — nothing to do.
  }
}

/**
 * Resolve a playable src for a custom sound.
 * Native: a WebView-servable URL via convertFileSrc (no data copied over the
 * bridge). Web: the file is read back from IndexedDB as a data/object URL.
 * Results are cached per sound id. Returns null if the file is missing.
 */
export async function getCustomSoundSrc(sound: CustomSound): Promise<string | null> {
  const cached = srcCache.get(sound.id);
  if (cached) return cached;

  try {
    let src: string;
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.getUri({
        path: sound.fileName,
        directory: Directory.Data,
      });
      src = Capacitor.convertFileSrc(uri);
    } else {
      const { data } = await Filesystem.readFile({
        path: sound.fileName,
        directory: Directory.Data,
      });
      src =
        typeof data === 'string'
          ? `data:${sound.mimeType};base64,${data}`
          : URL.createObjectURL(data);
    }
    srcCache.set(sound.id, src);
    return src;
  } catch (err) {
    console.error(`Failed to resolve custom sound "${sound.name}":`, err);
    return null;
  }
}

/**
 * Read a sound's audio data back as a data URL (used to embed sounds in
 * portable backup exports). Returns null if the file is missing.
 */
export async function readSoundAsDataUrl(sound: CustomSound): Promise<string | null> {
  try {
    const { data } = await Filesystem.readFile({
      path: sound.fileName,
      directory: Directory.Data,
    });
    if (typeof data === 'string') {
      return `data:${sound.mimeType};base64,${data}`;
    }
    // Blob (some web implementations): convert via FileReader.
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read sound file'));
      reader.readAsDataURL(data);
    });
  } catch (err) {
    console.error(`Failed to read custom sound "${sound.name}" for export:`, err);
    return null;
  }
}

/** Drop a single cached src (after delete/replace). */
export function evictSoundSrc(id: string): void {
  srcCache.delete(id);
}

/** Drop all cached srcs (after a full import replaces the sound set). */
export function clearSoundSrcCache(): void {
  srcCache.clear();
}
