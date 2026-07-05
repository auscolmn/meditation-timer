import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { ExportData, Session, Settings, Quote, ExportedCustomSound, TimerPreset } from '../types';

/**
 * Export data to a JSON string
 */
export function exportDataToJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

/** How the backup reached the user (drives the confirmation toast). */
export interface ExportDelivery {
  /** True unless the user dismissed the share sheet AND no copy was saved. */
  delivered: boolean;
  /** Set when a copy was also written to a public folder (Android only). */
  savedTo?: string;
}

/**
 * Write a copy of the backup to the public Documents/Sati folder (Android).
 *
 * Public-directory writes need no permission on API 33+, and work on API
 * 30–32 when writing into a subfolder. On older devices (or any OEM quirk)
 * the write fails — that's fine, the share sheet remains the guaranteed
 * path, so failures here are swallowed by design.
 *
 * iOS is excluded: Directory.Documents maps to the app sandbox there, which
 * isn't user-visible, so the share sheet is the right delivery on iOS.
 */
async function trySaveToPublicDocuments(jsonString: string, filename: string): Promise<string | undefined> {
  if (Capacitor.getPlatform() !== 'android') return undefined;
  try {
    await Filesystem.writeFile({
      path: `Sati/${filename}`,
      directory: Directory.Documents,
      data: jsonString,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return 'Documents/Sati';
  } catch {
    return undefined;
  }
}

/**
 * Deliver the backup file to the user.
 *
 * On Android/iOS an anchor-click download does nothing inside the Capacitor
 * WebView (no download manager is attached to blob: URLs), so the backup is
 * written to the app's cache directory and handed to the native share sheet,
 * letting the user save it to Files/Drive or send it anywhere. On Android a
 * copy is also written to the public Documents/Sati folder so the backup
 * survives even if the user just dismisses the share sheet.
 * On the web the classic blob + anchor download is used.
 */
export async function downloadExport(jsonString: string, filename: string): Promise<ExportDelivery> {
  if (Capacitor.isNativePlatform()) {
    const savedTo = await trySaveToPublicDocuments(jsonString, filename);

    const { uri } = await Filesystem.writeFile({
      path: filename,
      directory: Directory.Cache,
      data: jsonString,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: 'Sati backup',
        dialogTitle: 'Save your Sati backup',
        url: uri,
      });
    } catch (err) {
      // Dismissing the share sheet rejects with a cancellation message —
      // that's a user choice, not a failure. If a public copy was saved,
      // the export still succeeded.
      if (err instanceof Error && /cancel/i.test(err.message)) {
        return { delivered: savedTo !== undefined, savedTo };
      }
      throw err;
    }
    return { delivered: true, savedTo };
  }

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  return { delivered: true };
}

/**
 * Generate a filename for the export
 */
export function generateExportFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `sati-backup-${date}.json`;
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: ExportData;
}

/**
 * Validate an array of sessions
 */
function validateSessions(sessions: unknown): sessions is Session[] {
  if (!Array.isArray(sessions)) return false;
  return sessions.every(s =>
    typeof s === 'object' && s !== null &&
    typeof s.id === 'string' &&
    typeof s.date === 'string' &&
    typeof s.timestamp === 'string' &&
    typeof s.duration === 'number' &&
    typeof s.completed === 'boolean' &&
    typeof s.endedEarly === 'boolean'
  );
}

/**
 * Validate settings object
 */
function validateSettings(settings: unknown): settings is Settings {
  if (typeof settings !== 'object' || settings === null) return false;
  const s = settings as Record<string, unknown>;
  return (
    typeof s.lastDuration === 'object' &&
    typeof s.lastBeginningSound === 'string' &&
    typeof s.lastEndingSound === 'string' &&
    typeof s.backgroundVolume === 'number' &&
    typeof s.bellVolume === 'number'
  );
}

/**
 * Validate an array of quotes
 */
function validateQuotes(quotes: unknown): quotes is Quote[] {
  if (!Array.isArray(quotes)) return false;
  return quotes.every(q =>
    typeof q === 'object' && q !== null &&
    typeof q.id === 'string' &&
    typeof q.text === 'string' &&
    typeof q.author === 'string'
  );
}

/**
 * Validate an array of custom sounds
 */
function validateCustomSounds(sounds: unknown): sounds is ExportedCustomSound[] {
  if (!Array.isArray(sounds)) return false;
  return sounds.every(s =>
    typeof s === 'object' && s !== null &&
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.dataUrl === 'string' &&
    (s.type === 'bell' || s.type === 'background')
  );
}

/**
 * Validate an array of presets
 */
function validatePresets(presets: unknown): presets is TimerPreset[] {
  if (!Array.isArray(presets)) return false;
  return presets.every(p =>
    typeof p === 'object' && p !== null &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.duration === 'object'
  );
}

/**
 * Validate imported data structure
 */
export function validateImport(data: unknown): ValidationResult {
  // Check if it's an object
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Invalid data format: expected an object' };
  }

  const obj = data as Record<string, unknown>;

  // Check version: accept any 1.x backup so future minor/patch format
  // additions still import into older app builds.
  if (typeof obj.version !== 'string' || obj.version.split('.')[0] !== '1') {
    return { valid: false, error: `Unsupported version: ${obj.version}` };
  }

  // Check exportDate
  if (typeof obj.exportDate !== 'string') {
    return { valid: false, error: 'Missing or invalid export date' };
  }

  // Check data object
  if (typeof obj.data !== 'object' || obj.data === null) {
    return { valid: false, error: 'Missing data object' };
  }

  const dataObj = obj.data as Record<string, unknown>;

  // Validate sessions
  if (dataObj.sessions !== undefined && !validateSessions(dataObj.sessions)) {
    return { valid: false, error: 'Invalid sessions format' };
  }

  // Validate settings
  if (dataObj.settings !== undefined && !validateSettings(dataObj.settings)) {
    return { valid: false, error: 'Invalid settings format' };
  }

  // Validate quotes
  if (dataObj.quotes !== undefined && !validateQuotes(dataObj.quotes)) {
    return { valid: false, error: 'Invalid quotes format' };
  }

  // Validate custom sounds
  if (dataObj.customSounds !== undefined && !validateCustomSounds(dataObj.customSounds)) {
    return { valid: false, error: 'Invalid custom sounds format' };
  }

  // Validate presets
  if (dataObj.presets !== undefined && !validatePresets(dataObj.presets)) {
    return { valid: false, error: 'Invalid presets format' };
  }

  return {
    valid: true,
    data: data as ExportData
  };
}

/**
 * Parse and validate a JSON string as export data
 */
export function parseImportData(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    return validateImport(parsed);
  } catch {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

/**
 * Read a file and return its contents as a string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
