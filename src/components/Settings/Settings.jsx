import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ThemeToggle from '../Common/ThemeToggle';
import SoundUpload from '../Common/SoundUpload';
import styles from './Settings.module.css';

function Settings() {
  const { customSounds, settings, updateSettings } = useApp();
  const [notificationStatus, setNotificationStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const bellSounds = customSounds.filter(s => s.type === 'bell');
  const backgroundSounds = customSounds.filter(s => s.type === 'background');

  // Handle reminder toggle
  const handleReminderToggle = async () => {
    if (!settings.reminderEnabled) {
      // Enabling - request permission first
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setNotificationStatus(permission);
        if (permission === 'granted') {
          updateSettings({ reminderEnabled: true });
        }
      }
    } else {
      // Disabling
      updateSettings({ reminderEnabled: false });
    }
  };

  // Handle reminder time change
  const handleReminderTimeChange = (e) => {
    updateSettings({ reminderTime: e.target.value });
  };

  // Handle focus mode toggle
  const handleFocusModeToggle = () => {
    updateSettings({ focusMode: !settings.focusMode });
  };

  return (
    <div className="screen">
      <h1 className={styles.title}>Settings</h1>

      {/* Custom Sounds Section */}
      <div className={`card mb-lg ${styles.animateDelay1}`}>
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

      {/* Reminders Section */}
      <div className={`card mb-lg ${styles.animateDelay2}`}>
        <h2 className={styles.sectionTitle}>Daily Reminder</h2>
        <p className={styles.sectionDescription}>
          Get a daily notification to remind you to meditate.
        </p>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Enable Reminder</span>
            {notificationStatus === 'denied' && (
              <span className={styles.settingHint}>Notifications blocked in browser</span>
            )}
            {notificationStatus === 'unsupported' && (
              <span className={styles.settingHint}>Notifications not supported</span>
            )}
          </div>
          <button
            className={`${styles.toggle} ${settings.reminderEnabled ? styles.toggleOn : ''}`}
            onClick={handleReminderToggle}
            disabled={notificationStatus === 'denied' || notificationStatus === 'unsupported'}
            aria-label="Toggle reminder"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>

        {settings.reminderEnabled && (
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Reminder Time</span>
            <input
              type="time"
              className={styles.timeInput}
              value={settings.reminderTime || '09:00'}
              onChange={handleReminderTimeChange}
            />
          </div>
        )}
      </div>

      {/* Meditation Section */}
      <div className={`card mb-lg ${styles.animateDelay3}`}>
        <h2 className={styles.sectionTitle}>Meditation</h2>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Focus Mode</span>
            <span className={styles.settingHint}>Hide timer countdown during meditation</span>
          </div>
          <button
            className={`${styles.toggle} ${settings.focusMode ? styles.toggleOn : ''}`}
            onClick={handleFocusModeToggle}
            aria-label="Toggle focus mode"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </div>

      {/* Appearance Section */}
      <div className={`card mb-lg ${styles.animateDelay4}`}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <ThemeToggle />
      </div>

      {/* About Section */}
      <div className={`card mb-lg ${styles.animateDelay5}`}>
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
