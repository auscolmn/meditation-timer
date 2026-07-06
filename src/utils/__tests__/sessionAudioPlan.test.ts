import { describe, it, expect } from 'vitest';
import {
  buildSessionAudioPlan,
  intervalBellKey,
  intervalTimeFromKey,
  BEGIN_BELL_KEY,
  END_BELL_KEY,
  type BuildPlanInput
} from '../sessionAudioPlan';
import type { TimerConfig } from '../../types';

const NOW = 1_750_000_000_000;

const baseConfig: TimerConfig = {
  duration: 600,
  beginningSound: 'bell',
  endingSound: 'tibetan-bell',
  backgroundSound: 'none',
  backgroundVolume: 50,
  bellVolume: 80,
  intervalBells: [],
  preparationTime: 0
};

const paths = new Map<string, string | null>([
  ['bell', 'asset:sounds/bell.mp3'],
  ['tibetan-bell', 'asset:sounds/tibetan-bell.mp3'],
  ['rain', 'asset:sounds/rain.mp3'],
  ['custom-1', 'file:///data/sounds/custom-1.mp3']
]);

function build(overrides: Partial<BuildPlanInput> = {}, config: Partial<TimerConfig> = {}) {
  return buildSessionAudioPlan({
    config: { ...baseConfig, ...config },
    elapsedSec: 0,
    nowMs: NOW,
    playedIntervalTimes: new Set(),
    beginningFired: false,
    endingFired: false,
    soundPaths: paths,
    ...overrides
  });
}

describe('buildSessionAudioPlan', () => {
  it('plans begin and end bells at absolute wall-clock times', () => {
    const plan = build();
    expect(plan.bells.map(b => b.key)).toEqual([BEGIN_BELL_KEY, END_BELL_KEY]);

    const begin = plan.bells[0];
    const end = plan.bells[1];
    expect(begin.at).toBeGreaterThanOrEqual(NOW);
    expect(begin.at - NOW).toBeLessThanOrEqual(1000); // small lead only
    expect(end.at).toBe(NOW + 600 * 1000);
    expect(end.soundPath).toBe('asset:sounds/tibetan-bell.mp3');
  });

  it('offsets the end bell by the elapsed time already served', () => {
    const plan = build({ elapsedSec: 200, beginningFired: true });
    const end = plan.bells.find(b => b.key === END_BELL_KEY);
    expect(end?.at).toBe(NOW + 400 * 1000);
  });

  it('omits the begin bell once fired and the end bell once fired', () => {
    expect(build({ beginningFired: true }).bells.map(b => b.key)).toEqual([END_BELL_KEY]);
    expect(build({ endingFired: true }).bells.map(b => b.key)).toEqual([BEGIN_BELL_KEY]);
  });

  it('omits the end bell when the duration has already passed', () => {
    const plan = build({ elapsedSec: 600, beginningFired: true });
    expect(plan.bells).toEqual([]);
  });

  it('schedules only strictly-future, unplayed interval bells inside the duration', () => {
    const plan = build(
      { elapsedSec: 120, beginningFired: true, playedIntervalTimes: new Set([180]) },
      {
        intervalBells: [
          { time: 60, sound: 'bell' },   // past — the JS tick's business
          { time: 120, sound: 'bell' },  // exactly now — also the tick's
          { time: 180, sound: 'bell' },  // future but already played
          { time: 300, sound: 'bell' },  // future — planned
          { time: 600, sound: 'bell' },  // at the duration — ending bell owns it
          { time: 900, sound: 'bell' }   // beyond the duration
        ]
      }
    );
    const intervals = plan.bells.filter(b => b.key.startsWith('interval-'));
    expect(intervals).toHaveLength(1);
    expect(intervals[0].key).toBe(intervalBellKey(300));
    expect(intervals[0].at).toBe(NOW + (300 - 120) * 1000);
  });

  it('sorts bells by time ascending', () => {
    const plan = build(
      {},
      { intervalBells: [{ time: 300, sound: 'bell' }, { time: 100, sound: 'bell' }] }
    );
    const times = plan.bells.map(b => b.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(plan.bells[0].key).toBe(BEGIN_BELL_KEY);
    expect(plan.bells[plan.bells.length - 1].key).toBe(END_BELL_KEY);
  });

  it('drops bells whose sound is none or unresolvable', () => {
    const plan = build(
      {},
      {
        beginningSound: 'none',
        endingSound: 'deleted-custom',
        intervalBells: [{ time: 300, sound: 'custom-1' }]
      }
    );
    expect(plan.bells.map(b => b.key)).toEqual([intervalBellKey(300)]);
    expect(plan.bells[0].soundPath).toBe('file:///data/sounds/custom-1.mp3');
  });

  it('defaults bell volume with ?? so a zero volume is honored', () => {
    const withZero = build({}, { bellVolume: 0 });
    expect(withZero.bells[0].volume).toBe(0);

    const withUndefined = build(
      {},
      { bellVolume: undefined as unknown as number }
    );
    expect(withUndefined.bells[0].volume).toBeCloseTo(0.8);
  });

  it('maps ambient sound and volume when set, null when silent', () => {
    expect(build().ambient).toBeNull();

    const plan = build({}, { backgroundSound: 'rain', backgroundVolume: 30 });
    expect(plan.ambient).toEqual({
      soundPath: 'asset:sounds/rain.mp3',
      volume: 0.3
    });
  });

  it('treats an unresolvable ambient sound as silent', () => {
    const plan = build({}, { backgroundSound: 'deleted-custom' });
    expect(plan.ambient).toBeNull();
  });
});

describe('interval bell keys', () => {
  it('round-trips times through keys', () => {
    expect(intervalTimeFromKey(intervalBellKey(300))).toBe(300);
    expect(intervalTimeFromKey(BEGIN_BELL_KEY)).toBeNull();
    expect(intervalTimeFromKey(END_BELL_KEY)).toBeNull();
    expect(intervalTimeFromKey('interval-abc')).toBeNull();
  });
});
