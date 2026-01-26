import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { formatTimeDisplay, getTodayString } from '../../utils/dateUtils';
import { DEFAULT_SOUNDS } from '../../utils/constants';
import styles from './ActiveTimer.module.css';

function ActiveTimer({ config, onComplete, onEnd }) {
  const { addSession, customSounds, settings } = useApp();

  const [timeRemaining, setTimeRemaining] = useState(config.duration);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [bellFlash, setBellFlash] = useState(false);

  // Refs for audio elements
  const bellAudioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const intervalRef = useRef(null);
  const playedBellsRef = useRef(new Set());

  // Web Audio API refs for seamless background looping
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Get sound source by ID
  const getSoundSrc = useCallback((soundId) => {
    if (soundId === 'none') return null;
    const defaultSound = DEFAULT_SOUNDS[soundId];
    if (defaultSound) return defaultSound.src;
    const customSound = customSounds.find(s => s.id === soundId);
    return customSound?.dataUrl || null;
  }, [customSounds]);

  // Play a bell sound
  const playBell = useCallback((soundId) => {
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
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();

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
        } catch (e) { /* ignore */ }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [config.backgroundSound, getSoundSrc]);

  // Update background volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = config.backgroundVolume / 100;
    }
  }, [config.backgroundVolume]);

  // Play beginning bell
  useEffect(() => {
    if (config.beginningSound !== 'none') {
      // Small delay to ensure audio context is ready
      setTimeout(() => playBell(config.beginningSound), 100);
    }
  }, [config.beginningSound, playBell]);

  // Timer countdown
  useEffect(() => {
    if (isPaused) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;

        // Check for interval bells
        const elapsedTime = config.duration - newTime;
        config.intervalBells?.forEach(bell => {
          if (bell.time === elapsedTime && !playedBellsRef.current.has(bell.time)) {
            playedBellsRef.current.add(bell.time);
            playBell(bell.sound);
          }
        });

        // Timer complete
        if (newTime <= 0) {
          clearInterval(intervalRef.current);
          handleTimerComplete();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isPaused, config.duration, config.intervalBells, playBell]);

  // Handle timer completion
  const handleTimerComplete = () => {
    // Play ending sound
    if (config.endingSound !== 'none') {
      playBell(config.endingSound);
    }

    // Stop background audio
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    // Release wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
    }

    // Save session
    const session = addSession({
      duration: config.duration,
      completed: true,
      endedEarly: false
    });

    onComplete(session);
  };

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

  // Handle end session early
  const handleEndEarly = () => {
    setShowEndConfirm(true);
  };

  const confirmEndEarly = () => {
    clearInterval(intervalRef.current);

    // Stop audio
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    // Release wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
    }

    // Save session (counts as completed even if ended early)
    const actualDuration = config.duration - timeRemaining;
    const session = addSession({
      duration: actualDuration,
      completed: true,
      endedEarly: true
    });

    onEnd(session);
  };

  // Calculate progress percentage
  const progress = ((config.duration - timeRemaining) / config.duration) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Handle escape key for modal
  useEffect(() => {
    if (!showEndConfirm) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowEndConfirm(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showEndConfirm]);

  return (
    <div className={`screen screen--centered ${styles.container} ${bellFlash ? styles.flash : ''}`}>
      {/* Hidden audio element for bells */}
      <audio ref={bellAudioRef} />

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
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--success)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className={styles.progressCircle}
          />
        </svg>

        {!settings.focusMode && (
          <div className={styles.timeText}>
            {formatTimeDisplay(timeRemaining, config.duration >= 3600)}
          </div>
        )}
      </div>

      {/* Interval bells indicator */}
      {config.intervalBells?.length > 0 && (
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
          onClick={handleEndEarly}
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
            <h2 id="end-modal-title" className="modal-title">End Session Early?</h2>
            <p>This will still count as a completed session.</p>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={confirmEndEarly}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveTimer;
