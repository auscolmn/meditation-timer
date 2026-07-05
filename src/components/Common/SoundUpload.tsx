import { useState, useRef, ChangeEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { MAX_SOUND_FILE_SIZE, SUPPORTED_AUDIO_FORMATS } from '../../utils/constants';
import { saveSoundFile, mimeFromFilename } from '../../utils/soundStorage';
import styles from './SoundUpload.module.css';

interface SoundUploadProps {
  type: 'bell' | 'background';
  onSoundAdded?: (soundId: string) => void;
}

function SoundUpload({ type, onSoundAdded }: SoundUploadProps) {
  const { addCustomSound, customSounds, deleteCustomSound } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const closeDeleteModal = () => setDeleteTarget(null);
  const deleteModalRef = useFocusTrap<HTMLDivElement>(deleteTarget !== null, closeDeleteModal);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so re-selecting the same file fires onChange again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    setUploadError(null);

    // Some platforms report an empty File.type (common for .m4a) — fall
    // back to inferring the MIME type from the file extension.
    const mimeType = file.type || mimeFromFilename(file.name) || '';

    if (!SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
      setUploadError('Unsupported audio format. Please use an MP3, M4A, WAV, or OGG file.');
      return;
    }

    if (file.size > MAX_SOUND_FILE_SIZE) {
      setUploadError('File too large. Please use a file under 50MB.');
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);

      // Write the audio file first; only register the sound once its data
      // is safely persisted (no more "sound vanishes on next launch").
      const id = crypto.randomUUID();
      const fileName = await saveSoundFile(id, mimeType, dataUrl);

      // Get a clean name from the filename
      const name = file.name.replace(/\.[^/.]+$/, '').slice(0, 30);

      const sound = addCustomSound({ id, name, type, fileName, mimeType });

      if (onSoundAdded) {
        onSoundAdded(sound.id);
      }
    } catch (err) {
      console.error('Error saving sound file:', err);
      setUploadError('Could not save the sound file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteCustomSound(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // Filter custom sounds by type
  const filteredSounds = customSounds.filter(s => s.type === type);

  return (
    <div className={styles.container}>
      {/* Upload button */}
      <label className={`${styles.uploadButton} ${isUploading ? styles.uploadButtonDisabled : ''}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.m4a,.aac,.wav,.ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/ogg"
          onChange={handleFileSelect}
          className={styles.fileInput}
          disabled={isUploading}
        />
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {isUploading ? 'Saving…' : 'Upload Custom Sound'}
      </label>

      {uploadError && (
        <p className={styles.uploadError} role="alert">{uploadError}</p>
      )}

      {/* List of custom sounds */}
      {filteredSounds.length > 0 && (
        <div className={styles.soundList}>
          <p className={styles.listLabel}>Custom {type === 'bell' ? 'Bells' : 'Backgrounds'}:</p>
          {filteredSounds.map(sound => (
            <div key={sound.id} className={styles.soundItem}>
              <span className={styles.soundName}>{sound.name}</span>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setDeleteTarget({ id: sound.id, name: sound.name })}
                aria-label={`Delete ${sound.name}`}
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
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={closeDeleteModal} role="presentation">
          <div
            ref={deleteModalRef}
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-sound-title"
          >
            <h2 id="delete-sound-title" className="modal-title">Delete sound?</h2>
            <p>
              "{deleteTarget.name}" will be removed. Any presets using it will fall back to a default sound.
            </p>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoundUpload;
