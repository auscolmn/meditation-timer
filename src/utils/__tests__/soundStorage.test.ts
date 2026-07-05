import { describe, it, expect } from 'vitest';
import {
  extensionForMime,
  mimeFromFilename,
  mimeFromDataUrl,
  base64FromDataUrl,
  soundFileName
} from '../soundStorage';

describe('soundStorage helpers', () => {
  describe('extensionForMime', () => {
    it('maps common audio MIME types to extensions', () => {
      expect(extensionForMime('audio/mpeg')).toBe('mp3');
      expect(extensionForMime('audio/mp3')).toBe('mp3');
      expect(extensionForMime('audio/wav')).toBe('wav');
      expect(extensionForMime('audio/ogg')).toBe('ogg');
      expect(extensionForMime('audio/mp4')).toBe('m4a');
      expect(extensionForMime('audio/x-m4a')).toBe('m4a');
      expect(extensionForMime('audio/aac')).toBe('aac');
    });

    it('is case-insensitive and falls back to bin for unknowns', () => {
      expect(extensionForMime('AUDIO/MPEG')).toBe('mp3');
      expect(extensionForMime('application/octet-stream')).toBe('bin');
    });
  });

  describe('mimeFromFilename', () => {
    it('infers MIME type from the file extension', () => {
      expect(mimeFromFilename('rain.mp3')).toBe('audio/mpeg');
      expect(mimeFromFilename('Voice Memo.m4a')).toBe('audio/mp4');
      expect(mimeFromFilename('BELL.WAV')).toBe('audio/wav');
    });

    it('returns null for unknown or missing extensions', () => {
      expect(mimeFromFilename('notes.txt')).toBeNull();
      expect(mimeFromFilename('noextension')).toBeNull();
    });
  });

  describe('mimeFromDataUrl', () => {
    it('extracts the MIME type from a data URL', () => {
      expect(mimeFromDataUrl('data:audio/mpeg;base64,AAAA')).toBe('audio/mpeg');
      expect(mimeFromDataUrl('data:audio/mp4;base64,AAAA')).toBe('audio/mp4');
    });

    it('returns null for non-data-URL strings', () => {
      expect(mimeFromDataUrl('https://example.com/a.mp3')).toBeNull();
      expect(mimeFromDataUrl('')).toBeNull();
    });
  });

  describe('base64FromDataUrl', () => {
    it('strips the data URL prefix', () => {
      expect(base64FromDataUrl('data:audio/mpeg;base64,QUJD')).toBe('QUJD');
    });

    it('returns the input unchanged when there is no prefix', () => {
      expect(base64FromDataUrl('QUJD')).toBe('QUJD');
    });
  });

  describe('soundFileName', () => {
    it('builds a sounds/ path from id and MIME type', () => {
      expect(soundFileName('abc-123', 'audio/mpeg')).toBe('sounds/abc-123.mp3');
      expect(soundFileName('xyz', 'audio/mp4')).toBe('sounds/xyz.m4a');
    });
  });
});
