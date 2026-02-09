import type { Theme, DefaultSound, StreakGoal, PreparationPreset, Quote, Settings } from '../types';

// Theme options
export const THEME_OPTIONS: Record<'LIGHT' | 'DARK' | 'AUTO', Theme> = {
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
  DAILY_QUOTE_INDEX: 'innercompass_daily_quote_index',
  PRESETS: 'innercompass_presets',
  STREAK_FREEZES: 'innercompass_streak_freezes'
} as const;

// Default sounds available in the app
export const DEFAULT_SOUNDS: Record<string, DefaultSound> = {
  bell: { id: 'bell', name: 'Bell', src: '/sounds/bell.mp3', type: 'bell' },
  chime: { id: 'chime', name: 'Chime', src: '/sounds/chime.mp3', type: 'bell' },
  'tibetan-bell': { id: 'tibetan-bell', name: 'Tibetan Bell', src: '/sounds/tibetan-bell.mp3', type: 'bell' },
  'tibetan-bowl': { id: 'tibetan-bowl', name: 'Tibetan Bowl', src: '/sounds/tibetan-bowl.mp3', type: 'bell' },
  waterfall: { id: 'waterfall', name: 'Waterfall', src: '/sounds/waterfall.mp3', type: 'background' },
  rain: { id: 'rain', name: 'Rain', src: '/sounds/rain.mp3', type: 'background' },
  none: { id: 'none', name: 'None', src: null, type: 'none' }
};

// Streak goals with their badges (SVG icon identifiers)
export const STREAK_GOALS: StreakGoal[] = [
  { days: 3, badge: 'star', label: '3 days' },
  { days: 7, badge: 'star', label: '7 days' },
  { days: 10, badge: 'trophy', label: '10 days' },
  { days: 14, badge: 'trophy', label: '14 days' },
  { days: 30, badge: 'trophy', label: '1 month' },
  { days: 60, badge: 'gem', label: '2 months' },
  { days: 90, badge: 'gem', label: '3 months' },
  { days: 180, badge: 'gem', label: '6 months' },
  { days: 240, badge: 'gem', label: '8 months' },
  { days: 300, badge: 'gem', label: '10 months' },
  { days: 365, badge: 'crown', label: '1 year' }
];

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  lastDuration: { hours: 0, minutes: 10, seconds: 0 },
  lastBeginningSound: 'bell',
  lastEndingSound: 'tibetan-bell',
  lastBackgroundSound: 'none',
  backgroundVolume: 50,
  bellVolume: 80,
  lastIntervalBells: [],
  focusMode: false,
  preparationTime: 0,
  freezesAvailable: 2,
  freezesPerMonth: 2,
  lastFreezeGrantMonth: '',
  // Customization defaults
  showDurationCard: true,
  showSoundsCard: true,
  showIntervalsCard: true,
  showPresetsCard: true,
  quickStartEnabled: false,
  hideStreakStats: false,
  minimalCompletionScreen: false,
  hideNavDuringTimer: false,
  customDurationPresets: [5, 10, 15, 20],
  transitionEnabled: true
};

// Preparation time presets (in seconds)
export const PREPARATION_PRESETS: PreparationPreset[] = [
  { label: 'None', seconds: 0 },
  { label: '5s', seconds: 5 },
  { label: '10s', seconds: 10 },
  { label: '15s', seconds: 15 }
];

