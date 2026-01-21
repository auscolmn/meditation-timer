import styles from './Navigation.module.css';

// Timer icon SVG
const TimerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// Progress/Chart icon SVG
const ProgressIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/>
    <path d="M18 17V9"/>
    <path d="M13 17V5"/>
    <path d="M8 17v-3"/>
  </svg>
);

function Navigation({ activeTab, onTabChange }) {
  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      <button
        className={`${styles.tab} ${activeTab === 'timer' ? styles.active : ''}`}
        onClick={() => onTabChange('timer')}
        aria-current={activeTab === 'timer' ? 'page' : undefined}
      >
        <TimerIcon />
        <span className={styles.label}>Timer</span>
      </button>

      <button
        className={`${styles.tab} ${activeTab === 'progress' ? styles.active : ''}`}
        onClick={() => onTabChange('progress')}
        aria-current={activeTab === 'progress' ? 'page' : undefined}
      >
        <ProgressIcon />
        <span className={styles.label}>Progress</span>
      </button>
    </nav>
  );
}

export default Navigation;
