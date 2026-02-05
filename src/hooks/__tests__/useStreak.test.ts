import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStreak } from '../useStreak';
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

describe('useStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return zero stats for empty sessions', () => {
    const { result } = renderHook(() => useStreak([]));

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(0);
    expect(result.current.totalSessions).toBe(0);
    expect(result.current.totalTime).toBe(0);
  });

  it('should calculate current streak correctly', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    const sessions = [
      createSession('2024-06-15', 600),
      createSession('2024-06-14', 900),
      createSession('2024-06-13', 300)
    ];

    const { result } = renderHook(() => useStreak(sessions));

    expect(result.current.currentStreak).toBe(3);
  });

  it('should calculate longest streak correctly', () => {
    vi.setSystemTime(new Date('2024-06-20'));
    const sessions = [
      // Old streak of 5
      createSession('2024-06-01', 600),
      createSession('2024-06-02', 600),
      createSession('2024-06-03', 600),
      createSession('2024-06-04', 600),
      createSession('2024-06-05', 600),
      // Current streak of 2
      createSession('2024-06-19', 600),
      createSession('2024-06-20', 600)
    ];

    const { result } = renderHook(() => useStreak(sessions));

    expect(result.current.currentStreak).toBe(2);
    expect(result.current.longestStreak).toBe(5);
  });

  it('should calculate total sessions and time', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    const sessions = [
      createSession('2024-06-15', 600),
      createSession('2024-06-14', 900),
      createSession('2024-06-13', 300)
    ];

    const { result } = renderHook(() => useStreak(sessions));

    expect(result.current.totalSessions).toBe(3);
    expect(result.current.totalTime).toBe(1800); // 600 + 900 + 300
  });

  it('should identify completed goals', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    // Create a 10-day streak
    const sessions: Session[] = [];
    for (let i = 0; i < 10; i++) {
      const date = `2024-06-${String(15 - i).padStart(2, '0')}`;
      sessions.push(createSession(date, 600));
    }

    const { result } = renderHook(() => useStreak(sessions));

    expect(result.current.currentStreak).toBe(10);
    expect(result.current.completedGoals.length).toBe(3); // 3 days, 7 days, 10 days
    expect(result.current.completedGoals.map(g => g.days)).toEqual([3, 7, 10]);
  });

  it('should identify next goal', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    // Create a 5-day streak
    const sessions: Session[] = [];
    for (let i = 0; i < 5; i++) {
      const date = `2024-06-${String(15 - i).padStart(2, '0')}`;
      sessions.push(createSession(date, 600));
    }

    const { result } = renderHook(() => useStreak(sessions));

    expect(result.current.nextGoal?.days).toBe(7);
    expect(result.current.daysToNextGoal).toBe(2);
  });

  it('should calculate progress percentage', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    // Create a 5-day streak (between 3-day and 7-day goals)
    const sessions: Session[] = [];
    for (let i = 0; i < 5; i++) {
      const date = `2024-06-${String(15 - i).padStart(2, '0')}`;
      sessions.push(createSession(date, 600));
    }

    const { result } = renderHook(() => useStreak(sessions));

    // Progress from 3 to 7: (5-3)/(7-3) = 2/4 = 50%
    expect(result.current.progressPercent).toBe(50);
  });

  it('should handle all goals completed', () => {
    vi.setSystemTime(new Date('2025-12-15'));
    // Create a 400-day streak (beyond all goals)
    // Use a proper date calculation to ensure consecutive days
    const sessions: Session[] = [];
    const startDate = new Date('2025-12-15');
    for (let i = 0; i < 400; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      sessions.push(createSession(dateStr, 600));
    }

    const { result } = renderHook(() => useStreak(sessions));

    expect(result.current.currentStreak).toBe(400);
    expect(result.current.allGoalsCompleted).toBe(true);
    expect(result.current.nextGoal).toBeNull();
    expect(result.current.progressPercent).toBe(100);
  });

  it('should include freezes in streak calculation', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    const sessions = [
      createSession('2024-06-15', 600),
      // Gap on 14th (frozen)
      createSession('2024-06-13', 600)
    ];
    const freezes: StreakFreeze[] = [
      { id: '1', date: '2024-06-14', createdAt: new Date().toISOString() }
    ];

    const { result } = renderHook(() => useStreak(sessions, freezes));

    expect(result.current.currentStreak).toBe(3);
  });
});
