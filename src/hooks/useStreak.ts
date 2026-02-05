import { useMemo } from 'react';
import { calculateStreak, getLongestStreak, getTotalMeditationTime } from '../utils/dateUtils';
import { STREAK_GOALS } from '../utils/constants';
import type { Session, StreakStats, StreakGoal, StreakFreeze } from '../types';

/**
 * Custom hook for calculating streak statistics
 */
export function useStreak(sessions: Session[], freezes: StreakFreeze[] = []): StreakStats {
  return useMemo(() => {
    const currentStreak = calculateStreak(sessions, freezes);
    const longestStreak = getLongestStreak(sessions);
    const totalSessions = sessions.length;
    const totalTime = getTotalMeditationTime(sessions);

    // Find current and next goals
    let currentGoal: StreakGoal | null = null;
    let nextGoal: StreakGoal | null = null;
    const completedGoals: StreakGoal[] = [];

    for (const goal of STREAK_GOALS) {
      if (currentStreak >= goal.days) {
        completedGoals.push(goal);
      } else if (!nextGoal) {
        nextGoal = goal;
        // The current goal is the one we're working toward
        currentGoal = goal;
      }
    }

    // Calculate progress toward next goal
    let progressPercent = 0;
    let daysToNextGoal = 0;

    if (nextGoal) {
      const previousGoalDays = completedGoals.length > 0
        ? completedGoals[completedGoals.length - 1].days
        : 0;
      const goalRange = nextGoal.days - previousGoalDays;
      const progressInRange = currentStreak - previousGoalDays;
      progressPercent = Math.round((progressInRange / goalRange) * 100);
      daysToNextGoal = nextGoal.days - currentStreak;
    } else {
      // All goals completed
      progressPercent = 100;
    }

    return {
      currentStreak,
      longestStreak,
      totalSessions,
      totalTime,
      completedGoals,
      currentGoal,
      nextGoal,
      progressPercent,
      daysToNextGoal,
      allGoalsCompleted: !nextGoal
    };
  }, [sessions, freezes]);
}

export default useStreak;
