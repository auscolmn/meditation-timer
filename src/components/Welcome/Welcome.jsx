import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import styles from './Welcome.module.css';

const AUTO_TRANSITION_SECONDS = 5;

function Welcome({ onStart }) {
  const { getDailyQuote } = useApp();
  const quote = getDailyQuote();

  // Auto-transition to timer setup after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onStart();
    }, AUTO_TRANSITION_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [onStart]);

  return (
    <div
      className={`screen screen--centered ${styles.tappable}`}
      onClick={onStart}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onStart()}
      aria-label="Tap anywhere to start meditation timer"
    >
      <div className={styles.container}>
        <h1 className={styles.title}>Sati</h1>

        {quote && (
          <blockquote className={styles.quote}>
            <p className={styles.quoteText}>"{quote.text}"</p>
            <footer className={styles.quoteAuthor}>
              — {quote.author}
              <span className={styles.quoteCategory}>{quote.category}</span>
            </footer>
          </blockquote>
        )}

      </div>
    </div>
  );
}

export default Welcome;
