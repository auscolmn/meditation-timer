import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useApp } from '../../context/AppContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatTimeDisplay } from '../../utils/dateUtils';
import { DEFAULT_SOUNDS } from '../../utils/constants';
import { getCustomSoundSrc } from '../../utils/soundStorage';
import type { TimerConfig, Session } from '../../types';
import styles from './ActiveTimer.module.css';

interface ActiveTimerProps {
  config: TimerConfig;
  onComplete: (session: Session) => void;
  onEnd: (session: Session | null) => void;
}

// Fixed ID so re-scheduling always replaces the previous end-of-session notification
const END_NOTIFICATION_ID = 1001;

// If a bell's moment passed more than this many seconds ago (e.g. the WebView
// was suspended while the screen was off), mark it as played without sounding
// it, so returning to the app doesn't fire a burst of stale bells at once.
const MISSED_BELL_TOLERANCE_SEC = 2;

// How often we re-derive elapsed time from the wall clock. Sub-second so the
// displayed seconds never visibly stutter, cheap enough not to matter.
const TICK_MS = 500;

function ActiveTimer({ config, onComplete, onEnd }: ActiveTimerProps) {
  const { addSession, customSounds, settings } = useApp();

  // Preparation phase state
  const [isPreparing, setIsPreparing] = useState(config.preparationTime > 0);
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(config.preparationTime || 0);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [bellFlash, setBellFlash] = useState(false);

  // --- Wall-clock timing ---
  // Elapsed time is always derived from real timestamps, never from counting
  // interval ticks. WebView timers throttle or suspend entirely when the app
  // is backgrounded or the screen locks; deriving from Date.now() means the
  // timer is correct the instant we get to run again.
  const phaseStartRef = useRef<number>(Date.now()); // start of current phase (prep or meditation)
  const pausedTotalRef = useRef(0);                 // ms spent paused within the current phase
  const pauseBeganRef = useRef<number | null>(null);
  const isPreparingRef = useRef(config.preparationTime > 0);

  // Bell bookkeeping (refs, not state: written from the tick, read nowhere in render)
  const playedBellsRef = useRef<Set<number>>(new Set());
  const endingBellFiredRef = useRef(false);
  const beginningBellFiredRef = useRef(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for audio elements
  const bellAudioRef = useRef<HTMLAudioElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Web Audio API refs for seamless background looping
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Seconds elapsed in the current phase, from the wall clock, excluding pauses
  const getPhaseElapsedSec = useCallback((): number => {
    const pausedMs =
      pausedTotalRef.current +
      (pauseBeganRef.current !== null ? Date.now() - pauseBeganRef.current : 0);
    return Math.max(0, Math.floor((Date.now() - phaseStartRef.current - pausedMs) / 1000));
  }, []);

  // Resolve a playable src by sound ID. Bundled sounds resolve synchronously;
  // custom sounds live in the Capacitor Filesystem and resolve async (cached
  // after the first resolution, and pre-warmed at mount below, so bells still
  // fire on time).
  const resolveSoundSrc = useCallback(async (soundId: string): Promise<string | null> => {
    if (soundId === 'none') return null;
    const defaultSound = DEFAULT_SOUNDS[soundId];
    if (defaultSound) return defaultSound.src;
    const customSound = customSounds.find(s => s.id === soundId);
    return customSound ? getCustomSoundSrc(customSound) : null;
  }, [customSounds]);

  // Pre-warm the src cache for every sound this session can play, so bell
  // playback never waits on a filesystem read at the bell's moment.
  useEffect(() => {
    const ids = [
      config.beginningSound,
      config.endingSound,
      config.backgroundSound,
      ...config.intervalBells.map(b => b.sound)
    ];
    ids.forEach(id => { void resolveSoundSrc(id); });
    // Mount-only warm-up; individual plays re-resolve (from cache) anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play a bell sound
  const playBell = useCallback((soundId: string) => {
    void (async () => {
      const src = await resolveSoundSrc(soundId);
      if (!src || !bellAudioRef.current) return;

      bellAudioRef.current.src = src;
      bellAudioRef.current.volume = (config.bellVolume ?? 80) / 100;
      bellAudioRef.current.play().catch(console.error);

      // Visual feedback
      setBellFlash(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setBellFlash(false), 500);
    })();
  }, [resolveSoundSrc, config.bellVolume]);

  // --- End-of-session notification (native safety net) ---
  // If the OS suspends the WebView (screen locked, app backgrounded) the
  // ending bell can't play from JS. A scheduled local notification makes sure
  // the phone still tells the user their session is over. Cancelled whenever
  // the session ends in-app, pauses, or the component unmounts.
  const cancelEndNotification = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: END_NOTIFICATION_ID }] });
    } catch { /* never let the safety net break the session */ }
  }, []);

  const scheduleEndNotification = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      let { display } = await LocalNotifications.checkPermissions();
      if (display !== 'granted') {
        ({ display } = await LocalNotifications.requestPermissions());
      }
      if (display !== 'granted') return;

      const remainingSec = config.duration - getPhaseElapsedSec();
      if (remainingSec <= 0) return;

      const minutes = Math.round(config.duration / 60);
      await LocalNotifications.schedule({
        notifications: [{
          id: END_NOTIFICATION_ID,
          title: 'Meditation complete',
          body: minutes > 0
            ? `Your ${minutes}-minute session has ended.`
            : 'Your session has ended.',
          schedule: { at: new Date(Date.now() + remainingSec * 1000), allowWhileIdle: true },
        }],
      });
    } catch { /* never let the safety net break the session */ }
  }, [config.duration, getPhaseElapsedSec]);

  // --- The tick: derive time, fire due bells ---
  // Runs from setInterval and on visibility changes. All side effects happen
  // here, in a plain callback — never inside a state updater, where React
  // (StrictMode, React Compiler) assumes purity and may invoke twice.
  const tick = useCallback(() => {
    const elapsed = getPhaseElapsedSec();

    if (isPreparingRef.current) {
      const remaining = Math.max(config.preparationTime - elapsed, 0);
      setPrepTimeRemaining(remaining);
      if (remaining <= 0) {
        // Transition to the meditation phase: restart the wall clock
        isPreparingRef.current = false;
        phaseStartRef.current = Date.now();
        pausedTotalRef.current = 0;
        pauseBeganRef.current = null;
        setIsPreparing(false);
        setElapsedTime(0);
      }
      return;
    }

    setElapsedTime(elapsed);

    // Interval bells: threshold check (>=), so a wall-clock jump after a
    // suspension can't skip past one. Bells missed by more than the tolerance
    // are marked done silently instead of all sounding at once on resume.
    config.intervalBells?.forEach(bell => {
      if (elapsed >= bell.time && !playedBellsRef.current.has(bell.time)) {
        playedBellsRef.current.add(bell.time);
        if (elapsed - bell.time <= MISSED_BELL_TOLERANCE_SEC) {
          playBell(bell.sound);
        }
      }
    });

    // Ending bell: always rings once when the duration is crossed, even if we
    // only discover it late (screen came back on) — this is the one bell the
    // user must not miss. The timer itself keeps counting up by design.
    if (elapsed >= config.duration && !endingBellFiredRef.current) {
      endingBellFiredRef.current = true;
      if (config.endingSound !== 'none') {
        playBell(config.endingSound);
      }
      // The scheduled notification is no longer needed if we got to ring in-app
      cancelEndNotification();
    }
  }, [config.preparationTime, config.duration, config.intervalBells, config.endingSound,
      getPhaseElapsedSec, playBell, cancelEndNotification]);

  // Keep the latest tick reachable from long-lived listeners without re-subscribing
  const tickRef = useRef(tick);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  // Drive the tick. Restarting the interval on dep changes is harmless now:
  // time comes from the wall clock, so no drift can accumulate.
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => tickRef.current(), TICK_MS);
    return () => clearInterval(id);
  }, [isPaused]);

  // --- Keep the screen awake ---
  // Native: the keep-awake plugin (iOS idleTimerDisabled / Android
  // FLAG_KEEP_SCREEN_ON) — reliable inside Capacitor's WebView.
  // Web: the Screen Wake Lock API, re-acquired on every return to visibility,
  // because the OS silently releases it whenever the page is hidden.
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    const acquireWebWakeLock = async () => {
      if (isNative || !('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch { /* not critical; the timer stays correct regardless */ }
    };

    if (isNative) {
      KeepAwake.keepAwake().catch(() => {});
    } else {
      acquireWebWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      // Catch the clock up immediately (fires any bell whose moment arrived)
      tickRef.current();
      // iOS is prone to leaving the AudioContext suspended; nudge it back
      audioContextRef.current?.resume().catch(() => {});
      acquireWebWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isNative) {
        KeepAwake.allowSleep().catch(() => {});
      }
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  // Start background sound with Web Audio API for seamless looping
  useEffect(() => {
    if (config.backgroundSound === 'none') return;

    let isCancelled = false;

    const startBackgroundAudio = async () => {
      try {
        const src = await resolveSoundSrc(config.backgroundSound);
        if (!src || isCancelled) return;

        // Create audio context
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();

        // iOS can create the context in a 'suspended' state even though the
        // session began from a tap; resume it explicitly or nothing plays.
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume().catch(() => {});
        }

        // Fetch and decode audio
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

        if (isCancelled) return;

        // Create gain node for volume control
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = config.backgroundVolume / 100;
        gainNodeRef.current.connect(audioContextRef.current.destination);

        // Create and start source
        audioSourceRef.current = audioContextRef.current.createBufferSource();
        audioSourceRef.current.buffer = audioBuffer;
        audioSourceRef.current.loop = true;
        audioSourceRef.current.connect(gainNodeRef.current);
        audioSourceRef.current.start(0);
      } catch (err) {
        console.error('Error starting background audio:', err);
      }
    };

    startBackgroundAudio();

    return () => {
      isCancelled = true;
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch { /* ignore */ }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Volume changes handled by separate effect
  }, [config.backgroundSound, resolveSoundSrc]);

  // Update background volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = config.backgroundVolume / 100;
    }
  }, [config.backgroundVolume]);

  // Play beginning bell (after preparation phase ends, or immediately if no
  // preparation). Fired-once ref + timeout cleanup: StrictMode double-mounts
  // effects, and playBell's identity can change mid-session (customSounds).
  useEffect(() => {
    if (isPreparing || beginningBellFiredRef.current) return;
    if (config.beginningSound === 'none') {
      beginningBellFiredRef.current = true;
      return;
    }
    // Small delay to ensure audio context is ready
    const timeoutId = setTimeout(() => {
      beginningBellFiredRef.current = true;
      playBell(config.beginningSound);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [isPreparing, config.beginningSound, playBell]);

  // Schedule the end-of-session notification once the meditation phase begins;
  // cancel it whenever this effect tears down (session over, unmount).
  useEffect(() => {
    if (isPreparing) return;
    scheduleEndNotification();
    return () => { cancelEndNotification(); };
  }, [isPreparing, scheduleEndNotification, cancelEndNotification]);

  // Clear any pending bell-flash timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Handle pause/resume — side effects live here, not inside a state updater
  const togglePause = () => {
    const nextPaused = !isPaused;
    if (nextPaused) {
      pauseBeganRef.current = Date.now();
      audioContextRef.current?.suspend().catch(() => {});
      // The end time just moved into the future; the old notification is wrong
      cancelEndNotification();
    } else {
      if (pauseBeganRef.current !== null) {
        pausedTotalRef.current += Date.now() - pauseBeganRef.current;
        pauseBeganRef.current = null;
      }
      audioContextRef.current?.resume().catch(() => {});
      if (!isPreparingRef.current) {
        scheduleEndNotification();
      }
    }
    setIsPaused(nextPaused);
  };

  // Handle end session
  const handleEndSession = () => {
    setShowEndConfirm(true);
  };

  const confirmEndSession = () => {
    // The scheduled notification must not fire after an in-app end
    cancelEndNotification();

    // Stop audio (also handled by unmount cleanup; harmless to do eagerly)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    // If still in preparation phase, don't save a session
    if (isPreparing) {
      onEnd(null);
      return;
    }

    // Save with the wall-clock elapsed time, not the possibly-stale state value
    const finalElapsed = getPhaseElapsedSec();
    const session = addSession({
      duration: finalElapsed,
      completed: true,
      endedEarly: finalElapsed < config.duration
    });

    onComplete(session);
  };

  // Calculate progress percentage
  const circumference = 2 * Math.PI * 45; // radius = 45

  // During preparation, show preparation progress; during meditation, show meditation progress
  // Cap at 100% once duration is reached
  const progress = isPreparing
    ? ((config.preparationTime - prepTimeRemaining) / config.preparationTime) * 100
    : Math.min((elapsedTime / config.duration) * 100, 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Focus trap for end confirmation modal — Escape closes it
  const endModalRef = useFocusTrap<HTMLDivElement>(showEndConfirm, () => setShowEndConfirm(false));

  return (
    <div className={`screen screen--centered ${styles.container} ${bellFlash ? styles.flash : ''} ${isPreparing ? styles.preparing : ''}`}>
      {/* Hidden audio element for bells */}
      <audio ref={bellAudioRef} />

      {/* Preparation label */}
      {isPreparing && (
        <p className={styles.preparingLabel}>Settling in...</p>
      )}

      {/* Progress ring */}
      <div className={styles.timerDisplay}>
        <svg className={styles.progressRing} viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--border-light)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isPreparing ? "var(--text-tertiary)" : "var(--success)"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className={styles.progressCircle}
          />
        </svg>

        {!settings.focusMode && (
          <div className={styles.timeText}>
            {isPreparing
              ? prepTimeRemaining
              : formatTimeDisplay(elapsedTime, elapsedTime >= 3600 || config.duration >= 3600)}
          </div>
        )}
      </div>

      {/* Interval bells indicator (only show during meditation, not preparation) */}
      {!isPreparing && config.intervalBells?.length > 0 && (
        <p className={styles.backgroundIndicator}>
          {config.intervalBells.length} interval bell{config.intervalBells.length !== 1 ? 's' : ''}
        </p>
      )}


      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={`btn btn--large ${isPaused ? 'btn--primary' : 'btn--secondary'}`}
          onClick={togglePause}
          aria-label={isPaused ? 'Resume meditation' : 'Pause meditation'}
        >
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>

        <button
          className="btn btn--large btn--outline"
          onClick={handleEndSession}
          aria-label="End meditation session"
        >
          END
        </button>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowEndConfirm(false)}
          role="presentation"
        >
          <div
            ref={endModalRef}
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-modal-title"
          >
            <h2 id="end-modal-title" className="modal-title">
              {isPreparing ? 'Cancel Session?' : 'End Session?'}
            </h2>
            <p>
              {isPreparing
                ? 'The meditation has not started yet.'
                : `You've meditated for ${formatTimeDisplay(elapsedTime, elapsedTime >= 3600)}.`}
            </p>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setShowEndConfirm(false)}
              >
                Continue
              </button>
              <button
                className="btn btn--primary"
                onClick={confirmEndSession}
              >
                {isPreparing ? 'Cancel' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveTimer;
