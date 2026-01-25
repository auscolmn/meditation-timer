import { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { useTheme } from './hooks/useTheme';
import Navigation from './components/Navigation/Navigation';
import Welcome from './components/Welcome/Welcome';
import TimerSetup from './components/Timer/TimerSetup';
import ActiveTimer from './components/Timer/ActiveTimer';
import Completion from './components/Completion/Completion';
import Progress from './components/Progress/Progress';
import Settings from './components/Settings/Settings';
import './App.css';

// App screens/views
const SCREENS = {
  WELCOME: 'welcome',
  TIMER_SETUP: 'timer_setup',
  ACTIVE_TIMER: 'active_timer',
  COMPLETION: 'completion',
  PROGRESS: 'progress',
  SETTINGS: 'settings'
};

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.WELCOME);
  const [timerConfig, setTimerConfig] = useState(null);
  const [completedSession, setCompletedSession] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingScreen, setPendingScreen] = useState(null);

  // Initialize theme
  useTheme();

  // Handle screen transitions
  const transitionToScreen = (screen) => {
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
  }, [isTransitioning, pendingScreen]);

  // Navigation handlers
  const goToTimerSetup = () => transitionToScreen(SCREENS.TIMER_SETUP);
  const goToProgress = () => transitionToScreen(SCREENS.PROGRESS);
  const goToWelcome = () => transitionToScreen(SCREENS.WELCOME);

  // Start meditation session
  const startMeditation = (config) => {
    setTimerConfig(config);
    transitionToScreen(SCREENS.ACTIVE_TIMER);
  };

  // Complete meditation session
  const completeMeditation = (session) => {
    setCompletedSession(session);
    transitionToScreen(SCREENS.COMPLETION);
  };

  // End session early (go back to setup)
  const endSessionEarly = (session) => {
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
            config={timerConfig}
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
  const getActiveTab = () => {
    if (currentScreen === SCREENS.PROGRESS) return 'progress';
    if (currentScreen === SCREENS.SETTINGS) return 'settings';
    return 'timer';
  };

  // Handle tab navigation
  const handleTabChange = (tab) => {
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

  // Hide navigation during active timer
  const showNavigation = currentScreen !== SCREENS.ACTIVE_TIMER &&
                         currentScreen !== SCREENS.COMPLETION;

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
