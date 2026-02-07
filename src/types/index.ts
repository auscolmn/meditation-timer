// Theme types
export type Theme = 'light' | 'dark' | 'auto';

// Sound types
export type SoundType = 'bell' | 'background' | 'none';

// Session object - represents a meditation session
export interface Session {
  id: string;
  date: string;           // YYYY-MM-DD
  timestamp: string;      // ISO string
  duration: number;       // seconds
  completed: boolean;
  endedEarly: boolean;
  manual?: boolean;
}

// Duration object
export interface Duration {
  hours: number;
  minutes: number;
  seconds: number;
}

// Interval bell configuration
export interface IntervalBell {
  time: number;           // seconds from start (for single) or interval (for repeating)
  sound: string;          // sound ID
  repeat?: boolean;       // if true, repeat every `time` seconds
}

// Settings object - user preferences
export interface Settings {
  lastDuration: Duration;
  lastBeginningSound: string;
  lastEndingSound: string;
  lastBackgroundSound: string;
  backgroundVolume: number;
  bellVolume: number;
  lastIntervalBells: IntervalBell[];
  focusMode: boolean;
  preparationTime: number;
  theme?: Theme;
  // Streak freeze settings
  freezesAvailable?: number;
  freezesPerMonth?: number;
  lastFreezeGrantMonth?: string;  // YYYY-MM
}

// Custom sound uploaded by user
export interface CustomSound {
  id: string;
  name: string;
  dataUrl: string;
  type: 'bell' | 'background';
}

// Quote object
export interface Quote {
  id: string;
  text: string;
  author: string;
}

// Default sound definition
export interface DefaultSound {
  id: string;
  name: string;
  src: string | null;
  type: SoundType;
}

// Streak goal milestone
export interface StreakGoal {
  days: number;
  badge: string;
  label: string;
}

// Preparation time preset
export interface PreparationPreset {
  label: string;
  seconds: number;
}

// Timer configuration passed to ActiveTimer
export interface TimerConfig {
  duration: number;
  beginningSound: string;
  endingSound: string;
  backgroundSound: string;
  backgroundVolume: number;
  bellVolume: number;
  intervalBells: IntervalBell[];
  preparationTime: number;
}

// Timer preset saved by user
export interface TimerPreset {
  id: string;
  name: string;
  duration: Duration;
  preparationTime: number;
  beginningSound: string;
  endingSound: string;
  backgroundSound: string;
  backgroundVolume: number;
  bellVolume: number;
  intervalBells: IntervalBell[];
  createdAt: string;
}

// Draft timer settings - persists during navigation
export interface DraftTimerSettings {
  duration: Duration;
  preparationTime: number;
  beginningSound: string;
  endingSound: string;
  backgroundSound: string;
  backgroundVolume: number;
  bellVolume: number;
  intervalBells: IntervalBell[];
}

// Streak freeze record
export interface StreakFreeze {
  id: string;
  date: string;           // YYYY-MM-DD
  reason?: string;
  createdAt: string;
}

// Data export format
export interface ExportData {
  version: '1.0.0';
  exportDate: string;
  data: {
    sessions: Session[];
    settings: Settings;
    quotes: Quote[];
    customSounds: CustomSound[];
    presets: TimerPreset[];
    streakFreezes: StreakFreeze[];
  };
}

// Streak statistics returned by useStreak hook
export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalTime: number;
  completedGoals: StreakGoal[];
  currentGoal: StreakGoal | null;
  nextGoal: StreakGoal | null;
  progressPercent: number;
  daysToNextGoal: number;
  allGoalsCompleted: boolean;
}

// App context value
export interface AppContextValue {
  // State
  sessions: Session[];
  settings: Settings;
  quotes: Quote[];
  customSounds: CustomSound[];
  presets: TimerPreset[];
  streakFreezes: StreakFreeze[];
  draftTimerSettings: DraftTimerSettings | null;

  // Session actions
  addSession: (session: Omit<Session, 'id' | 'date' | 'timestamp'>) => Session;
  deleteSession: (sessionId: string) => void;
  addManualSession: (date: string, duration: number) => Session;

  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;

  // Quote actions
  addQuote: (quote: Omit<Quote, 'id'>) => Quote;
  updateQuote: (quoteId: string, updates: Partial<Quote>) => void;
  deleteQuote: (quoteId: string) => void;
  resetQuotes: () => void;
  getDailyQuote: () => Quote | null;

  // Custom sound actions
  addCustomSound: (sound: Omit<CustomSound, 'id'>) => CustomSound;
  deleteCustomSound: (soundId: string) => void;

  // Preset actions
  addPreset: (preset: Omit<TimerPreset, 'id' | 'createdAt'>) => TimerPreset;
  updatePreset: (presetId: string, updates: Partial<TimerPreset>) => void;
  deletePreset: (presetId: string) => void;

  // Streak freeze actions
  addStreakFreeze: (date: string, reason?: string) => StreakFreeze;
  deleteStreakFreeze: (freezeId: string) => void;
  useFreeze: () => boolean;
  grantMonthlyFreezes: () => void;

  // Data management
  exportAllData: () => ExportData;
  importAllData: (data: ExportData) => void;

  // Draft timer settings
  setDraftTimerSettings: (settings: DraftTimerSettings | null) => void;
}

// Navigation tab types
export type NavigationTab = 'timer' | 'progress' | 'settings';

// Screen types
export type Screen =
  | 'welcome'
  | 'timer_setup'
  | 'active_timer'
  | 'completion'
  | 'progress'
  | 'settings';

// Weekly data for charts
export interface WeeklyData {
  day: string;
  sessions: number;
  minutes: number;
}

// Monthly trend data for charts
export interface MonthlyTrend {
  week: string;
  minutes: number;
}

// Time of day distribution for charts
export interface TimeOfDayData {
  period: string;
  count: number;
}

// Duration distribution for charts
export interface DurationDistribution {
  range: string;
  count: number;
}
