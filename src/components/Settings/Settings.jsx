import { useApp } from '../../context/AppContext';
import ThemeToggle from '../Common/ThemeToggle';
import SoundUpload from '../Common/SoundUpload';
import styles from './Settings.module.css';

function Settings() {
  const { customSounds } = useApp();

  const bellSounds = customSounds.filter(s => s.type === 'bell');
  const backgroundSounds = customSounds.filter(s => s.type === 'background');

  return (
    <div className="screen">
      <h1 className={styles.title}>Settings</h1>

      {/* Custom Sounds Section */}
      <div className="card mb-lg">
        <h2 className={styles.sectionTitle}>Custom Sounds</h2>
        <p className={styles.sectionDescription}>
          Upload your own sounds to use during meditation. Supported formats: MP3, WAV, OGG (max 5MB).
        </p>

        {/* Bell Sounds */}
        <div className={styles.soundCategory}>
          <h3 className={styles.categoryTitle}>Bell Sounds</h3>
          <p className={styles.categoryDescription}>
            Used for beginning, ending, and interval bells.
          </p>
          <SoundUpload type="bell" />
          {bellSounds.length === 0 && (
            <p className={styles.emptyMessage}>No custom bell sounds uploaded yet.</p>
          )}
        </div>

        {/* Background Sounds */}
        <div className={styles.soundCategory}>
          <h3 className={styles.categoryTitle}>Background Sounds</h3>
          <p className={styles.categoryDescription}>
            Ambient sounds that play during your meditation session.
          </p>
          <SoundUpload type="background" />
          {backgroundSounds.length === 0 && (
            <p className={styles.emptyMessage}>No custom background sounds uploaded yet.</p>
          )}
        </div>
      </div>

      {/* Appearance Section */}
      <div className="card mb-lg">
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <ThemeToggle />
      </div>

      {/* About Section */}
      <div className="card mb-lg">
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.aboutInfo}>
          <p className={styles.appName}>Sati</p>
          <p className={styles.appVersion}>Version 1.0.0</p>
          <p className={styles.appDescription}>
            A meditation timer app to help you build a consistent practice.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
