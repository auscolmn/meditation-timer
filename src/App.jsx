import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Navigation from './components/Navigation/Navigation';
import Welcome from './components/Welcome/Welcome';
import TimerSetup from './components/Timer/TimerSetup';
import ActiveTimer from './components/Timer/ActiveTimer';
import Completion from './components/Completion/Completion';
import Progress from './components/Progress/Progress';
import './App.css';

// App screens/views
const SCREENS = {
  WELCOME: 'welcome',
  TIMER_SETUP: 'timer_setup',
  ACTIVE_TIMER: 'active_timer',
  COMPLETION: 'completion',
  PROGRESS: 'progress'
};

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.WELCOME);
  const [timerConfig, setTimerConfig] = useState(null);
  const [completedSession, setCompletedSession] = useState(null);

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

      default:
        return <Welcome onStart={goToTimerSetup} />;
    }
  };

  // Determine active tab for navigation
  const getActiveTab = () => {
    if (currentScreen === SCREENS.PROGRESS) return 'progress';
    return 'timer';
  };

  // Handle tab navigation
  const handleTabChange = (tab) => {
    if (tab === 'timer') {
      // If in active timer or completion, go back to setup
      if (currentScreen === SCREENS.ACTIVE_TIMER) {
        // Don't navigate away from active timer via tabs
        return;
      }
      setCurrentScreen(SCREENS.TIMER_SETUP);
    } else if (tab === 'progress') {
      if (currentScreen === SCREENS.ACTIVE_TIMER) {
        // Don't navigate away from active timer via tabs
        return;
      }
      setCurrentScreen(SCREENS.PROGRESS);
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
