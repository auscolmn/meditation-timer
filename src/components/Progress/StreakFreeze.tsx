import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getTodayString, formatDateString } from '../../utils/dateUtils';
import styles from './StreakFreeze.module.css';

// Snowflake icon
const SnowflakeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
    <line x1="12" y1="2" x2="9" y2="5"/>
    <line x1="12" y1="2" x2="15" y2="5"/>
    <line x1="12" y1="22" x2="9" y2="19"/>
    <line x1="12" y1="22" x2="15" y2="19"/>
    <line x1="2" y1="12" x2="5" y2="9"/>
    <line x1="2" y1="12" x2="5" y2="15"/>
    <line x1="22" y1="12" x2="19" y2="9"/>
    <line x1="22" y1="12" x2="19" y2="15"/>
  </svg>
);

function StreakFreeze() {
  const { settings, sessions, useFreeze, grantMonthlyFreezes } = useApp();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [freezeUsed, setFreezeUsed] = useState(false);

  const freezesAvailable = settings.freezesAvailable ?? 0;

  // Grant monthly freezes on component mount
  useEffect(() => {
    grantMonthlyFreezes();
  }, [grantMonthlyFreezes]);

  // Check if yesterday has a session
  const today = getTodayString();
  const yesterday = formatDateString(new Date(Date.now() - 86400000));
  const hasYesterdaySession = sessions.some(s => s.date === yesterday);
  const hasTodaySession = sessions.some(s => s.date === today);

  // User can use a freeze if:
  // 1. They have freezes available
  // 2. Yesterday has no session
  // 3. They haven't already used a freeze just now
  const canUseFreeze = freezesAvailable > 0 && !hasYesterdaySession && !freezeUsed;

  // Show the "at risk" message if yesterday has no session and today has no session
  const streakAtRisk = !hasYesterdaySession && !hasTodaySession;

  // Handle using a freeze
  const handleUseFreeze = () => {
    const success = useFreeze();
    if (success) {
      setFreezeUsed(true);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Freezes available display */}
      <div className={styles.freezeCount}>
        <SnowflakeIcon />
        <span className={styles.freezeLabel}>
          {freezesAvailable} freeze{freezesAvailable !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Streak at risk warning */}
      {streakAtRisk && canUseFreeze && (
        <div className={styles.warning}>
          <p className={styles.warningText}>
            Your streak is at risk! Use a freeze to protect it.
          </p>
          <button
            className={`btn btn--secondary ${styles.freezeButton}`}
            onClick={() => setShowConfirmModal(true)}
          >
            <SnowflakeIcon />
            Use Freeze
          </button>
        </div>
      )}

      {/* Freeze used success message */}
      {freezeUsed && (
        <div className={styles.success}>
          <SnowflakeIcon />
          <span>Freeze applied! Your streak is protected.</span>
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowConfirmModal(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="freeze-modal-title"
          >
            <h2 id="freeze-modal-title" className="modal-title">
              Use Streak Freeze?
            </h2>
            <p>
              This will count yesterday as a meditation day, protecting your streak.
              You have {freezesAvailable} freeze{freezesAvailable !== 1 ? 's' : ''} remaining.
            </p>
            <p className={styles.freezeNote}>
              Freezes are granted monthly (2 per month).
            </p>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={handleUseFreeze}
              >
                Use Freeze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StreakFreeze;
