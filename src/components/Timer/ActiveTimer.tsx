import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { formatTimeDisplay } from '../../utils/dateUtils';
import { DEFAULT_SOUNDS } from '../../utils/constants';
import type { TimerConfig, Session } from '../../types';
import styles from './ActiveTimer.module.css';

interface ActiveTimerProps {
  config: TimerConfig;
  onComplete: (session: Session) => void;
  onEnd: (session: Session | null) => void;
}

function ActiveTimer({ config, onComplete, onEnd }: ActiveTimerProps) {
  const { addSession, customSounds, settings } = useApp();

  // Preparation phase state
  const [isPreparing, setIsPreparing] = useState(config.preparationTime > 0);
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(config.preparationTime || 0);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [bellPlayed, setBellPlayed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [bellFlash, setBellFlash] = useState(false);

  // Refs for audio elements
  const bellAudioRef = useRef<HTMLAudioElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playedBellsRef = useRef<Set<number>>(new Set());

  // Web Audio API refs for seamless background looping
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Get sound source by ID
  const getSoundSrc = useCallback((soundId: string): string | null => {
    if (soundId === 'none') return null;
    const defaultSound = DEFAULT_SOUNDS[soundId];
    if (defaultSound) return defaultSound.src;
    const customSound = customSounds.find(s => s.id === soundId);
    return customSound?.dataUrl || null;
  }, [customSounds]);

  // Play a bell sound
  const playBell = useCallback((soundId: string) => {
    const src = getSoundSrc(soundId);
    if (!src || !bellAudioRef.current) return;

    bellAudioRef.current.src = src;
    bellAudioRef.current.volume = (config.bellVolume || 80) / 100;
    bellAudioRef.current.play().catch(console.error);

    // Visual feedback
    setBellFlash(true);
    setTimeout(() => setBellFlash(false), 500);
  }, [getSoundSrc, config.bellVolume]);

  // Request wake lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake lock request failed:', err);
        }
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  // Start background sound with Web Audio API for seamless looping
  useEffect(() => {
    if (config.backgroundSound === 'none') return;

    const src = getSoundSrc(config.backgroundSound);
    if (!src) return;

    let isCancelled = false;

    const startBackgroundAudio = async () => {
      try {
        // Create audio context
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();

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
  }, [config.backgroundSound, getSoundSrc]);

  // Update background volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = config.backgroundVolume / 100;
    }
  }, [config.backgroundVolume]);

  // Play beginning bell (after preparation phase ends, or immediately if no preparation)
  useEffect(() => {
    if (config.beginningSound !== 'none' && !isPreparing) {
      // Small delay to ensure audio context is ready
      setTimeout(() => playBell(config.beginningSound), 100);
    }
  }, [config.beginningSound, playBell, isPreparing]);

  // Preparation countdown
  useEffect(() => {
    if (!isPreparing || isPaused) return;

    intervalRef.current = setInterval(() => {
      setPrepTimeRemaining(prev => {
        const newTime = prev - 1;

        // Preparation complete - transition to meditation
        if (newTime <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPreparing(false);
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPreparing, isPaused]);

  // Timer count-up (only runs after preparation is complete)
  useEffect(() => {
    if (isPaused || isPreparing) return;

    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;

        // Check for interval bells
        config.intervalBells?.forEach(bell => {
          if (bell.time === newTime && !playedBellsRef.current.has(bell.time)) {
            playedBellsRef.current.add(bell.time);
            playBell(bell.sound);
          }
        });

        // Play ending bell when duration is reached (but don't stop)
        if (newTime === config.duration && !bellPlayed) {
          setBellPlayed(true);
          if (config.endingSound !== 'none') {
            playBell(config.endingSound);
          }
        }

        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, isPreparing, config.duration, config.intervalBells, config.endingSound, playBell, bellPlayed]);


  // Handle pause/resume
  const togglePause = () => {
    setIsPaused(prev => {
      const newPaused = !prev;
      if (audioContextRef.current) {
        if (newPaused) {
          audioContextRef.current.suspend();
        } else {
          audioContextRef.current.resume();
        }
      }
      return newPaused;
    });
  };

  // Handle end session
  const handleEndSession = () => {
    setShowEndConfirm(true);
  };

  const confirmEndSession = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Stop audio
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    // Release wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
    }

    // If still in preparation phase, don't save a session
    if (isPreparing) {
      onEnd(null);
      return;
    }

    // Save session with actual elapsed time
    const session = addSession({
      duration: elapsedTime,
      completed: true,
      endedEarly: elapsedTime < config.duration
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

  // Handle escape key for modal
  useEffect(() => {
    if (!showEndConfirm) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowEndConfirm(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showEndConfirm]);

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
            stroke="var(--border)"
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
          onKeyDown={(e) => e.key === 'Escape' && setShowEndConfirm(false)}
          role="presentation"
        >
          <div
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
