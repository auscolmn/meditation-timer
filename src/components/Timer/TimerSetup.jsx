import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { timeToSeconds } from '../../utils/dateUtils';
import { DEFAULT_SOUNDS } from '../../utils/constants';
import styles from './TimerSetup.module.css';

// Play icon SVG
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

function TimerSetup({ onStart }) {
  const { settings, updateSettings, customSounds } = useApp();
  const previewAudioRef = useRef(null);

  // Duration state
  const [hours, setHours] = useState(settings.lastDuration?.hours || 0);
  const [minutes, setMinutes] = useState(settings.lastDuration?.minutes || 10);
  const [seconds, setSeconds] = useState(settings.lastDuration?.seconds || 0);

  // Sound state
  const [beginningSound, setBeginningSound] = useState(settings.lastBeginningSound || 'bell');
  const [endingSound, setEndingSound] = useState(settings.lastEndingSound || 'gong');
  const [backgroundSound, setBackgroundSound] = useState(settings.lastBackgroundSound || 'none');
  const [backgroundVolume, setBackgroundVolume] = useState(settings.backgroundVolume || 50);

  // Interval bells state
  const [intervalBells, setIntervalBells] = useState(settings.lastIntervalBells || []);

  // Validation error
  const [error, setError] = useState('');

  // Get all available sounds (default + custom)
  const bellSounds = [
    DEFAULT_SOUNDS.none,
    DEFAULT_SOUNDS.bell,
    DEFAULT_SOUNDS.gong,
    DEFAULT_SOUNDS['tibetan-bowl'],
    DEFAULT_SOUNDS.chime,
    ...customSounds.filter(s => s.type === 'bell')
  ];

  const backgroundSounds = [
    DEFAULT_SOUNDS.none,
    DEFAULT_SOUNDS.waterfall,
    DEFAULT_SOUNDS.rain,
    ...customSounds.filter(s => s.type === 'background')
  ];

  // Quick-start presets
  const presets = [
    { label: '5 min', minutes: 5 },
    { label: '10 min', minutes: 10 },
    { label: '15 min', minutes: 15 },
    { label: '20 min', minutes: 20 },
  ];

  // Preview sound
  const previewSound = (soundId) => {
    if (soundId === 'none' || !previewAudioRef.current) return;

    const defaultSound = DEFAULT_SOUNDS[soundId];
    let src = defaultSound?.src;

    if (!src) {
      const customSound = customSounds.find(s => s.id === soundId);
      src = customSound?.dataUrl;
    }

    if (src) {
      previewAudioRef.current.src = src;
      previewAudioRef.current.play().catch(console.error);
    }
  };

  // Apply preset duration
  const applyPreset = (preset) => {
    setHours(0);
    setMinutes(preset.minutes);
    setSeconds(0);
    setError('');
  };

  // Validate and handle start
  const handleStart = () => {
    const totalSeconds = timeToSeconds({ hours, minutes, seconds });

    if (totalSeconds === 0) {
      setError('Please set a duration greater than 0');
      return;
    }

    if (totalSeconds > 24 * 60 * 60) {
      setError('Duration cannot exceed 24 hours');
      return;
    }

    // Validate interval bells
    for (const bell of intervalBells) {
      if (bell.time >= totalSeconds) {
        setError('Interval bells must be before the end of the session');
        return;
      }
    }

    // Save settings
    updateSettings({
      lastDuration: { hours, minutes, seconds },
      lastBeginningSound: beginningSound,
      lastEndingSound: endingSound,
      lastBackgroundSound: backgroundSound,
      backgroundVolume,
      lastIntervalBells: intervalBells
    });

    // Start meditation
    onStart({
      duration: totalSeconds,
      beginningSound,
      endingSound,
      backgroundSound,
      backgroundVolume,
      intervalBells: [...intervalBells].sort((a, b) => a.time - b.time)
    });
  };

  // Add interval bell
  const addIntervalBell = () => {
    const totalSeconds = timeToSeconds({ hours, minutes, seconds });
    const defaultTime = Math.floor(totalSeconds / 2);
    setIntervalBells([...intervalBells, { time: defaultTime, sound: 'chime' }]);
  };

  // Remove interval bell
  const removeIntervalBell = (index) => {
    setIntervalBells(intervalBells.filter((_, i) => i !== index));
  };

  // Update interval bell
  const updateIntervalBell = (index, field, value) => {
    const updated = [...intervalBells];
    updated[index] = { ...updated[index], [field]: value };
    setIntervalBells(updated);
  };

  // Handle number input
  const handleNumberInput = (setter, max) => (e) => {
    const value = Math.max(0, Math.min(max, parseInt(e.target.value) || 0));
    setter(value);
    setError('');
  };

  return (
    <div className="screen">
      {/* Hidden audio for previews */}
      <audio ref={previewAudioRef} />

      <h1 className={styles.title}>Set Your Timer</h1>

      {/* Duration */}
      <div className={`card mb-lg ${styles.animateDelay1}`}>
        <h2 className={styles.sectionTitle}>Duration</h2>

        {/* Quick-start presets */}
        <div className={styles.presets}>
          {presets.map(preset => (
            <button
              key={preset.minutes}
              type="button"
              className={`${styles.presetButton} ${minutes === preset.minutes && hours === 0 && seconds === 0 ? styles.presetActive : ''}`}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className={styles.durationInputs}>
          <div className={styles.timeInput}>
            <input
              type="number"
              className="input"
              value={hours}
              onChange={handleNumberInput(setHours, 23)}
              min="0"
              max="23"
              aria-label="Hours"
            />
            <span className={styles.timeLabel}>Hours</span>
          </div>
          <div className={styles.timeInput}>
            <input
              type="number"
              className="input"
              value={minutes}
              onChange={handleNumberInput(setMinutes, 59)}
              min="0"
              max="59"
              aria-label="Minutes"
            />
            <span className={styles.timeLabel}>Minutes</span>
          </div>
          <div className={styles.timeInput}>
            <input
              type="number"
              className="input"
              value={seconds}
              onChange={handleNumberInput(setSeconds, 59)}
              min="0"
              max="59"
              aria-label="Seconds"
            />
            <span className={styles.timeLabel}>Seconds</span>
          </div>
        </div>
      </div>

      {/* Sounds */}
      <div className={`card mb-lg ${styles.animateDelay2}`}>
        <h2 className={styles.sectionTitle}>Sounds</h2>

        <div className="form-group">
          <label className="form-label">Beginning Sound</label>
          <div className={styles.soundRow}>
            <select
              className="select"
              value={beginningSound}
              onChange={(e) => setBeginningSound(e.target.value)}
            >
              {bellSounds.map(sound => (
                <option key={sound.id} value={sound.id}>{sound.name}</option>
              ))}
            </select>
            <button
              type="button"
              className={styles.previewButton}
              onClick={() => previewSound(beginningSound)}
              disabled={beginningSound === 'none'}
              aria-label="Preview sound"
            >
              <PlayIcon />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ending Sound</label>
          <div className={styles.soundRow}>
            <select
              className="select"
              value={endingSound}
              onChange={(e) => setEndingSound(e.target.value)}
            >
              {bellSounds.map(sound => (
                <option key={sound.id} value={sound.id}>{sound.name}</option>
              ))}
            </select>
            <button
              type="button"
              className={styles.previewButton}
              onClick={() => previewSound(endingSound)}
              disabled={endingSound === 'none'}
              aria-label="Preview sound"
            >
              <PlayIcon />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Background Sound</label>
          <div className={styles.soundRow}>
            <select
              className="select"
              value={backgroundSound}
              onChange={(e) => setBackgroundSound(e.target.value)}
            >
              {backgroundSounds.map(sound => (
                <option key={sound.id} value={sound.id}>{sound.name}</option>
              ))}
            </select>
            <button
              type="button"
              className={styles.previewButton}
              onClick={() => previewSound(backgroundSound)}
              disabled={backgroundSound === 'none'}
              aria-label="Preview sound"
            >
              <PlayIcon />
            </button>
          </div>
        </div>

        {backgroundSound !== 'none' && (
          <div className="form-group">
            <label className="form-label">Background Volume: {backgroundVolume}%</label>
            <input
              type="range"
              className={styles.volumeSlider}
              value={backgroundVolume}
              onChange={(e) => setBackgroundVolume(parseInt(e.target.value))}
              min="0"
              max="100"
            />
          </div>
        )}
      </div>

      {/* Interval Bells */}
      <div className={`card mb-lg ${styles.animateDelay3}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Interval Bells</h2>
          <button
            className="btn btn--secondary"
            onClick={addIntervalBell}
            type="button"
          >
            + Add
          </button>
        </div>

        {intervalBells.length === 0 ? (
          <p className="text-secondary">No interval bells set</p>
        ) : (
          <div className={styles.intervalList}>
            {intervalBells.map((bell, index) => (
              <div key={index} className={styles.intervalItem}>
                <input
                  type="number"
                  className="input"
                  value={Math.floor(bell.time / 60)}
                  onChange={(e) => updateIntervalBell(index, 'time', parseInt(e.target.value || 0) * 60)}
                  min="0"
                  placeholder="Minutes"
                  aria-label="Interval time in minutes"
                />
                <span className={styles.intervalLabel}>min</span>
                <select
                  className="select"
                  value={bell.sound}
                  onChange={(e) => updateIntervalBell(index, 'sound', e.target.value)}
                >
                  {bellSounds.filter(s => s.id !== 'none').map(sound => (
                    <option key={sound.id} value={sound.id}>{sound.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn--icon btn--secondary"
                  onClick={() => removeIntervalBell(index)}
                  aria-label="Remove interval bell"
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
      </div>

      {/* Error message */}
      {error && <p className="form-error text-center mb-md">{error}</p>}

      {/* Begin button */}
      <button
        className={`btn btn--primary btn--large btn--full ${styles.beginButton} ${styles.animateDelay4}`}
        onClick={handleStart}
      >
        BEGIN
      </button>
    </div>
  );
}

export default TimerSetup;
