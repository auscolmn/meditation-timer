import { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useStreak } from '../../hooks/useStreak';
import { formatDuration } from '../../utils/dateUtils';
import type { Session } from '../../types';
import styles from './Completion.module.css';

interface CompletionProps {
  session: Session | null;
  onViewProgress: () => void;
  onMeditateAgain: () => void;
}

function Completion({ session, onMeditateAgain }: CompletionProps) {
  const { sessions, streakFreezes, settings, getDailyQuote } = useApp();
  const streakData = useStreak(sessions, streakFreezes);
  const [showAnimation, setShowAnimation] = useState(true);

  // Get quote for minimal mode (memoized to stay stable)
  const quote = useMemo(() => getDailyQuote(), [getDailyQuote]);

  // Check if a new goal was just achieved
  const goalJustAchieved = streakData.completedGoals.find(
    goal => goal.days === streakData.currentStreak
  );

  // Hide animation after it plays
  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Minimal completion screen - show only quote
  if (settings.minimalCompletionScreen) {
    return (
      <div className={`screen screen--centered ${styles.container} ${styles.minimalContainer}`}>
        {quote && (
          <div className={styles.quoteBlock}>
            <p className={styles.quoteText}>"{quote.text}"</p>
            <p className={styles.quoteAuthor}>— {quote.author}</p>
          </div>
        )}
        <button
          className={`btn btn--primary btn--large ${styles.continueBtn}`}
          onClick={onMeditateAgain}
        >
          Continue
        </button>
      </div>
    );
  }


  return (
    <div className={`screen screen--centered ${styles.container}`}>
      {/* Animated completion circle */}
      <div className={`${styles.completionCircle} ${showAnimation ? styles.animating : ''}`}>
        <svg viewBox="0 0 100 100" className={styles.circleSvg}>
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--success)"
            strokeWidth="8"
            strokeLinecap="round"
            className={styles.progressCircle}
            strokeDasharray="283"
            strokeDashoffset={showAnimation ? "283" : "0"}
          />
        </svg>
        <div className={styles.checkmark}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>

      {/* Session info */}
      {session && (
        <p className={styles.sessionInfo}>
          {formatDuration(session.duration)} meditation {session.endedEarly ? '(ended early)' : 'completed'}
        </p>
      )}

      {/* Streak info - simple text */}
      {streakData.currentStreak > 0 && (
        <p className={styles.streakText}>
          {streakData.currentStreak} day streak
          {goalJustAchieved && <span className={styles.goalAchieved}> — {goalJustAchieved.label} achieved</span>}
        </p>
      )}


      {/* Single continue button */}
      <button
        className={`btn btn--primary btn--large ${styles.continueBtn}`}
        onClick={onMeditateAgain}
      >
        Continue
      </button>
    </div>
  );
}

export default Completion;
