import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ThemeToggle from '../Common/ThemeToggle';
import SoundUpload from '../Common/SoundUpload';
import ChevronIcon from '../Common/ChevronIcon';
import DataManagement from './DataManagement';
import styles from './Settings.module.css';

const MAX_QUOTE_LENGTH = 280;

function Settings() {
  const { customSounds, settings, updateSettings, quotes, addQuote, deleteQuote, resetQuotes } = useApp();
  const [soundsExpanded, setSoundsExpanded] = useState(false);
  const [customizeExpanded, setCustomizeExpanded] = useState(false);
  const [quotesExpanded, setQuotesExpanded] = useState(false);
  const [newPresetValue, setNewPresetValue] = useState('');
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');
  const [confirmResetQuotes, setConfirmResetQuotes] = useState(false);

  const bellSounds = customSounds.filter(s => s.type === 'bell');
  const backgroundSounds = customSounds.filter(s => s.type === 'background');

  // Generic toggle handler
  const handleToggle = (key: keyof typeof settings) => () => {
    updateSettings({ [key]: !settings[key] });
  };

  // Custom presets handlers
  const currentPresets = settings.customDurationPresets ?? [5, 10, 15, 20];

  const handleAddPreset = () => {
    const minutes = parseInt(newPresetValue);
    if (minutes >= 1 && minutes <= 120 && !currentPresets.includes(minutes) && currentPresets.length < 6) {
      updateSettings({
        customDurationPresets: [...currentPresets, minutes].sort((a, b) => a - b)
      });
      setNewPresetValue('');
    }
  };

  const handleRemovePreset = (minutes: number) => {
    if (currentPresets.length > 1) {
      updateSettings({
        customDurationPresets: currentPresets.filter(m => m !== minutes)
      });
    }
  };

  // Custom quotes handlers
  const trimmedQuoteText = newQuoteText.trim();
  const canAddQuote = trimmedQuoteText.length > 0 && trimmedQuoteText.length <= MAX_QUOTE_LENGTH;

  const handleAddQuote = () => {
    if (!canAddQuote) return;
    addQuote({ text: trimmedQuoteText, author: newQuoteAuthor.trim() || 'Unknown' });
    setNewQuoteText('');
    setNewQuoteAuthor('');
  };

  // Newest first so a quote you just added is visible without scrolling
  const quotesNewestFirst = [...quotes].reverse();

  const handleResetQuotes = () => {
    if (!confirmResetQuotes) {
      setConfirmResetQuotes(true);
      return;
    }
    resetQuotes();
    setConfirmResetQuotes(false);
  };

  return (
    <div className="screen">
      <h1 className={styles.title}>Settings</h1>

      {/* Appearance */}
      <div className={`card mb-lg ${styles.animateDelay1}`}>
        <ThemeToggle />
      </div>

      {/* Customize Card */}
      <div className={`card mb-lg ${styles.animateDelay2}`}>
        <button
          type="button"
          className={styles.expandHeader}
          onClick={() => setCustomizeExpanded(!customizeExpanded)}
          aria-expanded={customizeExpanded}
        >
          <h2 className={styles.sectionTitle}>Customize</h2>
          <span className={styles.expandSummary}>Timer setup & minimalism</span>
          <ChevronIcon expanded={customizeExpanded} className={styles.expandIcon} expandedClassName={styles.expanded} />
        </button>

        {customizeExpanded && (
          <div className={styles.expandContent}>
            {/* Timer Setup Cards Section */}
            <h3 className={styles.subsectionTitle}>Timer Setup Cards</h3>
            <p className={styles.subsectionHint}>Hidden cards use your last-saved settings</p>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Duration Card</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.showDurationCard !== false ? styles.toggleOn : ''}`}
                onClick={handleToggle('showDurationCard')}
                aria-label="Toggle duration card"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Sounds Card</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.showSoundsCard !== false ? styles.toggleOn : ''}`}
                onClick={handleToggle('showSoundsCard')}
                aria-label="Toggle sounds card"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Interval Bells Card</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.showIntervalsCard !== false ? styles.toggleOn : ''}`}
                onClick={handleToggle('showIntervalsCard')}
                aria-label="Toggle interval bells card"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Presets Card</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.showPresetsCard !== false ? styles.toggleOn : ''}`}
                onClick={handleToggle('showPresetsCard')}
                aria-label="Toggle presets card"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            {/* Quick Actions Section */}
            <h3 className={styles.subsectionTitle}>Quick Actions</h3>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Quick Start</span>
                <span className={styles.settingHint}>Skip setup, start with last settings</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.quickStartEnabled ? styles.toggleOn : ''}`}
                onClick={handleToggle('quickStartEnabled')}
                aria-label="Toggle quick start"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Transition Screen</span>
                <span className={styles.settingHint}>Show calming prompt before meditation</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.transitionEnabled !== false ? styles.toggleOn : ''}`}
                onClick={handleToggle('transitionEnabled')}
                aria-label="Toggle transition screen"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            {/* Minimalism Section */}
            <h3 className={styles.subsectionTitle}>Minimalism</h3>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Focus Mode</span>
                <span className={styles.settingHint}>Hide timer during meditation</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.focusMode ? styles.toggleOn : ''}`}
                onClick={handleToggle('focusMode')}
                aria-label="Toggle focus mode"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Hide Nav During Timer</span>
                <span className={styles.settingHint}>Hide bottom navigation on timer screen</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.hideNavDuringTimer ? styles.toggleOn : ''}`}
                onClick={handleToggle('hideNavDuringTimer')}
                aria-label="Toggle hide nav during timer"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Hide Streak & Stats</span>
                <span className={styles.settingHint}>Hide progress metrics</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.hideStreakStats ? styles.toggleOn : ''}`}
                onClick={handleToggle('hideStreakStats')}
                aria-label="Toggle hide streak stats"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Minimal Completion</span>
                <span className={styles.settingHint}>Show only quote after meditation</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.minimalCompletionScreen ? styles.toggleOn : ''}`}
                onClick={handleToggle('minimalCompletionScreen')}
                aria-label="Toggle minimal completion"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            {/* Duration Presets Section */}
            <h3 className={styles.subsectionTitle}>Duration Presets</h3>
            <p className={styles.subsectionHint}>Quick-start buttons on timer screen (1-6 presets)</p>

            <div className={styles.presetsList}>
              {currentPresets.map(minutes => (
                <div key={minutes} className={styles.presetPill}>
                  <span>{minutes} min</span>
                  {currentPresets.length > 1 && (
                    <button
                      onClick={() => handleRemovePreset(minutes)}
                      className={styles.presetRemove}
                      aria-label={`Remove ${minutes} minute preset`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {currentPresets.length < 6 && (
              <div className={styles.addPresetRow}>
                <input
                  type="number"
                  className={`input ${styles.presetInput}`}
                  value={newPresetValue}
                  onChange={(e) => setNewPresetValue(e.target.value)}
                  min="1"
                  max="120"
                  placeholder="Minutes"
                />
                <button
                  className="btn btn--secondary"
                  onClick={handleAddPreset}
                  disabled={
                    !newPresetValue ||
                    parseInt(newPresetValue) < 1 ||
                    parseInt(newPresetValue) > 120 ||
                    currentPresets.includes(parseInt(newPresetValue))
                  }
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Sounds Section */}
      <div className={`card mb-lg ${styles.animateDelay3}`}>
        <button
          type="button"
          className={styles.expandHeader}
          onClick={() => setSoundsExpanded(!soundsExpanded)}
          aria-expanded={soundsExpanded}
        >
          <h2 className={styles.sectionTitle}>Custom Sounds</h2>
          <span className={styles.expandSummary}>
            {customSounds.length === 0 ? 'None uploaded' : `${customSounds.length} sound${customSounds.length > 1 ? 's' : ''}`}
          </span>
          <ChevronIcon expanded={soundsExpanded} className={styles.expandIcon} expandedClassName={styles.expanded} />
        </button>

        {soundsExpanded && (
          <div className={styles.expandContent}>
            <p className={styles.sectionDescription}>
              Upload your own sounds to use during meditation. Supported formats: MP3, M4A, WAV, OGG (max 50MB).
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

            <p className={styles.tip}>
              Tip: Upload guided meditations as background sounds to listen during your session.
            </p>
          </div>
        )}
      </div>

      {/* Quotes Section */}
      <div className={`card mb-lg ${styles.animateDelay4}`}>
        <button
          type="button"
          className={styles.expandHeader}
          onClick={() => setQuotesExpanded(!quotesExpanded)}
          aria-expanded={quotesExpanded}
        >
          <h2 className={styles.sectionTitle}>Quotes</h2>
          <span className={styles.expandSummary}>
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
          </span>
          <ChevronIcon expanded={quotesExpanded} className={styles.expandIcon} expandedClassName={styles.expanded} />
        </button>

        {quotesExpanded && (
          <div className={styles.expandContent}>
            <p className={styles.sectionDescription}>
              One quote is shown on the welcome screen each day. Add your own or remove any you don't want to see.
            </p>

            <div className={styles.quoteForm}>
              <input
                type="text"
                className="input"
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                maxLength={MAX_QUOTE_LENGTH}
                placeholder="Quote"
                aria-label="Quote text"
              />
              <div className={styles.quoteFormRow}>
                <input
                  type="text"
                  className="input"
                  value={newQuoteAuthor}
                  onChange={(e) => setNewQuoteAuthor(e.target.value)}
                  maxLength={80}
                  placeholder="Author (optional)"
                  aria-label="Quote author"
                />
                <button
                  className="btn btn--secondary"
                  onClick={handleAddQuote}
                  disabled={!canAddQuote}
                >
                  Add
                </button>
              </div>
            </div>

            {quotes.length === 0 ? (
              <p className={styles.emptyMessage}>No quotes. The welcome screen will show none until you add one.</p>
            ) : (
              <ul className={styles.quoteList}>
                {quotesNewestFirst.map(quote => (
                  <li key={quote.id} className={styles.quoteItem}>
                    <div className={styles.quoteBody}>
                      <p className={styles.quoteText}>{quote.text}</p>
                      <p className={styles.quoteAuthor}>{quote.author}</p>
                    </div>
                    <button
                      onClick={() => deleteQuote(quote.id)}
                      className={styles.presetRemove}
                      aria-label={`Remove quote by ${quote.author}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              className={`btn btn--secondary btn--full ${styles.quoteReset}`}
              onClick={handleResetQuotes}
              onBlur={() => setConfirmResetQuotes(false)}
            >
              {confirmResetQuotes ? 'Tap again to restore defaults and remove your quotes' : 'Restore default quotes'}
            </button>
          </div>
        )}
      </div>

      {/* Data Management Section */}
      <div className={`card mb-lg ${styles.animateDelay5}`}>
        <DataManagement />
      </div>

      {/* About Section */}
      <div className={`card mb-lg ${styles.animateDelay5}`}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.aboutInfo}>
          <p className={styles.appName}>Sati</p>
          <p className={styles.appVersion}>Version {__APP_VERSION__}</p>
          <p className={styles.appDescription}>
            A simple meditation timer app to help you build a consistent practice. Built with love for the benefit of all beings.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
