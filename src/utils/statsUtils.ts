import type { Session } from '../types';

interface DailyData {
  day: string;
  sessions: number;
  minutes: number;
}

interface WeeklyData {
  week: string;
  minutes: number;
}

interface TimeOfDayData {
  period: string;
  count: number;
}

interface DurationData {
  range: string;
  count: number;
}

/**
 * Get the start of the week (Sunday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a date as a short day name (Mon, Tue, etc.)
 */
function getShortDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format a date as YYYY-MM-DD in local timezone
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get weekly data for the current week (sessions and minutes per day)
 */
export function getWeeklyData(sessions: Session[]): DailyData[] {
  const today = new Date();
  const weekStart = getWeekStart(today);

  const days: DailyData[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = formatLocalDate(date);

    const daySessions = sessions.filter(s => s.date === dateStr);
    const totalMinutes = daySessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);

    days.push({
      day: getShortDayName(date),
      sessions: daySessions.length,
      minutes: totalMinutes
    });
  }

  return days;
}

/**
 * Get monthly trend data (minutes per week for the past 4 weeks)
 */
export function getMonthlyTrend(sessions: Session[]): WeeklyData[] {
  const weeks: WeeklyData[] = [];
  const today = new Date();

  for (let i = 3; i >= 0; i--) {
    const weekStart = getWeekStart(today);
    weekStart.setDate(weekStart.getDate() - (i * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });

    const totalMinutes = weekSessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);

    // Format as "MM/DD" for the week start
    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

    weeks.push({
      week: weekLabel,
      minutes: totalMinutes
    });
  }

  return weeks;
}

/**
 * Get time of day distribution (Morning, Afternoon, Evening, Night)
 */
export function getTimeOfDayDistribution(sessions: Session[]): TimeOfDayData[] {
  const periods: Record<string, number> = {
    'Morning': 0,    // 5:00 - 11:59
    'Afternoon': 0,  // 12:00 - 16:59
    'Evening': 0,    // 17:00 - 20:59
    'Night': 0       // 21:00 - 4:59
  };

  sessions.forEach(session => {
    if (!session.timestamp) return;

    const date = new Date(session.timestamp);
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) {
      periods['Morning']++;
    } else if (hour >= 12 && hour < 17) {
      periods['Afternoon']++;
    } else if (hour >= 17 && hour < 21) {
      periods['Evening']++;
    } else {
      periods['Night']++;
    }
  });

  return Object.entries(periods).map(([period, count]) => ({
    period,
    count
  }));
}

/**
 * Get duration distribution (session length ranges)
 */
export function getDurationDistribution(sessions: Session[]): DurationData[] {
  const ranges: Record<string, number> = {
    '< 5 min': 0,
    '5-10 min': 0,
    '10-20 min': 0,
    '20-30 min': 0,
    '30+ min': 0
  };

  sessions.forEach(session => {
    const minutes = session.duration / 60;

    if (minutes < 5) {
      ranges['< 5 min']++;
    } else if (minutes < 10) {
      ranges['5-10 min']++;
    } else if (minutes < 20) {
      ranges['10-20 min']++;
    } else if (minutes < 30) {
      ranges['20-30 min']++;
    } else {
      ranges['30+ min']++;
    }
  });

  return Object.entries(ranges).map(([range, count]) => ({
    range,
    count
  }));
}

/**
 * Calculate total and average statistics
 */
export function getOverallStats(sessions: Session[]) {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      averageMinutes: 0,
      longestSession: 0
    };
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  const longestSession = Math.max(...sessions.map(s => Math.round(s.duration / 60)));

  return {
    totalSessions: sessions.length,
    totalMinutes,
    averageMinutes: Math.round(totalMinutes / sessions.length),
    longestSession
  };
}
