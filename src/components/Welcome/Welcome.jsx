import { useApp } from '../../context/AppContext';
import styles from './Welcome.module.css';

function Welcome({ onStart }) {
  const { getDailyQuote } = useApp();
  const quote = getDailyQuote();

  return (
    <div className="screen screen--centered">
      <div className={styles.container}>
        <h1 className={styles.title}>Inner Compass</h1>

        {quote && (
          <blockquote className={styles.quote}>
            <p className={styles.quoteText}>"{quote.text}"</p>
            <footer className={styles.quoteAuthor}>
              — {quote.author}
              <span className={styles.quoteCategory}>{quote.category}</span>
            </footer>
          </blockquote>
        )}

        <button
          className="btn btn--primary btn--large btn--full mt-xl"
          onClick={onStart}
        >
          Begin Meditation
        </button>
      </div>
    </div>
  );
}

export default Welcome;
