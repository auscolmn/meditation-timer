import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTodayString,
  formatDateString,
  parseDateString,
  calculateStreak,
  getLongestStreak,
  getSessionsForDate,
  timeToSeconds,
  secondsToTime,
  formatTimeDisplay,
  formatDuration,
  getTotalMeditationTime,
  isDateFuture,
  isDateToday
} from '../dateUtils';
import type { Session, StreakFreeze } from '../../types';

// Helper to create mock sessions
const createSession = (date: string, duration = 600): Session => ({
  id: Math.random().toString(36),
  date,
  timestamp: new Date().toISOString(),
  duration,
  completed: true,
  endedEarly: false
});

describe('dateUtils', () => {
  describe('getTodayString', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const result = getTodayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateString', () => {
    it('should format a date as YYYY-MM-DD', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      expect(formatDateString(date)).toBe('2024-06-15');
    });
  });

  describe('parseDateString', () => {
    it('should parse a YYYY-MM-DD string to Date', () => {
      const result = parseDateString('2024-06-15');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5); // June (0-indexed)
      expect(result.getDate()).toBe(15);
    });
  });

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return 0 for empty sessions', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('should return 0 for null/undefined sessions', () => {
      expect(calculateStreak(null as unknown as Session[])).toBe(0);
    });

    it('should return 1 for a session today', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const sessions = [createSession('2024-06-15')];
      expect(calculateStreak(sessions)).toBe(1);
    });

    it('should return 1 for a session yesterday (streak still valid)', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const sessions = [createSession('2024-06-14')];
      expect(calculateStreak(sessions)).toBe(1);
    });

    it('should return 0 if most recent session is older than yesterday', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const sessions = [createSession('2024-06-13')];
      expect(calculateStreak(sessions)).toBe(0);
    });

    it('should count consecutive days correctly', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const sessions = [
        createSession('2024-06-15'),
        createSession('2024-06-14'),
        createSession('2024-06-13'),
        createSession('2024-06-12')
      ];
      expect(calculateStreak(sessions)).toBe(4);
    });

    it('should stop counting at gaps', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const sessions = [
        createSession('2024-06-15'),
        createSession('2024-06-14'),
        // gap on 13th
        createSession('2024-06-12'),
        createSession('2024-06-11')
      ];
      expect(calculateStreak(sessions)).toBe(2);
    });

    it('should ignore multiple sessions on the same day', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const sessions = [
        createSession('2024-06-15'),
        createSession('2024-06-15'), // same day
        createSession('2024-06-14')
      ];
      expect(calculateStreak(sessions)).toBe(2);
    });

    it('should handle freezes as valid days', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const sessions = [
        createSession('2024-06-15'),
        // no session on 14th but it's frozen
        createSession('2024-06-13')
      ];
      const freezes: StreakFreeze[] = [
        { id: '1', date: '2024-06-14', createdAt: new Date().toISOString() }
      ];
      expect(calculateStreak(sessions, freezes)).toBe(3);
    });
  });

  describe('getLongestStreak', () => {
    it('should return 0 for empty sessions', () => {
      expect(getLongestStreak([])).toBe(0);
    });

    it('should return 1 for a single session', () => {
      const sessions = [createSession('2024-06-15')];
      expect(getLongestStreak(sessions)).toBe(1);
    });

    it('should find the longest streak in history', () => {
      const sessions = [
        // First streak: 3 days
        createSession('2024-06-01'),
        createSession('2024-06-02'),
        createSession('2024-06-03'),
        // Gap
        // Second streak: 5 days
        createSession('2024-06-10'),
        createSession('2024-06-11'),
        createSession('2024-06-12'),
        createSession('2024-06-13'),
        createSession('2024-06-14')
      ];
      expect(getLongestStreak(sessions)).toBe(5);
    });

    it('should handle non-consecutive sessions', () => {
      const sessions = [
        createSession('2024-06-01'),
        createSession('2024-06-03'),
        createSession('2024-06-05')
      ];
      expect(getLongestStreak(sessions)).toBe(1);
    });
  });

  describe('getSessionsForDate', () => {
    it('should return sessions for a specific date', () => {
      const sessions = [
        createSession('2024-06-15'),
        createSession('2024-06-15'),
        createSession('2024-06-14')
      ];
      const result = getSessionsForDate(sessions, '2024-06-15');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for date with no sessions', () => {
      const sessions = [createSession('2024-06-15')];
      const result = getSessionsForDate(sessions, '2024-06-14');
      expect(result).toHaveLength(0);
    });
  });

  describe('timeToSeconds', () => {
    it('should convert hours, minutes, seconds to total seconds', () => {
      expect(timeToSeconds({ hours: 1, minutes: 30, seconds: 45 })).toBe(5445);
    });

    it('should handle zero values', () => {
      expect(timeToSeconds({ hours: 0, minutes: 0, seconds: 0 })).toBe(0);
    });

    it('should handle partial input', () => {
      expect(timeToSeconds({ minutes: 10 })).toBe(600);
    });
  });

  describe('secondsToTime', () => {
    it('should convert seconds to hours, minutes, seconds object', () => {
      expect(secondsToTime(5445)).toEqual({ hours: 1, minutes: 30, seconds: 45 });
    });

    it('should handle zero', () => {
      expect(secondsToTime(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    });

    it('should handle values under a minute', () => {
      expect(secondsToTime(45)).toEqual({ hours: 0, minutes: 0, seconds: 45 });
    });
  });

  describe('formatTimeDisplay', () => {
    it('should format as MM:SS by default', () => {
      expect(formatTimeDisplay(65)).toBe('01:05');
    });

    it('should show hours when time >= 1 hour', () => {
      expect(formatTimeDisplay(3665)).toBe('01:01:05');
    });

    it('should force hours display when requested', () => {
      expect(formatTimeDisplay(65, true)).toBe('00:01:05');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only', () => {
      expect(formatDuration(600)).toBe('10 min');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(5400)).toBe('1h 30min');
    });

    it('should format hours only when no minutes', () => {
      expect(formatDuration(7200)).toBe('2h');
    });
  });

  describe('getTotalMeditationTime', () => {
    it('should sum all session durations', () => {
      const sessions = [
        createSession('2024-06-15', 600),
        createSession('2024-06-14', 900),
        createSession('2024-06-13', 300)
      ];
      expect(getTotalMeditationTime(sessions)).toBe(1800);
    });

    it('should return 0 for empty sessions', () => {
      expect(getTotalMeditationTime([])).toBe(0);
    });
  });

  describe('isDateFuture', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for future dates', () => {
      expect(isDateFuture('2024-06-16')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isDateFuture('2024-06-15')).toBe(false);
    });

    it('should return false for past dates', () => {
      expect(isDateFuture('2024-06-14')).toBe(false);
    });
  });

  describe('isDateToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for today', () => {
      expect(isDateToday('2024-06-15')).toBe(true);
    });

    it('should return false for other dates', () => {
      expect(isDateToday('2024-06-14')).toBe(false);
      expect(isDateToday('2024-06-16')).toBe(false);
    });
  });
});
