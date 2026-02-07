import type { ExportData, Session, Settings, Quote, CustomSound, TimerPreset, StreakFreeze } from '../types';

/**
 * Export data to a JSON string
 */
export function exportDataToJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger a file download with the given content
 */
export function downloadExport(jsonString: string, filename: string): void {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
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
function validateCustomSounds(sounds: unknown): sounds is CustomSound[] {
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
 * Validate an array of streak freezes
 */
function validateStreakFreezes(freezes: unknown): freezes is StreakFreeze[] {
  if (!Array.isArray(freezes)) return false;
  return freezes.every(f =>
    typeof f === 'object' && f !== null &&
    typeof f.id === 'string' &&
    typeof f.date === 'string' &&
    typeof f.createdAt === 'string'
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

  // Check version
  if (obj.version !== '1.0.0') {
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

  // Validate streak freezes
  if (dataObj.streakFreezes !== undefined && !validateStreakFreezes(dataObj.streakFreezes)) {
    return { valid: false, error: 'Invalid streak freezes format' };
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
  } catch (err) {
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
