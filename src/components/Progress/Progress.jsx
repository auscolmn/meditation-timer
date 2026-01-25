import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useStreak } from '../../hooks/useStreak';
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
import styles from './Progress.module.css';

// Chevron icon for expandable sections
const ChevronIcon = ({ expanded }) => (
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
  const { sessions, deleteSession, addManualSession } = useApp();
  const streakData = useStreak(sessions);

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
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionDuration, setNewSessionDuration] = useState(10);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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
  const handleDayClick = (date) => {
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
  const handleDeleteSession = (sessionId) => {
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
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) setDeleteConfirmId(null);
        else if (selectedDate) setSelectedDate(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteConfirmId, selectedDate]);

  // Get sessions for selected date
  const selectedDateSessions = selectedDate
    ? sessions.filter(s => s.date === selectedDate)
    : [];

  return (
    <div className="screen">
      {/* Stats Section */}
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
                const isToday = isDateToday(dateStr);
                const isFuture = isDateFuture(dateStr);

                return (
                  <button
                    key={dateStr}
                    className={`${styles.day} ${isToday ? styles.today : ''} ${isFuture ? styles.future : ''}`}
                    onClick={() => handleDayClick(date)}
                    disabled={isFuture}
                  >
                    <span className={styles.dayNumber}>{date.getDate()}</span>
                    {sessionCount > 0 && (
                      <div className={styles.sessionDots}>
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

      {/* Streak & Goals Section */}
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
                  <span className={styles.goalBadge}>{goal.badge}</span>
                  <span className={styles.goalLabel}>{goal.label}</span>
                  {isCompleted && (
                    <span className={styles.goalCheck}>✓</span>
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
      </div>

      {/* Date Detail Modal */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)} role="presentation">
          <div
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

            {selectedDateSessions.length === 0 ? (
              <p className="text-secondary">No sessions on this date</p>
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
                    onChange={(e) => setNewSessionDuration(parseInt(e.target.value) || 0)}
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
