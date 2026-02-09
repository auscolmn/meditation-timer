import { useEffect, useState, KeyboardEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../hooks/useTheme';
import styles from './Welcome.module.css';

const AUTO_TRANSITION_SECONDS = 5;

interface WelcomeProps {
  onStart: () => void;
}

function Welcome({ onStart }: WelcomeProps) {
  const { getDailyQuote } = useApp();
  const { effectiveTheme } = useTheme();
  const quote = getDailyQuote();

  const logoSrc = effectiveTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png';
  const [countdown, setCountdown] = useState(AUTO_TRANSITION_SECONDS);

  // Visual countdown and auto-transition
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onStart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onStart]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onStart();
  };

  return (
    <div
      className={`screen screen--centered ${styles.tappable}`}
      onClick={onStart}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Tap anywhere to start meditation timer"
    >
      <div className={styles.container}>
        <img src={logoSrc} alt="Sati logo" className={styles.logo} />
        <h1 className={styles.title}>Sati</h1>

        {quote && (
          <blockquote className={styles.quote}>
            <p className={styles.quoteText}>"{quote.text}"</p>
            <footer className={styles.quoteAuthor}>— {quote.author}</footer>
          </blockquote>
        )}

        <p className={styles.countdownHint}>
          Tap anywhere or wait {countdown}s
        </p>
      </div>
    </div>
  );
}

export default Welcome;
