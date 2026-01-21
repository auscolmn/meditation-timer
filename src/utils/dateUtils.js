import {
  format,
  parseISO,
  startOfDay,
  subDays,
  addDays,
  isSameDay,
  isToday,
  isFuture,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  differenceInDays
} from 'date-fns';

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Date string
 */
export function getTodayString() {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateString(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a YYYY-MM-DD string to Date
 * @param {string} dateString - Date string
 * @returns {Date} Parsed date
 */
export function parseDateString(dateString) {
  return parseISO(dateString);
}

/**
 * Calculate current streak from sessions
 * @param {Array} sessions - Array of session objects with date field
 * @returns {number} Current streak count
 */
export function calculateStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  // Get unique dates (ignore multiple sessions per day)
  const uniqueDates = [...new Set(sessions.map(s => s.date))];

  // Sort dates in descending order (newest first)
  uniqueDates.sort((a, b) => b.localeCompare(a));

  const today = getTodayString();
  const yesterday = formatDateString(subDays(new Date(), 1));

  // Check if most recent session is today or yesterday
  const mostRecent = uniqueDates[0];

  if (mostRecent !== today && mostRecent !== yesterday) {
    // Streak is broken - no session today or yesterday
    return 0;
  }

  // Count consecutive days
  let streak = 0;
  let checkDate = mostRecent === today ? new Date() : subDays(new Date(), 1);

  for (const dateStr of uniqueDates) {
    const expectedDate = formatDateString(checkDate);

    if (dateStr === expectedDate) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else if (dateStr < expectedDate) {
      // Gap found, streak ends
      break;
    }
    // Skip if date is ahead (shouldn't happen with sorted array)
  }

  return streak;
}

/**
 * Get the longest streak ever achieved
 * @param {Array} sessions - Array of session objects
 * @returns {number} Longest streak count
 */
export function getLongestStreak(sessions) {
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
 * @param {Array} sessions - Array of session objects
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Array} Sessions for that date
 */
export function getSessionsForDate(sessions, dateString) {
  return sessions.filter(s => s.date === dateString);
}

/**
 * Get sessions for a specific month
 * @param {Array} sessions - Array of session objects
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {Object} Map of date strings to session arrays
 */
export function getSessionsForMonth(sessions, year, month) {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const startStr = formatDateString(start);
  const endStr = formatDateString(end);

  const result = {};
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
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {Array} Array of week arrays, each containing day objects
 */
export function generateCalendarMonth(year, month) {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start, end });

  // Pad the beginning with null for days before the first of month
  const firstDayOfWeek = getDay(start); // 0 = Sunday
  const paddedDays = Array(firstDayOfWeek).fill(null).concat(days);

  // Split into weeks
  const weeks = [];
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
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean}
 */
export function isDateFuture(dateString) {
  return isFuture(startOfDay(parseDateString(dateString)));
}

/**
 * Check if a date is today
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean}
 */
export function isDateToday(dateString) {
  return isToday(parseDateString(dateString));
}

/**
 * Format time display (seconds to HH:MM:SS or MM:SS)
 * @param {number} totalSeconds - Total seconds
 * @param {boolean} forceHours - Always show hours
 * @returns {string} Formatted time string
 */
export function formatTimeDisplay(totalSeconds, forceHours = false) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => n.toString().padStart(2, '0');

  if (hours > 0 || forceHours) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Convert hours, minutes, seconds to total seconds
 * @param {Object} time - { hours, minutes, seconds }
 * @returns {number} Total seconds
 */
export function timeToSeconds({ hours = 0, minutes = 0, seconds = 0 }) {
  return (hours * 3600) + (minutes * 60) + seconds;
}

/**
 * Convert total seconds to { hours, minutes, seconds }
 * @param {number} totalSeconds - Total seconds
 * @returns {Object} { hours, minutes, seconds }
 */
export function secondsToTime(totalSeconds) {
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

/**
 * Format duration for display (e.g., "10 min" or "1h 30min")
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  return `${minutes} min`;
}

/**
 * Get total meditation time from sessions
 * @param {Array} sessions - Array of session objects
 * @returns {number} Total seconds
 */
export function getTotalMeditationTime(sessions) {
  return sessions.reduce((total, s) => total + (s.duration || 0), 0);
}

/**
 * Format a timestamp for display
 * @param {string} isoString - ISO timestamp string
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
export function formatSessionTime(isoString) {
  return format(parseISO(isoString), 'h:mm a');
}

/**
 * Format month and year for calendar header
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {string} Formatted string (e.g., "January 2024")
 */
export function formatMonthYear(year, month) {
  return format(new Date(year, month), 'MMMM yyyy');
}
