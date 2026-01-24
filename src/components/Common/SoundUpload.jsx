import { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { MAX_SOUND_FILE_SIZE, SUPPORTED_AUDIO_FORMATS } from '../../utils/constants';
import styles from './SoundUpload.module.css';

function SoundUpload({ type, onSoundAdded }) {
  const { addCustomSound, customSounds, deleteCustomSound } = useApp();
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!SUPPORTED_AUDIO_FORMATS.includes(file.type)) {
      alert('Invalid audio format. Please use MP3, WAV, or OGG files.');
      return;
    }

    // Validate file size
    if (file.size > MAX_SOUND_FILE_SIZE) {
      alert('File too large. Please use a file under 5MB.');
      return;
    }

    try {
      // Convert to base64
      const dataUrl = await fileToDataUrl(file);

      // Get a clean name from the filename
      const name = file.name.replace(/\.[^/.]+$/, '').slice(0, 30);

      // Add to custom sounds
      const sound = addCustomSound({
        name,
        dataUrl,
        type // 'bell' or 'background'
      });

      // Notify parent component
      if (onSoundAdded) {
        onSoundAdded(sound.id);
      }
    } catch (err) {
      console.error('Error loading sound file:', err);
      alert('Error loading sound file. Please try again.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = (soundId, e) => {
    e.stopPropagation();
    if (confirm('Delete this custom sound?')) {
      deleteCustomSound(soundId);
    }
  };

  // Filter custom sounds by type
  const filteredSounds = customSounds.filter(s => s.type === type);

  return (
    <div className={styles.container}>
      {/* Upload button */}
      <label className={styles.uploadButton}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Upload Custom Sound
      </label>

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
                onClick={(e) => handleDelete(sound.id, e)}
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
    </div>
  );
}

export default SoundUpload;
