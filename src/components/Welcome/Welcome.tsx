import { useEffect, KeyboardEvent } from 'react';
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

  // Auto-transition to timer setup after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onStart();
    }, AUTO_TRANSITION_SECONDS * 1000);

    return () => clearTimeout(timer);
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

      </div>
    </div>
  );
}

export default Welcome;
