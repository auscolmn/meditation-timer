import { useState } from 'react';
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

  // Initialize theme
  useTheme();

  // Navigation handlers
  const goToTimerSetup = () => setCurrentScreen(SCREENS.TIMER_SETUP);
  const goToProgress = () => setCurrentScreen(SCREENS.PROGRESS);
  const goToWelcome = () => setCurrentScreen(SCREENS.WELCOME);

  // Start meditation session
  const startMeditation = (config) => {
    setTimerConfig(config);
    setCurrentScreen(SCREENS.ACTIVE_TIMER);
  };

  // Complete meditation session
  const completeMeditation = (session) => {
    setCompletedSession(session);
    setCurrentScreen(SCREENS.COMPLETION);
  };

  // End session early (go back to setup)
  const endSessionEarly = (session) => {
    if (session) {
      setCompletedSession(session);
      setCurrentScreen(SCREENS.COMPLETION);
    } else {
      setCurrentScreen(SCREENS.TIMER_SETUP);
    }
  };

  // Meditate again after completion
  const meditateAgain = () => {
    setCompletedSession(null);
    setCurrentScreen(SCREENS.TIMER_SETUP);
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
      setCurrentScreen(SCREENS.TIMER_SETUP);
    } else if (tab === 'progress') {
      setCurrentScreen(SCREENS.PROGRESS);
    } else if (tab === 'settings') {
      setCurrentScreen(SCREENS.SETTINGS);
    }
  };

  // Hide navigation during active timer
  const showNavigation = currentScreen !== SCREENS.ACTIVE_TIMER &&
                         currentScreen !== SCREENS.COMPLETION;

  return (
    <div className="app">
      <main className="app-main">
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
