import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWeeklyData,
  getMonthlyTrend,
  getTimeOfDayDistribution,
  getDurationDistribution,
  getOverallStats
} from '../statsUtils';
import type { Session } from '../../types';

// Helper to create session with specific date and time
const createSession = (date: string, hour: number = 12, durationMinutes: number = 10): Session => {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return {
    id: `session-${date}-${hour}`,
    date,
    timestamp: d.toISOString(),
    duration: durationMinutes * 60,
    completed: true,
    endedEarly: false
  };
};

describe('getWeeklyData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set to a Wednesday
    vi.setSystemTime(new Date('2024-06-12T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return data for all 7 days of the week', () => {
    const result = getWeeklyData([]);

    expect(result).toHaveLength(7);
    expect(result[0].day).toBe('Sun');
    expect(result[6].day).toBe('Sat');
  });

  it('should count sessions and minutes correctly', () => {
    // Create sessions for the current week
    // With mock date 2024-06-12 (Wednesday), week is Sun 6/9 - Sat 6/15
    const sessions: Session[] = [
      createSession('2024-06-12', 10, 15), // Wednesday - 15 min
      createSession('2024-06-11', 8, 10),  // Tuesday - 10 min
    ];

    const result = getWeeklyData(sessions);

    // Find Wednesday and Tuesday
    const wednesday = result.find(d => d.day === 'Wed');
    const tuesday = result.find(d => d.day === 'Tue');

    expect(wednesday?.sessions).toBe(1);
    expect(wednesday?.minutes).toBe(15);
    expect(tuesday?.sessions).toBe(1);
    expect(tuesday?.minutes).toBe(10);
  });

  it('should handle multiple sessions on same day', () => {
    // Test with a more controlled scenario
    const today = '2024-06-12';
    const sessions: Session[] = [
      createSession(today, 8, 10),
      createSession(today, 12, 15),
      createSession(today, 18, 20),
    ];

    const result = getWeeklyData(sessions);
    const wednesday = result.find(d => d.day === 'Wed');

    expect(wednesday?.sessions).toBe(3);
    expect(wednesday?.minutes).toBe(45);
  });

  it('should return zeros for days without sessions', () => {
    const result = getWeeklyData([]);

    result.forEach(day => {
      expect(day.sessions).toBe(0);
      expect(day.minutes).toBe(0);
    });
  });
});

describe('getMonthlyTrend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return data for 4 weeks', () => {
    const result = getMonthlyTrend([]);

    expect(result).toHaveLength(4);
  });

  it('should aggregate minutes by week', () => {
    const sessions: Session[] = [
      createSession('2024-06-14', 10, 30), // This week
      createSession('2024-06-13', 10, 20), // This week
      createSession('2024-06-07', 10, 15), // Last week
    ];

    const result = getMonthlyTrend(sessions);

    // Most recent week should be last in array
    expect(result[result.length - 1].minutes).toBe(50);
  });

  it('should format week labels as MM/DD', () => {
    const result = getMonthlyTrend([]);

    result.forEach(week => {
      expect(week.week).toMatch(/^\d{1,2}\/\d{1,2}$/);
    });
  });
});

