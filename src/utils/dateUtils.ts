import {
  format,
  parseISO,
  startOfDay,
  subDays,
  isToday,
  isFuture,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  differenceInDays
} from 'date-fns';
import type { Session, Duration, StreakFreeze } from '../types';

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a YYYY-MM-DD string to Date
 */
export function parseDateString(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Calculate current streak from sessions
 * @param sessions - Array of session objects with date field
 * @param freezes - Optional array of streak freezes
 */
export function calculateStreak(sessions: Session[], freezes: StreakFreeze[] = []): number {
  if (!sessions || sessions.length === 0) return 0;

  // Get unique dates (ignore multiple sessions per day)
  const uniqueDates = [...new Set(sessions.map(s => s.date))];

  // Get frozen dates
  const frozenDates = new Set(freezes.map(f => f.date));

  // Sort dates in descending order (newest first)
  uniqueDates.sort((a, b) => b.localeCompare(a));

  const today = getTodayString();
  const yesterday = formatDateString(subDays(new Date(), 1));

  // Check if most recent session is today or yesterday (or today/yesterday is frozen)
  const mostRecent = uniqueDates[0];
  const hasTodaySession = uniqueDates.includes(today) || frozenDates.has(today);
  const hasYesterdaySession = uniqueDates.includes(yesterday) || frozenDates.has(yesterday);

  if (mostRecent !== today && mostRecent !== yesterday && !hasTodaySession && !hasYesterdaySession) {
    // Streak is broken - no session today or yesterday
    return 0;
  }

  // Count consecutive days (including frozen days)
  let streak = 0;
  let checkDate = (mostRecent === today || frozenDates.has(today)) ? new Date() : subDays(new Date(), 1);

  // Create a set of all "valid" dates (sessions + freezes)
  const validDates = new Set([...uniqueDates, ...frozenDates]);

  while (true) {
    const expectedDate = formatDateString(checkDate);

    if (validDates.has(expectedDate)) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      // Gap found, streak ends
      break;
    }
  }

  return streak;
}

/**
 * Get the longest streak ever achieved
 */
export function getLongestStreak(sessions: Session[]): number {
  if (!sessions || sessions.length === 0) return 0;

  const uniqueDates = [...new Set(sessions.map(s => s.date))].sort();

  if (uniqueDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = parseDateString(uniqueDates[i - 1]);
    const currDate = parseDateString(uniqueDates[i]);
    const diff = differenceInDays(currDate, prevDate);

    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

/**
 * Get sessions for a specific date
 */
export function getSessionsForDate(sessions: Session[], dateString: string): Session[] {
  return sessions.filter(s => s.date === dateString);
}

/**
 * Get sessions for a specific month
 */
export function getSessionsForMonth(
  sessions: Session[],
  year: number,
  month: number
): Record<string, Session[]> {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const startStr = formatDateString(start);
  const endStr = formatDateString(end);

  const result: Record<string, Session[]> = {};
  sessions
    .filter(s => s.date >= startStr && s.date <= endStr)
    .forEach(s => {
      if (!result[s.date]) {
        result[s.date] = [];
      }
      result[s.date].push(s);
    });

  return result;
}

/**
 * Generate calendar data for a month
 */
export function generateCalendarMonth(year: number, month: number): (Date | null)[][] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start, end });

  // Pad the beginning with null for days before the first of month
  const firstDayOfWeek = getDay(start); // 0 = Sunday
  const paddedDays: (Date | null)[] = Array(firstDayOfWeek).fill(null).concat(days);

  // Split into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    const week = paddedDays.slice(i, i + 7);
    // Pad end of last week if needed
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  return weeks;
}

/**
 * Check if a date is in the future
 */
export function isDateFuture(dateString: string): boolean {
  return isFuture(startOfDay(parseDateString(dateString)));
}

/**
 * Check if a date is today
 */
export function isDateToday(dateString: string): boolean {
  return isToday(parseDateString(dateString));
}

/**
 * Format time display (seconds to HH:MM:SS or MM:SS)
 */
export function formatTimeDisplay(totalSeconds: number, forceHours: boolean = false): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0 || forceHours) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Convert hours, minutes, seconds to total seconds
 */
export function timeToSeconds({ hours = 0, minutes = 0, seconds = 0 }: Partial<Duration>): number {
  return (hours * 3600) + (minutes * 60) + seconds;
}

/**
 * Convert total seconds to { hours, minutes, seconds }
 */
export function secondsToTime(totalSeconds: number): Duration {
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

/**
 * Format duration for display (e.g., "10 min" or "1h 30min")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  return `${minutes} min`;
}

/**
 * Get total meditation time from sessions
 */
export function getTotalMeditationTime(sessions: Session[]): number {
  return sessions.reduce((total, s) => total + (s.duration || 0), 0);
}

/**
 * Format a timestamp for display
 */
export function formatSessionTime(isoString: string): string {
  return format(parseISO(isoString), 'h:mm a');
}

/**
 * Format month and year for calendar header
 */
export function formatMonthYear(year: number, month: number): string {
  return format(new Date(year, month), 'MMMM yyyy');
}