// Default quotes
export const DEFAULT_QUOTES: Quote[] = [
  { id: 'q1', text: "The present moment is the only time over which we have dominion.", author: "Thích Nhất Hạnh" },
  { id: 'q2', text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { id: 'q3', text: "You yourself, as much as anybody in the entire universe, deserve your love and affection.", author: "Buddha" },
  { id: 'q4', text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha" },
  { id: 'q5', text: "In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go.", author: "Buddha" },
  { id: 'q6', text: "The mind is everything. What you think you become.", author: "Buddha" },
  { id: 'q7', text: "Meditation brings wisdom; lack of meditation leaves ignorance.", author: "Buddha" },
  { id: 'q8', text: "Be where you are; otherwise you will miss your life.", author: "Buddha" },
  { id: 'q9', text: "Wonderful, indeed, it is to subdue the mind, so difficult to subdue, ever swift, and seizing whatever it desires. A tamed mind brings happiness.", author: "Dhammapada" },
  { id: 'q10', text: "Hatred is never appeased by hatred in this world. By non-hatred alone is hatred appeased. This is a law eternal.", author: "Dhammapada" },
  { id: 'q11', text: "By effort and heedfulness, discipline and self-mastery, let the wise one make for himself an island which no flood can overwhelm.", author: "Dhammapada" },
  { id: 'q12', text: "A fool who knows his foolishness is wise at least to that extent, but a fool who thinks himself wise is a fool indeed.", author: "Dhammapada" },
  { id: 'q13', text: "Just as a solid rock is not shaken by the storm, even so the wise are not affected by praise or blame.", author: "Dhammapada" },
  { id: 'q14', text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
  { id: 'q15', text: "When you realize nothing is lacking, the whole world belongs to you.", author: "Lao Tzu" },
  { id: 'q16', text: "Silence is a source of great strength.", author: "Lao Tzu" },
  { id: 'q17', text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { id: 'q18', text: "Do you have the patience to wait till your mud settles and the water is clear?", author: "Lao Tzu" },
  { id: 'q19', text: "To the mind that is still, the whole universe surrenders.", author: "Lao Tzu" },
  { id: 'q20', text: "He who knows others is wise; he who knows himself is enlightened.", author: "Lao Tzu" },
  { id: 'q21', text: "Care about what other people think and you will always be their prisoner.", author: "Lao Tzu" },
  { id: 'q22', text: "Simplicity, patience, compassion. These three are your greatest treasures. Simple in actions and thoughts, you return to the source of being.", author: "Tao Te Ching" },
  { id: 'q23', text: "To understand the limitation of things, desire them.", author: "Tao Te Ching" },
  { id: 'q24', text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { id: 'q25', text: "The obstacle is the way.", author: "Marcus Aurelius" },
  { id: 'q26', text: "Waste no more time arguing what a good person should be. Be one.", author: "Marcus Aurelius" },
  { id: 'q27', text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { id: 'q28', text: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.", author: "Marcus Aurelius" },
  { id: 'q29', text: "When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love.", author: "Marcus Aurelius" },
  { id: 'q30', text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { id: 'q31', text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  { id: 'q32', text: "He who fears death will never do anything worthy of a man who is alive.", author: "Seneca" },
  { id: 'q33', text: "The present time has one advantage over every other - it is our own.", author: "Seneca" },
  { id: 'q34', text: "No person has the power to have everything they want, but it is in their power not to want what they don't have.", author: "Seneca" },
  { id: 'q35', text: "Your task is not to seek for love, but merely to seek and find all the barriers within yourself that you have built against it.", author: "Rumi" },
  { id: 'q36', text: "The wound is the place where the Light enters you.", author: "Rumi" },
  { id: 'q37', text: "Stop acting so small. You are the universe in ecstatic motion.", author: "Rumi" },
  { id: 'q38', text: "If you are irritated by every rub, how will your mirror be polished?", author: "Rumi" },
  { id: 'q39', text: "In today already walks tomorrow.", author: "Samuel Taylor Coleridge" },
  { id: 'q40', text: "The privilege of a lifetime is to become who you truly are.", author: "Carl Jung" },
  { id: 'q41', text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { id: 'q42', text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { id: 'q43', text: "The unexamined life is not worth living.", author: "Socrates" },
  { id: 'q44', text: "Patience is bitter, but its fruit is sweet.", author: "Aristotle" },
  { id: 'q45', text: "Between stimulus and response there is a space. In that space is our power to choose our response.", author: "Viktor Frankl" },
  { id: 'q46', text: "Every problem is a gift - without problems we would not grow.", author: "Tony Robbins" },
  { id: 'q47', text: "It's not what we do once in a while that shapes our lives. It's what we do consistently.", author: "Tony Robbins" },
  { id: 'q48', text: "It's not about the goal. It's about growing to become the person that can accomplish that goal.", author: "Tony Robbins" },
  { id: 'q49', text: "This is the real secret of life - to be completely engaged with what you are doing in the here and now. And instead of calling it work, realize it is play.", author: "Alan Watts" }
];

// Maximum custom sound file size (5MB)
export const MAX_SOUND_FILE_SIZE = 5 * 1024 * 1024;

// Supported audio formats
export const SUPPORTED_AUDIO_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