describe('getTimeOfDayDistribution', () => {
  it('should categorize sessions by time of day', () => {
    const sessions: Session[] = [
      createSession('2024-06-15', 6, 10),  // Morning (5-11)
      createSession('2024-06-15', 10, 10), // Morning
      createSession('2024-06-15', 14, 10), // Afternoon (12-16)
      createSession('2024-06-15', 18, 10), // Evening (17-20)
      createSession('2024-06-15', 22, 10), // Night (21-4)
      createSession('2024-06-15', 3, 10),  // Night
    ];

    const result = getTimeOfDayDistribution(sessions);

    const morning = result.find(d => d.period === 'Morning');
    const afternoon = result.find(d => d.period === 'Afternoon');
    const evening = result.find(d => d.period === 'Evening');
    const night = result.find(d => d.period === 'Night');

    expect(morning?.count).toBe(2);
    expect(afternoon?.count).toBe(1);
    expect(evening?.count).toBe(1);
    expect(night?.count).toBe(2);
  });

  it('should return all four periods even with no sessions', () => {
    const result = getTimeOfDayDistribution([]);

    expect(result).toHaveLength(4);
    expect(result.map(d => d.period)).toEqual(['Morning', 'Afternoon', 'Evening', 'Night']);
    result.forEach(d => expect(d.count).toBe(0));
  });

  it('should handle sessions without timestamp', () => {
    const sessions: Session[] = [
      {
        id: '1',
        date: '2024-06-15',
        timestamp: '', // empty timestamp
        duration: 600,
        completed: true,
        endedEarly: false
      }
    ];

    const result = getTimeOfDayDistribution(sessions);

    // Should not crash and should have 0 for all periods
    const total = result.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(0);
  });
});

describe('getDurationDistribution', () => {
  it('should categorize sessions by duration', () => {
    const sessions: Session[] = [
      createSession('2024-06-15', 10, 3),  // < 5 min
      createSession('2024-06-15', 11, 7),  // 5-10 min
      createSession('2024-06-15', 12, 15), // 10-20 min
      createSession('2024-06-15', 13, 25), // 20-30 min
      createSession('2024-06-15', 14, 45), // 30+ min
    ];

    const result = getDurationDistribution(sessions);

    expect(result.find(d => d.range === '< 5 min')?.count).toBe(1);
    expect(result.find(d => d.range === '5-10 min')?.count).toBe(1);
    expect(result.find(d => d.range === '10-20 min')?.count).toBe(1);
    expect(result.find(d => d.range === '20-30 min')?.count).toBe(1);
    expect(result.find(d => d.range === '30+ min')?.count).toBe(1);
  });

  it('should handle edge cases at boundaries', () => {
    const sessions: Session[] = [
      createSession('2024-06-15', 10, 5),  // exactly 5 min -> 5-10 bin
      createSession('2024-06-15', 11, 10), // exactly 10 min -> 10-20 bin
      createSession('2024-06-15', 12, 20), // exactly 20 min -> 20-30 bin
      createSession('2024-06-15', 13, 30), // exactly 30 min -> 30+ bin
    ];

    const result = getDurationDistribution(sessions);

    expect(result.find(d => d.range === '< 5 min')?.count).toBe(0);
    expect(result.find(d => d.range === '5-10 min')?.count).toBe(1);
    expect(result.find(d => d.range === '10-20 min')?.count).toBe(1);
    expect(result.find(d => d.range === '20-30 min')?.count).toBe(1);
    expect(result.find(d => d.range === '30+ min')?.count).toBe(1);
  });

  it('should return all ranges with zero counts for empty sessions', () => {
    const result = getDurationDistribution([]);

    expect(result).toHaveLength(5);
    result.forEach(d => expect(d.count).toBe(0));
  });
});

describe('getOverallStats', () => {
  it('should calculate overall statistics', () => {
    const sessions: Session[] = [
      createSession('2024-06-15', 10, 10),
      createSession('2024-06-14', 10, 20),
      createSession('2024-06-13', 10, 30),
    ];

    const result = getOverallStats(sessions);

    expect(result.totalSessions).toBe(3);
    expect(result.totalMinutes).toBe(60);
    expect(result.averageMinutes).toBe(20);
    expect(result.longestSession).toBe(30);
  });

  it('should return zeros for empty sessions', () => {
    const result = getOverallStats([]);

    expect(result.totalSessions).toBe(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.averageMinutes).toBe(0);
    expect(result.longestSession).toBe(0);
  });

  it('should handle single session', () => {
    const sessions: Session[] = [
      createSession('2024-06-15', 10, 15),
    ];

    const result = getOverallStats(sessions);

    expect(result.totalSessions).toBe(1);
    expect(result.totalMinutes).toBe(15);
    expect(result.averageMinutes).toBe(15);
    expect(result.longestSession).toBe(15);
  });
});
