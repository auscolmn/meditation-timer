import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStreak } from '../useStreak';
import type { Session, StreakFreeze } from '../../types';

// Helper to create sessions
const createSession = (date: string): Session => ({
  id: `session-${date}`,
  date,
  timestamp: new Date(date).toISOString(),
  duration: 600,
  completed: true,
  endedEarly: false
});

// Helper to create freeze
const createFreeze = (date: string): StreakFreeze => ({
  id: `freeze-${date}`,
  date,
  createdAt: new Date().toISOString()
});

describe('useStreak with freezes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should maintain streak when freeze covers a gap', () => {
    // Sessions on days 0, 2, 3 (gap on day 1)
    // Freeze covers day 1
    const sessions: Session[] = [
      createSession('2024-06-15'), // today
      createSession('2024-06-13'), // 2 days ago
      createSession('2024-06-12'), // 3 days ago
    ];

    const freezes: StreakFreeze[] = [
      createFreeze('2024-06-14'), // yesterday - frozen
    ];

    const { result } = renderHook(() => useStreak(sessions, freezes));

    // Streak should be 4 (today + frozen yesterday + 2 more days)
    expect(result.current.currentStreak).toBe(4);
  });

  it('should count streak without freezes normally', () => {
    const sessions: Session[] = [
      createSession('2024-06-15'), // today
      createSession('2024-06-14'), // yesterday
      createSession('2024-06-13'), // 2 days ago
    ];

    const { result } = renderHook(() => useStreak(sessions, []));

    expect(result.current.currentStreak).toBe(3);
  });

  it('should break streak if gap exists without freeze', () => {
    const sessions: Session[] = [
      createSession('2024-06-15'), // today
      createSession('2024-06-13'), // 2 days ago (gap on 14th)
    ];

    const { result } = renderHook(() => useStreak(sessions, []));

    // Streak should only be 1 (just today)
    expect(result.current.currentStreak).toBe(1);
  });

  it('should handle multiple freezes in a row', () => {
    const sessions: Session[] = [
      createSession('2024-06-15'), // today
      createSession('2024-06-11'), // 4 days ago
    ];

    const freezes: StreakFreeze[] = [
      createFreeze('2024-06-14'),
      createFreeze('2024-06-13'),
      createFreeze('2024-06-12'),
    ];

    const { result } = renderHook(() => useStreak(sessions, freezes));

    // Streak should be 5 (today + 3 frozen days + 1 session day)
    expect(result.current.currentStreak).toBe(5);
  });

  it('should return 0 streak if no recent activity and no freeze for yesterday', () => {
    const sessions: Session[] = [
      createSession('2024-06-10'), // 5 days ago
    ];

    const { result } = renderHook(() => useStreak(sessions, []));

    expect(result.current.currentStreak).toBe(0);
  });

  it('should start streak from yesterday if frozen', () => {
    // No session today, but yesterday is frozen, and day before has session
    const sessions: Session[] = [
      createSession('2024-06-13'), // 2 days ago
      createSession('2024-06-12'), // 3 days ago
    ];

    const freezes: StreakFreeze[] = [
      createFreeze('2024-06-14'), // yesterday frozen
    ];

    const { result } = renderHook(() => useStreak(sessions, freezes));

    // Streak should be 3 (frozen yesterday + 2 session days)
    expect(result.current.currentStreak).toBe(3);
  });

  it('should handle freeze on today', () => {
    const sessions: Session[] = [
      createSession('2024-06-14'), // yesterday
      createSession('2024-06-13'), // 2 days ago
    ];

    const freezes: StreakFreeze[] = [
      createFreeze('2024-06-15'), // today frozen
    ];

    const { result } = renderHook(() => useStreak(sessions, freezes));

    // Streak should be 3 (frozen today + 2 session days)
    expect(result.current.currentStreak).toBe(3);
  });

  it('should not count freeze without adjacent sessions', () => {
    const sessions: Session[] = [
      createSession('2024-06-15'), // today
      createSession('2024-06-10'), // 5 days ago
    ];

    const freezes: StreakFreeze[] = [
      createFreeze('2024-06-12'), // random freeze in the middle
    ];

    const { result } = renderHook(() => useStreak(sessions, freezes));

    // Streak should only be 1 (just today, freeze doesn't bridge the gap)
    expect(result.current.currentStreak).toBe(1);
  });
});

describe('calculateStreak edge cases with freezes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle empty sessions with freeze', () => {
    const { result } = renderHook(() => useStreak([], [createFreeze('2024-06-14')]));

    // Empty sessions should return 0 streak regardless of freezes
    expect(result.current.currentStreak).toBe(0);
  });

  it('should handle duplicate freezes for same date', () => {
    const sessions: Session[] = [
      createSession('2024-06-15'),
      createSession('2024-06-13'),
    ];

    const freezes: StreakFreeze[] = [
      createFreeze('2024-06-14'),
      createFreeze('2024-06-14'), // duplicate
    ];

    const { result } = renderHook(() => useStreak(sessions, freezes));

    // Should handle duplicates gracefully
    expect(result.current.currentStreak).toBe(3);
  });
});
