import type { NavigationTab } from '../../types';
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

// Settings icon SVG
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

function Navigation({ activeTab, onTabChange }: NavigationProps) {
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

      <button
        className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
        onClick={() => onTabChange('settings')}
        aria-current={activeTab === 'settings' ? 'page' : undefined}
      >
        <SettingsIcon />
        <span className={styles.label}>Settings</span>
      </button>
    </nav>
  );
}

export default Navigation;
