import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { useStreak } from '../../hooks/useStreak';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  formatDuration,
  formatMonthYear,
  generateCalendarMonth,
  getSessionsForMonth,
  formatDateString,
  isDateToday,
  isDateFuture,
  formatSessionTime
} from '../../utils/dateUtils';
import { STREAK_GOALS } from '../../utils/constants';
import StreakFreeze from './StreakFreeze';
import Charts from './Charts';
import styles from './Progress.module.css';

// Badge SVG icons for streak goals
const BadgeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'star':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    case 'trophy':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
      );
    case 'gem':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12l4 6-10 13L2 9Z"/>
          <path d="M11 3 8 9l4 13 4-13-3-6"/>
          <path d="M2 9h20"/>
        </svg>
      );
    case 'crown':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
          <path d="M5 21h14"/>
        </svg>
      );
    default:
      return null;
  }
};

// Snowflake icon for frozen days
const SnowflakeIcon = () => (
  <svg className={styles.freezeIcon} xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
  </svg>
);

// Chevron icon for expandable sections
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`${styles.expandIcon} ${expanded ? styles.expanded : ''}`}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Day names for calendar header
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Progress() {
  const { sessions, deleteSession, addManualSession, streakFreezes, settings } = useApp();
  const streakData = useStreak(sessions, streakFreezes);

  // Hide stats/streak based on minimalism setting
  const hideStats = settings.hideStreakStats;

  // Create a set of frozen dates for quick lookup
  const frozenDates = useMemo(() => new Set(streakFreezes.map(f => f.date)), [streakFreezes]);

  // Calculate additional statistics (memoized)
  const { longestSession, averageSession } = useMemo(() => ({
    longestSession: sessions.length > 0
      ? Math.max(...sessions.map(s => s.duration || 0))
      : 0,
    averageSession: sessions.length > 0
      ? Math.round(streakData.totalTime / sessions.length)
      : 0
  }), [sessions, streakData.totalTime]);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionDuration, setNewSessionDuration] = useState(10);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Expandable sections
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  // Get calendar data
  const weeks = generateCalendarMonth(viewYear, viewMonth);
  const monthSessions = getSessionsForMonth(sessions, viewYear, viewMonth);

  // Navigation
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Handle day click
  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    const dateStr = formatDateString(date);
    if (isDateFuture(dateStr)) return;
    setSelectedDate(dateStr);
  };

  // Handle add manual session
  const handleAddSession = () => {
    if (selectedDate && newSessionDuration > 0) {
      addManualSession(selectedDate, newSessionDuration * 60);
      setShowAddSession(false);
      setNewSessionDuration(10);
    }
  };

  // Handle delete session
  const handleDeleteSession = (sessionId: string) => {
    setDeleteConfirmId(sessionId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteSession(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) setDeleteConfirmId(null);
        else if (selectedDate) setSelectedDate(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteConfirmId, selectedDate]);

  // Focus traps for modals
  const dateModalRef = useFocusTrap<HTMLDivElement>(!!selectedDate);
  const deleteModalRef = useFocusTrap<HTMLDivElement>(!!deleteConfirmId);

  // Get sessions for selected date
  const selectedDateSessions = selectedDate
    ? sessions.filter(s => s.date === selectedDate)
    : [];

  // Generate zen insight message for selected date
  const getInsightMessage = () => {
    if (!selectedDate || selectedDateSessions.length === 0) {
      return "A day of rest.";
    }

    const totalSeconds = selectedDateSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const sessionCount = selectedDateSessions.length;

    if (sessionCount === 1) {
      return `On this day, you found ${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''} of stillness.`;
    } else {
      return `You returned to stillness ${sessionCount} times, for ${totalMinutes} minutes total.`;
    }
  };

  return (
    <div className="screen">
      {/* Stats Section - hidden when hideStats is enabled */}
      {!hideStats && (
        <div className={`card mb-lg ${styles.statsSection}`}>
          <button
            type="button"
            className={styles.expandHeader}
            onClick={() => setStatsExpanded(!statsExpanded)}
            aria-expanded={statsExpanded}
          >
            <h2 className={styles.expandTitle}>Statistics</h2>
            <span className={styles.expandSummary}>
              {streakData.totalSessions} sessions · {formatDuration(streakData.totalTime)}
            </span>
            <ChevronIcon expanded={statsExpanded} />
          </button>

          {statsExpanded && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{streakData.currentStreak}</span>
                <span className={styles.statLabel}>Day Streak</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{streakData.longestStreak}</span>
                <span className={styles.statLabel}>Best Streak</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{streakData.totalSessions}</span>
                <span className={styles.statLabel}>Sessions</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{formatDuration(streakData.totalTime)}</span>
                <span className={styles.statLabel}>Total Time</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{formatDuration(longestSession)}</span>
                <span className={styles.statLabel}>Longest</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{formatDuration(averageSession)}</span>
                <span className={styles.statLabel}>Average</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className={`card mb-lg ${styles.animateDelay1}`}>
        <div className={styles.calendarHeader}>
          <button
            className="btn btn--icon btn--secondary"
            onClick={goToPrevMonth}
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className={styles.calendarTitle}>{formatMonthYear(viewYear, viewMonth)}</h2>
          <button
            className="btn btn--icon btn--secondary"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Day names */}
        <div className={styles.dayNames}>
          {DAY_NAMES.map(day => (
            <div key={day} className={styles.dayName}>{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className={styles.calendarGrid}>
          {weeks.map((week, weekIndex) => (
            <div key={`${viewYear}-${viewMonth}-week-${weekIndex}`} className={styles.week}>
              {week.map((date, dayIndex) => {
                if (!date) {
                  return <div key={`empty-${weekIndex}-${dayIndex}`} className={styles.dayEmpty} />;
                }

                const dateStr = formatDateString(date);
                const daySessions = monthSessions[dateStr] || [];
                const sessionCount = daySessions.length;
                const todayCheck = isDateToday(dateStr);
                const isFuture = isDateFuture(dateStr);
                const isFrozen = frozenDates.has(dateStr);

                const hasSession = sessionCount > 0;

                return (
                  <button
                    key={dateStr}
                    className={`${styles.day} ${todayCheck ? styles.today : ''} ${isFuture ? styles.future : ''} ${isFrozen ? styles.frozen : ''} ${hasSession ? styles.hasSession : ''}`}
                    onClick={() => handleDayClick(date)}
                    disabled={isFuture}
                  >
                    <span className={styles.dayNumber}>{date.getDate()}</span>
                    {isFrozen && sessionCount === 0 && (
                      <SnowflakeIcon />
                    )}
                    {sessionCount > 0 && (
                      <div className={styles.sessionDots}>
                        {isFrozen && <SnowflakeIcon />}
                        {sessionCount > 3 ? (
                          <span className={styles.dotMore}>3+</span>
                        ) : (
                          Array(sessionCount).fill(null).map((_, i) => (
                            <span key={i} className={styles.dot} />
                          ))
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Streak & Goals Section - hidden when hideStats is enabled */}
      {!hideStats && (
        <div className={`card mb-lg ${styles.animateDelay2}`}>
          {/* Current Streak - Always Visible */}
          <div className={styles.currentStreak}>
            <span className={styles.streakNumber}>{streakData.currentStreak}</span>
            <span className={styles.streakLabel}>day streak</span>
          </div>

          {/* Next Goal Progress - Always Visible */}
          {streakData.nextGoal && (
            <div className={styles.nextGoal}>
              <div className={styles.nextGoalHeader}>
                <span>Next: {streakData.nextGoal.label}</span>
                <span>{streakData.currentStreak}/{streakData.nextGoal.days} days</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${streakData.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Achievements - Expandable */}
          <button
            type="button"
            className={styles.expandHeader}
            onClick={() => setGoalsExpanded(!goalsExpanded)}
            aria-expanded={goalsExpanded}
          >
            <span className={styles.expandTitle}>Achievements</span>
            <span className={styles.expandSummary}>
              {streakData.completedGoals.length} of {STREAK_GOALS.length} completed
            </span>
            <ChevronIcon expanded={goalsExpanded} />
          </button>

          {goalsExpanded && (
            <div className={styles.goalsList}>
              {STREAK_GOALS.map(goal => {
                const isCompleted = streakData.currentStreak >= goal.days;
                const isCurrent = streakData.nextGoal?.days === goal.days;

                return (
                  <div
                    key={goal.days}
                    className={`${styles.goalItem} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`}
                  >
                    <span className={styles.goalBadge}><BadgeIcon type={goal.badge} /></span>
                    <span className={styles.goalLabel}>{goal.label}</span>
                    {isCompleted && (
                      <span className={styles.goalCheck}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </span>
                    )}
                    {isCurrent && (
                      <span className={styles.goalProgress}>
                        {streakData.currentStreak}/{goal.days}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Streak Freeze */}
          <StreakFreeze />

          {/* Charts */}
          <Charts />
        </div>
      )}

      {/* Date Detail Modal */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)} role="presentation">
          <div
            ref={dateModalRef}
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="date-modal-title"
          >
            <div className="modal-header">
              <h2 id="date-modal-title" className="modal-title">{selectedDate}</h2>
              <button
                className="btn btn--icon modal-close"
                onClick={() => setSelectedDate(null)}
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Zen insight message */}
            <p className={styles.insightMessage}>{getInsightMessage()}</p>

            {selectedDateSessions.length === 0 ? (
              <p className="text-secondary"></p>
            ) : (
              <div className={styles.sessionList}>
                {selectedDateSessions.map(session => (
                  <div key={session.id} className={styles.sessionItem}>
                    <div>
                      <p className={styles.sessionTime}>
                        {formatSessionTime(session.timestamp)}
                      </p>
                      <p className={styles.sessionDuration}>
                        {formatDuration(session.duration)}
                        {session.endedEarly && ' (ended early)'}
                        {session.manual && ' (manual)'}
                      </p>
                    </div>
                    <button
                      className="btn btn--icon btn--secondary"
                      onClick={() => handleDeleteSession(session.id)}
                      aria-label="Delete session"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showAddSession ? (
              <button
                className="btn btn--secondary btn--full mt-lg"
                onClick={() => setShowAddSession(true)}
              >
                + Add Session
              </button>
            ) : (
              <div className={styles.addSessionForm}>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input
                    type="number"
                    className="input"
                    value={newSessionDuration}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSessionDuration(parseInt(e.target.value) || 0)}
                    min="1"
                    max="1440"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    className="btn btn--secondary"
                    onClick={() => setShowAddSession(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={handleAddSession}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)} role="presentation">
          <div
            ref={deleteModalRef}
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <h2 id="delete-modal-title" className="modal-title">Delete Session?</h2>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Progress;
