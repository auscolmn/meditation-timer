import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { TimerPreset, Duration, IntervalBell } from '../../types';
import styles from './PresetManager.module.css';

interface PresetManagerProps {
  // Current timer settings
  duration: Duration;
  preparationTime: number;
  beginningSound: string;
  endingSound: string;
  backgroundSound: string;
  backgroundVolume: number;
  bellVolume: number;
  intervalBells: IntervalBell[];
  // Callback when a preset is loaded
  onLoadPreset: (preset: TimerPreset) => void;
}

function PresetManager({
  duration,
  preparationTime,
  beginningSound,
  endingSound,
  backgroundSound,
  backgroundVolume,
  bellVolume,
  intervalBells,
  onLoadPreset
}: PresetManagerProps) {
  const { presets, addPreset, deletePreset } = useApp();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Save current settings as a preset
  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    addPreset({
      name: presetName.trim(),
      duration,
      preparationTime,
      beginningSound,
      endingSound,
      backgroundSound,
      backgroundVolume,
      bellVolume,
      intervalBells
    });

    setPresetName('');
    setShowSaveModal(false);
  };

  // Load a preset
  const handleLoadPreset = (preset: TimerPreset) => {
    onLoadPreset(preset);
  };

  // Delete a preset
  const handleDeletePreset = (presetId: string) => {
    deletePreset(presetId);
    setShowDeleteConfirm(null);
  };

  return (
    <div className={styles.container}>
      {/* Preset selector dropdown */}
      {presets.length > 0 && (
        <div className={styles.presetSelector}>
          <label className="form-label">Load Preset</label>
          <div className={styles.presetList}>
            {presets.map(preset => (
              <div key={preset.id} className={styles.presetItem}>
                <button
                  type="button"
                  className={styles.presetButton}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <span className={styles.presetName}>{preset.name}</span>
                  <span className={styles.presetInfo}>
                    {preset.duration.hours > 0 && `${preset.duration.hours}h `}
                    {preset.duration.minutes}m
                    {preset.duration.seconds > 0 && ` ${preset.duration.seconds}s`}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => setShowDeleteConfirm(preset.id)}
                  aria-label={`Delete ${preset.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save as preset button */}
      <button
        type="button"
        className={`btn btn--secondary ${styles.saveButton}`}
        onClick={() => setShowSaveModal(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save as Preset
      </button>

      {/* Save preset modal */}
      {showSaveModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSaveModal(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-preset-title"
          >
            <h2 id="save-preset-title" className="modal-title">Save Preset</h2>
            <div className="form-group">
              <label className="form-label">Preset Name</label>
              <input
                type="text"
                className="input"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Morning Meditation"
                maxLength={30}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteConfirm(null)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-preset-title"
          >
            <h2 id="delete-preset-title" className="modal-title">Delete Preset?</h2>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={() => handleDeletePreset(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresetManager;
