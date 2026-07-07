import type { TimerConfig } from '../types';

/**
 * Native session-audio plan building (Part 9).
 *
 * On native platforms the locked-screen bell schedule is owned by native
 * code: WebView JS is suspended when the screen locks (Doze / WebView
 * throttling on Android, whole-app suspension on iOS), so no JS timer can
 * ring a bell there. Instead, when the meditation phase starts (and again on
 * every resume from pause), JS computes absolute wall-clock timestamps for
 * every remaining bell and hands the whole plan to the SessionAudio plugin.
 * Native fires the bells on its own clock and reports each one back so JS
 * can keep its bookkeeping in sync.
 *
 * This module is the pure, testable part: given the session config and the
 * current position, produce the plan. Wall-clock timing (Part 4) remains the
 * single source of truth — every timestamp here derives from the same
 * Date.now() arithmetic the tick uses.
 *
 * The beginning bell is deliberately NOT part of the plan: it rings at the
 * moment the meditation phase starts, which is always a foreground moment,
 * so JS plays it directly. Routing it through native scheduling (Android
 * AlarmManager) adds seconds of dispatch latency — alarms are built for
 * "wake me later", not "now".
 */

export interface PlannedBell {
  /** Stable identity for cross-layer dedup: 'begin', 'end', or 'interval-<sec>'. */
  key: string;
  /** Absolute wall-clock time (epoch ms) at which the bell must ring. */
  at: number;
  /** Native-resolvable sound location: 'asset:<path>' or a 'file://' URI. */
  soundPath: string;
  /** Playback volume, 0..1. */
  volume: number;
}

export interface SessionAudioPlan {
  /** Bells to ring, sorted by time ascending. */
  bells: PlannedBell[];
  /** Looping ambient audio for the whole session, or null for silent sits. */
  ambient: { soundPath: string; volume: number } | null;
}

export const END_BELL_KEY = 'end';

const INTERVAL_KEY_PREFIX = 'interval-';

export function intervalBellKey(timeSec: number): string {
  return `${INTERVAL_KEY_PREFIX}${timeSec}`;
}

/** Map a PlannedBell key back to the interval-bell time it represents, or null. */
export function intervalTimeFromKey(key: string): number | null {
  if (!key.startsWith(INTERVAL_KEY_PREFIX)) return null;
  const time = Number(key.slice(INTERVAL_KEY_PREFIX.length));
  return Number.isFinite(time) ? time : null;
}

export interface BuildPlanInput {
  config: TimerConfig;
  /** Seconds elapsed in the meditation phase right now (wall-clock derived). */
  elapsedSec: number;
  /** Date.now() at plan-build time. */
  nowMs: number;
  /** Interval-bell times (sec) already sounded or skipped. */
  playedIntervalTimes: ReadonlySet<number>;
  endingFired: boolean;
  /**
   * soundId -> native path. A missing or null entry means the sound could
   * not be resolved (e.g. a deleted custom sound); such bells are omitted —
   * the same silent degradation the in-app player has today.
   */
  soundPaths: ReadonlyMap<string, string | null>;
}

export function buildSessionAudioPlan(input: BuildPlanInput): SessionAudioPlan {
  const {
    config, elapsedSec, nowMs,
    playedIntervalTimes, endingFired, soundPaths
  } = input;

  // `??`, not `||`: a bell volume of 0 is a deliberate setting (Part 3 lesson).
  const bellVolume = (config.bellVolume ?? 80) / 100;

  const pathFor = (soundId: string): string | null => {
    if (soundId === 'none') return null;
    return soundPaths.get(soundId) ?? null;
  };

  const bells: PlannedBell[] = [];

  // Only strictly-future interval bells belong in the plan. Bells whose
  // moment has already passed are the JS tick's business (missed-bell
  // tolerance, Part 4); re-scheduling them natively would double-ring.
  for (const bell of config.intervalBells ?? []) {
    if (bell.time <= elapsedSec) continue;
    if (bell.time >= config.duration) continue; // ending bell owns the end
    if (playedIntervalTimes.has(bell.time)) continue;
    const path = pathFor(bell.sound);
    if (!path) continue;
    bells.push({
      key: intervalBellKey(bell.time),
      at: nowMs + (bell.time - elapsedSec) * 1000,
      soundPath: path,
      volume: bellVolume
    });
  }

  if (!endingFired && config.duration > elapsedSec) {
    const path = pathFor(config.endingSound);
    if (path) {
      bells.push({
        key: END_BELL_KEY,
        at: nowMs + (config.duration - elapsedSec) * 1000,
        soundPath: path,
        volume: bellVolume
      });
    }
  }

  bells.sort((a, b) => a.at - b.at);

  const ambientPath = pathFor(config.backgroundSound);
  const ambient = ambientPath
    ? { soundPath: ambientPath, volume: config.backgroundVolume / 100 }
    : null;

  return { bells, ambient };
}
