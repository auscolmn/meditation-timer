// Theme options
export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// localStorage keys
export const STORAGE_KEYS = {
  QUOTES: 'innercompass_quotes',
  SESSIONS: 'innercompass_sessions',
  CUSTOM_SOUNDS: 'innercompass_custom_sounds',
  SETTINGS: 'innercompass_settings',
  LAST_QUOTE_DATE: 'innercompass_last_quote_date',
  DAILY_QUOTE_INDEX: 'innercompass_daily_quote_index'
};

// Default sounds available in the app
export const DEFAULT_SOUNDS = {
  bell: { id: 'bell', name: 'Bell', src: '/sounds/bell.mp3', type: 'bell' },
  gong: { id: 'gong', name: 'Gong', src: '/sounds/gong.mp3', type: 'bell' },
  'tibetan-bowl': { id: 'tibetan-bowl', name: 'Tibetan Bowl', src: '/sounds/tibetan-bowl.mp3', type: 'bell' },
  chime: { id: 'chime', name: 'Chime', src: '/sounds/chime.mp3', type: 'bell' },
  waterfall: { id: 'waterfall', name: 'Waterfall', src: '/sounds/waterfall.mp3', type: 'background' },
  rain: { id: 'rain', name: 'Rain', src: '/sounds/rain.mp3', type: 'background' },
  none: { id: 'none', name: 'None', src: null, type: 'none' }
};

// Streak goals with their badges
export const STREAK_GOALS = [
  { days: 3, badge: '⭐', label: '3 days' },
  { days: 7, badge: '⭐⭐', label: '7 days' },
  { days: 10, badge: '🏆', label: '10 days' },
  { days: 14, badge: '🏆', label: '14 days' },
  { days: 30, badge: '🏆🏆', label: '1 month' },
  { days: 60, badge: '💎', label: '2 months' },
  { days: 90, badge: '💎', label: '3 months' },
  { days: 180, badge: '💎💎', label: '6 months' },
  { days: 240, badge: '💎💎', label: '8 months' },
  { days: 300, badge: '💎💎💎', label: '10 months' },
  { days: 365, badge: '👑', label: '1 year' }
];

// Quote categories
export const QUOTE_CATEGORIES = ['Buddhism', 'Taoism', 'Stoicism', 'Other'];

// Default settings
export const DEFAULT_SETTINGS = {
  lastDuration: { hours: 0, minutes: 10, seconds: 0 },
  lastBeginningSound: 'bell',
  lastEndingSound: 'gong',
  lastBackgroundSound: 'none',
  backgroundVolume: 50,
  lastIntervalBells: [],
  reminderEnabled: false,
  reminderTime: '09:00',
  focusMode: false
};

// Motivational messages for completion screen
export const MOTIVATIONAL_MESSAGES = [
  "Small daily efforts compound into extraordinary results.",
  "Consistency is the bridge between goals and accomplishment.",
  "Every session is an investment in your inner peace.",
  "You're building a habit that will last a lifetime.",
  "The practice is the reward.",
  "Each moment of stillness strengthens your foundation.",
  "Progress isn't always visible, but it's always happening.",
  "Your commitment to yourself is your greatest asset.",
  "Peace grows with every breath you take mindfully.",
  "Today's practice is tomorrow's strength."
];

