import { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { timeToSeconds } from '../../utils/dateUtils';
import { DEFAULT_SOUNDS, PREPARATION_PRESETS } from '../../utils/constants';
import PresetManager from './PresetManager';
import type { TimerConfig, DefaultSound, CustomSound, IntervalBell, TimerPreset, DraftTimerSettings } from '../../types';
import styles from './TimerSetup.module.css';

// Play icon SVG
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

// Pause icon SVG
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);

interface TimerSetupProps {
  onStart: (config: TimerConfig) => void;
}

interface DurationPreset {
  label: string;
  minutes: number;
}

function TimerSetup({ onStart }: TimerSetupProps) {
  const { settings, updateSettings, customSounds, draftTimerSettings, setDraftTimerSettings } = useApp();
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  // Use draft settings if available, otherwise fall back to last saved settings
  const initialSettings = draftTimerSettings || {
    duration: settings.lastDuration || { hours: 0, minutes: 10, seconds: 0 },
    preparationTime: settings.preparationTime || 0,
    beginningSound: settings.lastBeginningSound || 'bell',
    endingSound: settings.lastEndingSound || 'gong',
    backgroundSound: settings.lastBackgroundSound || 'none',
    backgroundVolume: settings.backgroundVolume || 50,
    bellVolume: settings.bellVolume || 80,
    intervalBells: settings.lastIntervalBells || []
  };

  // Duration state
  const [hours, setHours] = useState(initialSettings.duration.hours);
  const [minutes, setMinutes] = useState(initialSettings.duration.minutes);
  const [seconds, setSeconds] = useState(initialSettings.duration.seconds);

  // Preparation time state (settle-in time before meditation starts)
  const [preparationTime, setPreparationTime] = useState(initialSettings.preparationTime);
  const [customPrepTime, setCustomPrepTime] = useState(
    !PREPARATION_PRESETS.some(p => p.seconds === initialSettings.preparationTime)
  );

  // Sound state
  const [beginningSound, setBeginningSound] = useState(initialSettings.beginningSound);
  const [endingSound, setEndingSound] = useState(initialSettings.endingSound);
  const [backgroundSound, setBackgroundSound] = useState(initialSettings.backgroundSound);
  const [backgroundVolume, setBackgroundVolume] = useState(initialSettings.backgroundVolume);
  const [bellVolume, setBellVolume] = useState(initialSettings.bellVolume);

  // Interval bells state
  const [intervalBells, setIntervalBells] = useState<IntervalBell[]>(initialSettings.intervalBells);

  // Validation error
  const [error, setError] = useState('');

  // Expandable sections
  const [durationExpanded, setDurationExpanded] = useState(false);
  const [soundsExpanded, setSoundsExpanded] = useState(false);
  const [intervalsExpanded, setIntervalsExpanded] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);

  // Get all available sounds (default + custom) - memoized
  const bellSounds = useMemo((): (DefaultSound | CustomSound)[] => [
    DEFAULT_SOUNDS.none,
    DEFAULT_SOUNDS.bell,
    DEFAULT_SOUNDS.chime,
    DEFAULT_SOUNDS['tibetan-bell'],
    DEFAULT_SOUNDS['tibetan-bowl'],
    ...customSounds.filter(s => s.type === 'bell')
  ], [customSounds]);

  const backgroundSounds = useMemo((): (DefaultSound | CustomSound)[] => [
    DEFAULT_SOUNDS.none,
    DEFAULT_SOUNDS.waterfall,
    DEFAULT_SOUNDS.rain,
    ...customSounds.filter(s => s.type === 'background')
  ], [customSounds]);

  // Quick-start presets from settings
  const customPresets = settings.customDurationPresets ?? [5, 10, 15, 20];
  const presets: DurationPreset[] = customPresets.map(m => ({
    label: `${m} min`,
    minutes: m
  }));

  // Visibility settings
  const showDuration = settings.showDurationCard !== false;
  const showSounds = settings.showSoundsCard !== false;
  const showIntervals = settings.showIntervalsCard !== false;
  const showPresets = settings.showPresetsCard !== false;

  // Update preview volume when slider changes
  useEffect(() => {
    if (previewAudioRef.current && playingSound) {
      const defaultSound = DEFAULT_SOUNDS[playingSound];
      const customSound = customSounds.find(s => s.id === playingSound);
      const isBackgroundSound = defaultSound?.type === 'background' || customSound?.type === 'background';
      previewAudioRef.current.volume = isBackgroundSound ? backgroundVolume / 100 : bellVolume / 100;
    }
  }, [backgroundVolume, bellVolume, playingSound, customSounds]);

  // Save draft settings whenever any setting changes
  useEffect(() => {
    const draft: DraftTimerSettings = {
      duration: { hours, minutes, seconds },
      preparationTime,
      beginningSound,
      endingSound,
      backgroundSound,
      backgroundVolume,
      bellVolume,
      intervalBells
    };
    setDraftTimerSettings(draft);
  }, [hours, minutes, seconds, preparationTime, beginningSound, endingSound, backgroundSound, backgroundVolume, bellVolume, intervalBells, setDraftTimerSettings]);

  // Preview sound (toggle play/pause)
  const previewSound = (soundId: string) => {
    if (soundId === 'none' || !previewAudioRef.current) return;

    // If this sound is already playing, pause it
    if (playingSound === soundId) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPlayingSound(null);
      return;
    }

    // Stop any currently playing sound
    if (playingSound) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    const defaultSound = DEFAULT_SOUNDS[soundId];
    let src = defaultSound?.src;

    if (!src) {
      const customSound = customSounds.find(s => s.id === soundId);
      src = customSound?.dataUrl || null;
    }

    if (src) {
      previewAudioRef.current.src = src;

      // Apply appropriate volume
      const defaultSoundForVolume = DEFAULT_SOUNDS[soundId];
      const customSoundForVolume = customSounds.find(s => s.id === soundId);
      const isBackgroundSound = defaultSoundForVolume?.type === 'background' || customSoundForVolume?.type === 'background';
      previewAudioRef.current.volume = isBackgroundSound ? backgroundVolume / 100 : bellVolume / 100;

      previewAudioRef.current.play().catch(console.error);
      setPlayingSound(soundId);

      // Listen for when the sound ends
      previewAudioRef.current.onended = () => {
        setPlayingSound(null);
      };
    }
  };

  // Apply preset duration
  const applyPreset = (preset: DurationPreset) => {
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
      if (bell.repeat) {
        // Repeating bells must have interval > 0
        if (bell.time <= 0) {
          setError('Repeating interval must be greater than 0');
          return;
        }
      } else {
        // Single bells must be before the end
        if (bell.time >= totalSeconds) {
          setError('Interval bells must be before the end of the session');
          return;
        }
      }
    }

    // Expand repeating bells into individual time points
    const expandedBells: IntervalBell[] = [];
    for (const bell of intervalBells) {
      if (bell.repeat && bell.time > 0) {
        // Generate bells at each interval until the end (but not at the end)
        let time = bell.time;
        while (time < totalSeconds) {
          expandedBells.push({ time, sound: bell.sound });
          time += bell.time;
        }
      } else if (!bell.repeat && bell.time > 0 && bell.time < totalSeconds) {
        expandedBells.push({ time: bell.time, sound: bell.sound });
      }
    }

    // Save settings
    updateSettings({
      lastDuration: { hours, minutes, seconds },
      lastBeginningSound: beginningSound,
      lastEndingSound: endingSound,
      lastBackgroundSound: backgroundSound,
      backgroundVolume,
      bellVolume,
      lastIntervalBells: intervalBells,
      preparationTime
    });

    // Clear draft settings since we're starting
    setDraftTimerSettings(null);

    // Start meditation with expanded bells
    onStart({
      duration: totalSeconds,
      beginningSound,
      endingSound,
      backgroundSound,
      backgroundVolume,
      bellVolume,
      intervalBells: expandedBells.sort((a, b) => a.time - b.time),
      preparationTime
    });
  };

  // Add interval bell
  const addIntervalBell = () => {
    const totalSeconds = timeToSeconds({ hours, minutes, seconds });
    const defaultTime = Math.floor(totalSeconds / 2);
    setIntervalBells([...intervalBells, { time: defaultTime, sound: 'chime' }]);
  };

  // Remove interval bell
  const removeIntervalBell = (index: number) => {
    setIntervalBells(intervalBells.filter((_, i) => i !== index));
  };

  // Update interval bell
  const updateIntervalBell = (index: number, field: keyof IntervalBell, value: string | number | boolean) => {
    const updated = [...intervalBells];
    updated[index] = { ...updated[index], [field]: value };
    setIntervalBells(updated);
  };

  // Handle number input
  const handleNumberInput = (setter: (value: number) => void, max: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(max, parseInt(e.target.value) || 0));
    setter(value);
    setError('');
  };

  // Handle loading a preset
  const handleLoadPreset = (preset: TimerPreset) => {
    setHours(preset.duration.hours);
    setMinutes(preset.duration.minutes);
    setSeconds(preset.duration.seconds);
    setPreparationTime(preset.preparationTime);
    setCustomPrepTime(!PREPARATION_PRESETS.some(p => p.seconds === preset.preparationTime));
    setBeginningSound(preset.beginningSound);
    setEndingSound(preset.endingSound);
    setBackgroundSound(preset.backgroundSound);
    setBackgroundVolume(preset.backgroundVolume);
    setBellVolume(preset.bellVolume);
    setIntervalBells(preset.intervalBells);
    setError('');
  };

  return (
    <div className={`screen ${styles.contentPadding}`}>
      {/* Hidden audio for previews */}
      <audio ref={previewAudioRef} />

      <h1 className={styles.title}>Set Your Timer</h1>

      {/* Duration */}
      {showDuration && <div className={`card mb-lg ${styles.animateDelay1}`}>
        <h2 className={`${styles.sectionTitle} mb-md`}>Duration</h2>

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

        {/* Custom time - expandable */}
        <button
          type="button"
          className={styles.expandHeader}
          onClick={() => setDurationExpanded(!durationExpanded)}
          aria-expanded={durationExpanded}
        >
          <span className={styles.expandLabel}>Custom</span>
          <span className={styles.expandSummary}>
            {hours > 0 || seconds > 0 ? `${hours}h ${minutes}m ${seconds}s` : ''}
          </span>
          <svg
            className={`${styles.expandIcon} ${durationExpanded ? styles.expanded : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {durationExpanded && (
          <div className={styles.expandContent}>
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

            {/* Preparation Time (settle-in) */}
            <div className={styles.preparationSection}>
              <label className="form-label">Preparation Time</label>
              <p className={styles.preparationHint}>Time to settle in before meditation begins</p>
              <div className={styles.preparationPresets}>
                {PREPARATION_PRESETS.map(preset => (
                  <button
                    key={preset.seconds}
                    type="button"
                    className={`${styles.prepPresetButton} ${!customPrepTime && preparationTime === preset.seconds ? styles.prepPresetActive : ''}`}
                    onClick={() => {
                      setPreparationTime(preset.seconds);
                      setCustomPrepTime(false);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.prepPresetButton} ${customPrepTime ? styles.prepPresetActive : ''}`}
                  onClick={() => setCustomPrepTime(true)}
                >
                  Custom
                </button>
              </div>
              {customPrepTime && (
                <div className={styles.customPrepInput}>
                  <input
                    type="number"
                    className="input"
                    value={preparationTime}
                    onChange={(e) => setPreparationTime(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
                    min="0"
                    max="120"
                    aria-label="Custom preparation time in seconds"
                  />
                  <span className={styles.prepInputLabel}>seconds</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>}

      {/* Sounds */}
      {showSounds && <div className={`card mb-lg ${styles.animateDelay2}`}>
        <button
          type="button"
          className={styles.expandHeader}
          onClick={() => setSoundsExpanded(!soundsExpanded)}
          aria-expanded={soundsExpanded}
        >
          <h2 className={styles.sectionTitle}>Sounds</h2>
          <span className={styles.expandSummary}>
            {DEFAULT_SOUNDS[beginningSound]?.name || 'None'} / {DEFAULT_SOUNDS[endingSound]?.name || 'None'}
          </span>
          <svg
            className={`${styles.expandIcon} ${soundsExpanded ? styles.expanded : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {soundsExpanded && (
          <div className={styles.expandContent}>
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
                  className={`${styles.previewButton} ${playingSound === beginningSound ? styles.playing : ''}`}
                  onClick={() => previewSound(beginningSound)}
                  disabled={beginningSound === 'none'}
                  aria-label={playingSound === beginningSound ? "Stop preview" : "Preview sound"}
                >
                  {playingSound === beginningSound ? <PauseIcon /> : <PlayIcon />}
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
                  className={`${styles.previewButton} ${playingSound === endingSound ? styles.playing : ''}`}
                  onClick={() => previewSound(endingSound)}
                  disabled={endingSound === 'none'}
                  aria-label={playingSound === endingSound ? "Stop preview" : "Preview sound"}
                >
                  {playingSound === endingSound ? <PauseIcon /> : <PlayIcon />}
                </button>
              </div>
            </div>

            {(beginningSound !== 'none' || endingSound !== 'none') && (
              <div className="form-group">
                <label className="form-label">Bell Volume: {bellVolume}%</label>
                <input
                  type="range"
                  className={styles.volumeSlider}
                  value={bellVolume}
                  onChange={(e) => setBellVolume(parseInt(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
            )}

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
                  className={`${styles.previewButton} ${playingSound === backgroundSound ? styles.playing : ''}`}
                  onClick={() => previewSound(backgroundSound)}
                  disabled={backgroundSound === 'none'}
                  aria-label={playingSound === backgroundSound ? "Stop preview" : "Preview sound"}
                >
                  {playingSound === backgroundSound ? <PauseIcon /> : <PlayIcon />}
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
        )}
      </div>}

      {/* Interval Bells */}
      {showIntervals && <div className={`card mb-lg ${styles.animateDelay3}`}>
        <button
          type="button"
          className={styles.expandHeader}
          onClick={() => setIntervalsExpanded(!intervalsExpanded)}
          aria-expanded={intervalsExpanded}
        >
          <h2 className={styles.sectionTitle}>Interval Bells</h2>
          <span className={styles.expandSummary}>
            {intervalBells.length === 0 ? 'None' : `${intervalBells.length} bell${intervalBells.length > 1 ? 's' : ''}`}
          </span>
          <svg
            className={`${styles.expandIcon} ${intervalsExpanded ? styles.expanded : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {intervalsExpanded && (
          <div className={styles.expandContent}>
            <div className={styles.intervalHeader}>
              <button
                className="btn btn--secondary"
                onClick={addIntervalBell}
                type="button"
              >
                + Add Bell
              </button>
            </div>

            {intervalBells.length === 0 ? (
              <p className="text-secondary">No interval bells set</p>
            ) : (
              <div className={styles.intervalList}>
                {intervalBells.map((bell, index) => (
                  <div key={index} className={styles.intervalItem}>
                    <button
                      type="button"
                      className={`${styles.repeatToggle} ${bell.repeat ? styles.repeatActive : ''}`}
                      onClick={() => updateIntervalBell(index, 'repeat', !bell.repeat)}
                      aria-label={bell.repeat ? "Switch to single bell" : "Switch to repeating bell"}
                      title={bell.repeat ? "Repeating" : "Single"}
                    >
                      {bell.repeat ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 2l4 4-4 4"/>
                          <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
                          <path d="M7 22l-4-4 4-4"/>
                          <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      )}
                    </button>
                    <span className={styles.intervalPrefix}>{bell.repeat ? 'every' : 'at'}</span>
                    <input
                      type="number"
                      className="input"
                      value={Math.floor(bell.time / 60)}
                      onChange={(e) => updateIntervalBell(index, 'time', parseInt(e.target.value || '0') * 60)}
                      min="1"
                      placeholder="Minutes"
                      aria-label={bell.repeat ? "Repeat interval in minutes" : "Bell time in minutes"}
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
        )}
      </div>}

      {/* Presets */}
      {showPresets && <div className={`card mb-lg ${styles.animateDelay4}`}>
        <button
          type="button"
          className={styles.expandHeader}
          onClick={() => setPresetsExpanded(!presetsExpanded)}
          aria-expanded={presetsExpanded}
        >
          <h2 className={styles.sectionTitle}>Presets</h2>
          <span className={styles.expandSummary}>
            Save & load configurations
          </span>
          <svg
            className={`${styles.expandIcon} ${presetsExpanded ? styles.expanded : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {presetsExpanded && (
          <div className={styles.expandContent}>
            <PresetManager
              duration={{ hours, minutes, seconds }}
              preparationTime={preparationTime}
              beginningSound={beginningSound}
              endingSound={endingSound}
              backgroundSound={backgroundSound}
              backgroundVolume={backgroundVolume}
              bellVolume={bellVolume}
              intervalBells={intervalBells}
              onLoadPreset={handleLoadPreset}
            />
          </div>
        )}
      </div>}

      {/* Error message */}
      {error && <p className="form-error text-center mb-md">{error}</p>}

      {/* Begin button */}
      <button
        className={`btn btn--primary btn--large ${styles.beginButton} ${styles.animateDelay5}`}
        onClick={handleStart}
      >
        BEGIN
      </button>
    </div>
  );
}

export default TimerSetup;
