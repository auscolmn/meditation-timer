import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useStreak } from '../../hooks/useStreak';
import { formatDuration } from '../../utils/dateUtils';
import { MOTIVATIONAL_MESSAGES } from '../../utils/constants';
import styles from './Completion.module.css';

function Completion({ session, onViewProgress, onMeditateAgain }) {
  const { sessions } = useApp();
  const streakData = useStreak(sessions);
  const [showAnimation, setShowAnimation] = useState(true);
  const [message] = useState(() =>
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  );

  // Check if a new goal was just achieved
  const [goalJustAchieved, setGoalJustAchieved] = useState(null);

  useEffect(() => {
    // Check if current streak matches a goal exactly (just achieved)
    const justAchieved = streakData.completedGoals.find(
      goal => goal.days === streakData.currentStreak
    );
    if (justAchieved) {
      setGoalJustAchieved(justAchieved);
    }
  }, [streakData.currentStreak, streakData.completedGoals]);

  // Hide animation after it plays
  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 1500);
    return () => clearTimeout(timer);
  }, []);

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
            stroke="var(--surface-variant)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--primary)"
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

      {/* Goal achievement celebration */}
      {goalJustAchieved && (
        <div className={styles.celebration}>
          <span className={styles.celebrationEmoji}>🎉</span>
          <p className={styles.celebrationText}>
            {goalJustAchieved.label} Streak Achieved!
          </p>
          <span className={styles.badge}>{goalJustAchieved.badge}</span>
        </div>
      )}

      {/* Streak display */}
      <div className={styles.streakCard}>
        <div className={styles.streakMain}>
          <span className={styles.streakEmoji}>🔥</span>
          <span className={styles.streakNumber}>{streakData.currentStreak}</span>
          <span className={styles.streakLabel}>day streak</span>
        </div>

        {/* Progress to next goal */}
        {streakData.nextGoal && !goalJustAchieved && (
          <div className={styles.goalProgress}>
            <p className={styles.goalText}>
              {streakData.currentStreak}/{streakData.nextGoal.days} days toward your {streakData.nextGoal.label} goal
            </p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${streakData.progressPercent}%` }}
              />
            </div>
            <p className={styles.progressPercent}>{streakData.progressPercent}% complete</p>
          </div>
        )}
      </div>

      {/* Motivational message */}
      <p className={styles.message}>{message}</p>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className="btn btn--secondary btn--large"
          onClick={onViewProgress}
        >
          View Progress
        </button>
        <button
          className="btn btn--primary btn--large"
          onClick={onMeditateAgain}
        >
          Meditate Again
        </button>
      </div>
    </div>
  );
}

export default Completion;
