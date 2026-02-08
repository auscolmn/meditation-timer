import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useTheme } from './hooks/useTheme';
import { timeToSeconds } from './utils/dateUtils';
import Navigation from './components/Navigation/Navigation';
import Welcome from './components/Welcome/Welcome';
import TimerSetup from './components/Timer/TimerSetup';
import ActiveTimer from './components/Timer/ActiveTimer';
import Completion from './components/Completion/Completion';
import Progress from './components/Progress/Progress';
import Settings from './components/Settings/Settings';
import './App.css';
import type { Screen, TimerConfig, Session, NavigationTab } from './types';

// App screens/views
const SCREENS: Record<string, Screen> = {
  WELCOME: 'welcome',
  TIMER_SETUP: 'timer_setup',
  ACTIVE_TIMER: 'active_timer',
  COMPLETION: 'completion',
  PROGRESS: 'progress',
  SETTINGS: 'settings'
};

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(SCREENS.WELCOME);
  const [timerConfig, setTimerConfig] = useState<TimerConfig | null>(null);
  const [completedSession, setCompletedSession] = useState<Session | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);

  // Get settings for Quick Start and nav hiding
  const { settings } = useApp();

  // Initialize theme
  useTheme();

  // Handle screen transitions
  const transitionToScreen = (screen: Screen) => {
    setIsTransitioning(true);
    setPendingScreen(screen);
  };

  useEffect(() => {
    if (isTransitioning && pendingScreen) {
      const timer = setTimeout(() => {
        setCurrentScreen(pendingScreen);
        setPendingScreen(null);
        setIsTransitioning(false);
      }, 150); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isTransitioning, pendingScreen]);

  // Navigation handlers
  const goToTimerSetup = () => {
    // Quick Start: skip setup and start immediately with last settings
    if (settings.quickStartEnabled && settings.lastDuration) {
      const config: TimerConfig = {
        duration: timeToSeconds(settings.lastDuration),
        preparationTime: settings.preparationTime || 0,
        beginningSound: settings.lastBeginningSound || 'bell1',
        endingSound: settings.lastEndingSound || 'bell1',
        backgroundSound: settings.lastBackgroundSound || 'none',
        bellVolume: settings.bellVolume ?? 80,
        backgroundVolume: settings.backgroundVolume ?? 50,
        intervalBells: settings.lastIntervalBells || []
      };
      startMeditation(config);
    } else {
      transitionToScreen(SCREENS.TIMER_SETUP);
    }
  };
  const goToProgress = () => transitionToScreen(SCREENS.PROGRESS);

  // Start meditation session
  const startMeditation = (config: TimerConfig) => {
    setTimerConfig(config);
    transitionToScreen(SCREENS.ACTIVE_TIMER);
  };

  // Complete meditation session
  const completeMeditation = (session: Session) => {
    setCompletedSession(session);
    transitionToScreen(SCREENS.COMPLETION);
  };

  // End session early (go back to setup)
  const endSessionEarly = (session: Session | null) => {
    if (session) {
      setCompletedSession(session);
      transitionToScreen(SCREENS.COMPLETION);
    } else {
      transitionToScreen(SCREENS.TIMER_SETUP);
    }
  };

  // Meditate again after completion
  const meditateAgain = () => {
    setCompletedSession(null);
    transitionToScreen(SCREENS.TIMER_SETUP);
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case SCREENS.WELCOME:
        return <Welcome onStart={goToTimerSetup} />;

      case SCREENS.TIMER_SETUP:
        return <TimerSetup onStart={startMeditation} />;

      case SCREENS.ACTIVE_TIMER:
        return (
          <ActiveTimer
            config={timerConfig!}
            onComplete={completeMeditation}
            onEnd={endSessionEarly}
          />
        );

      case SCREENS.COMPLETION:
        return (
          <Completion
            session={completedSession}
            onViewProgress={goToProgress}
            onMeditateAgain={meditateAgain}
          />
        );

      case SCREENS.PROGRESS:
        return <Progress />;

      case SCREENS.SETTINGS:
        return <Settings />;

      default:
        return <Welcome onStart={goToTimerSetup} />;
    }
  };

  // Determine active tab for navigation
  const getActiveTab = (): NavigationTab => {
    if (currentScreen === SCREENS.PROGRESS) return 'progress';
    if (currentScreen === SCREENS.SETTINGS) return 'settings';
    return 'timer';
  };

  // Handle tab navigation
  const handleTabChange = (tab: NavigationTab) => {
    // Don't navigate away from active timer via tabs
    if (currentScreen === SCREENS.ACTIVE_TIMER) {
      return;
    }

    if (tab === 'timer') {
      transitionToScreen(SCREENS.TIMER_SETUP);
    } else if (tab === 'progress') {
      transitionToScreen(SCREENS.PROGRESS);
    } else if (tab === 'settings') {
      transitionToScreen(SCREENS.SETTINGS);
    }
  };

  // Hide navigation during active timer and completion
  // Also hide on timer setup if hideNavDuringTimer is enabled
  const showNavigation = currentScreen !== SCREENS.ACTIVE_TIMER &&
                         currentScreen !== SCREENS.COMPLETION &&
                         !(settings.hideNavDuringTimer && currentScreen === SCREENS.TIMER_SETUP);

  return (
    <div className="app">
      <main className={`app-main ${isTransitioning ? 'transitioning' : ''}`}>
        {renderScreen()}
      </main>
      {showNavigation && (
        <Navigation
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