// Default quotes (30 starter quotes)
export const DEFAULT_QUOTES = [
  // Buddhism (8 quotes)
  {
    id: 'q1',
    text: "The present moment is the only time over which we have dominion.",
    author: "Thích Nhất Hạnh",
    category: "Buddhism"
  },
  {
    id: 'q2',
    text: "Peace comes from within. Do not seek it without.",
    author: "Buddha",
    category: "Buddhism"
  },
  {
    id: 'q3',
    text: "You yourself, as much as anybody in the entire universe, deserve your love and affection.",
    author: "Buddha",
    category: "Buddhism"
  },
  {
    id: 'q4',
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    author: "Buddha",
    category: "Buddhism"
  },
  {
    id: 'q5',
    text: "In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go.",
    author: "Buddha",
    category: "Buddhism"
  },
  {
    id: 'q6',
    text: "The mind is everything. What you think you become.",
    author: "Buddha",
    category: "Buddhism"
  },
  {
    id: 'q7',
    text: "Meditation brings wisdom; lack of meditation leaves ignorance.",
    author: "Buddha",
    category: "Buddhism"
  },
  {
    id: 'q8',
    text: "Be where you are; otherwise you will miss your life.",
    author: "Buddha",
    category: "Buddhism"
  },

  // Taoism (8 quotes)
  {
    id: 'q9',
    text: "Nature does not hurry, yet everything is accomplished.",
    author: "Lao Tzu",
    category: "Taoism"
  },
  {
    id: 'q10',
    text: "When you realize nothing is lacking, the whole world belongs to you.",
    author: "Lao Tzu",
    category: "Taoism"
  },
  {
    id: 'q11',
    text: "Silence is a source of great strength.",
    author: "Lao Tzu",
    category: "Taoism"
  },
  {
    id: 'q12',
    text: "The journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
    category: "Taoism"
  },
  {
    id: 'q13',
    text: "Do you have the patience to wait till your mud settles and the water is clear?",
    author: "Lao Tzu",
    category: "Taoism"
  },
  {
    id: 'q14',
    text: "To the mind that is still, the whole universe surrenders.",
    author: "Lao Tzu",
    category: "Taoism"
  },
  {
    id: 'q15',
    text: "He who knows others is wise; he who knows himself is enlightened.",
    author: "Lao Tzu",
    category: "Taoism"
  },
  {
    id: 'q16',
    text: "Care about what other people think and you will always be their prisoner.",
    author: "Lao Tzu",
    category: "Taoism"
  },

  // Stoicism (8 quotes)
  {
    id: 'q17',
    text: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    category: "Stoicism"
  },
  {
    id: 'q18',
    text: "The obstacle is the way.",
    author: "Marcus Aurelius",
    category: "Stoicism"
  },
  {
    id: 'q19',
    text: "Waste no more time arguing what a good person should be. Be one.",
    author: "Marcus Aurelius",
    category: "Stoicism"
  },
  {
    id: 'q20',
    text: "It's not what happens to you, but how you react to it that matters.",
    author: "Epictetus",
    category: "Stoicism"
  },
  {
    id: 'q21',
    text: "He who fears death will never do anything worthy of a man who is alive.",
    author: "Seneca",
    category: "Stoicism"
  },
  {
    id: 'q22',
    text: "The present time has one advantage over every other - it is our own.",
    author: "Seneca",
    category: "Stoicism"
  },
  {
    id: 'q23',
    text: "Wealth consists not in having great possessions, but in having few wants.",
    author: "Epictetus",
    category: "Stoicism"
  },
  {
    id: 'q24',
    text: "No person has the power to have everything they want, but it is in their power not to want what they don't have.",
    author: "Seneca",
    category: "Stoicism"
  },

  // Other Wisdom (6 quotes)
  {
    id: 'q25',
    text: "In today already walks tomorrow.",
    author: "Samuel Taylor Coleridge",
    category: "Other"
  },
  {
    id: 'q26',
    text: "The privilege of a lifetime is to become who you truly are.",
    author: "Carl Jung",
    category: "Other"
  },
  {
    id: 'q27',
    text: "Knowing yourself is the beginning of all wisdom.",
    author: "Aristotle",
    category: "Other"
  },
  {
    id: 'q28',
    text: "The unexamined life is not worth living.",
    author: "Socrates",
    category: "Other"
  },
  {
    id: 'q29',
    text: "Patience is bitter, but its fruit is sweet.",
    author: "Aristotle",
    category: "Other"
  },
  {
    id: 'q30',
    text: "Between stimulus and response there is a space. In that space is our power to choose our response.",
    author: "Viktor Frankl",
    category: "Other"
  }
];

// Maximum custom sound file size (5MB)
export const MAX_SOUND_FILE_SIZE = 5 * 1024 * 1024;

// Supported audio formats
export const SUPPORTED_AUDIO_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
