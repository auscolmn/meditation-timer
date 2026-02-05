import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportDataToJson,
  generateExportFilename,
  validateImport,
  parseImportData,
  downloadExport
} from '../dataExport';
import type { ExportData } from '../../types';

// Helper to create valid export data
const createValidExportData = (): ExportData => ({
  version: '1.0.0',
  exportDate: new Date().toISOString(),
  data: {
    sessions: [
      {
        id: '1',
        date: '2024-06-15',
        timestamp: new Date().toISOString(),
        duration: 600,
        completed: true,
        endedEarly: false
      }
    ],
    settings: {
      lastDuration: { hours: 0, minutes: 10, seconds: 0 },
      lastBeginningSound: 'bell',
      lastEndingSound: 'tibetan-bell',
      lastBackgroundSound: 'none',
      backgroundVolume: 50,
      bellVolume: 80,
      lastIntervalBells: [],
      focusMode: false,
      preparationTime: 0
    },
    quotes: [
      {
        id: 'q1',
        text: 'Test quote',
        author: 'Test Author',
        category: 'Buddhism'
      }
    ],
    customSounds: [],
    presets: [],
    streakFreezes: []
  }
});

describe('dataExport', () => {
  describe('exportDataToJson', () => {
    it('should convert export data to formatted JSON string', () => {
      const data = createValidExportData();
      const result = exportDataToJson(data);

      expect(typeof result).toBe('string');
      expect(() => JSON.parse(result)).not.toThrow();

      const parsed = JSON.parse(result);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.data.sessions).toHaveLength(1);
    });

    it('should format JSON with indentation', () => {
      const data = createValidExportData();
      const result = exportDataToJson(data);

      // Check for newlines indicating formatting
      expect(result).toContain('\n');
    });
  });

  describe('generateExportFilename', () => {
    it('should generate a filename with current date', () => {
      const filename = generateExportFilename();

      expect(filename).toMatch(/^sati-backup-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should use ISO date format', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));

      const filename = generateExportFilename();
      expect(filename).toBe('sati-backup-2024-06-15.json');

      vi.useRealTimers();
    });
  });

  describe('validateImport', () => {
    it('should validate correct export data', () => {
      const data = createValidExportData();
      const result = validateImport(data);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject non-object data', () => {
      const result = validateImport('not an object');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expected an object');
    });

    it('should reject null data', () => {
      const result = validateImport(null);

      expect(result.valid).toBe(false);
    });

    it('should reject wrong version', () => {
      const data = { ...createValidExportData(), version: '2.0.0' };
      const result = validateImport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported version');
    });

    it('should reject missing export date', () => {
      const data = createValidExportData();
      delete (data as unknown as Record<string, unknown>).exportDate;
      const result = validateImport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('export date');
    });

    it('should reject missing data object', () => {
      const data = {
        version: '1.0.0',
        exportDate: new Date().toISOString()
      };
      const result = validateImport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing data object');
    });

    it('should reject invalid sessions format', () => {
      const data = createValidExportData();
      data.data.sessions = [{ invalid: true }] as never;
      const result = validateImport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('sessions');
    });

    it('should reject invalid settings format', () => {
      const data = createValidExportData();
      data.data.settings = { invalid: true } as never;
      const result = validateImport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('settings');
    });

    it('should reject invalid quotes format', () => {
      const data = createValidExportData();
      data.data.quotes = [{ invalid: true }] as never;
      const result = validateImport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('quotes');
    });

    it('should allow empty arrays', () => {
      const data = createValidExportData();
      data.data.sessions = [];
      data.data.quotes = [];
      data.data.customSounds = [];
      data.data.presets = [];
      data.data.streakFreezes = [];

      const result = validateImport(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('parseImportData', () => {
    it('should parse valid JSON string', () => {
      const data = createValidExportData();
      const jsonString = JSON.stringify(data);
      const result = parseImportData(jsonString);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject invalid JSON', () => {
      const result = parseImportData('not json');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should reject valid JSON with invalid structure', () => {
      const result = parseImportData('{"foo": "bar"}');

      expect(result.valid).toBe(false);
    });
  });

  describe('downloadExport', () => {
    beforeEach(() => {
      // Mock URL methods
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('should create a download link and click it', () => {
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      downloadExport('{"test": true}', 'test.json');

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
