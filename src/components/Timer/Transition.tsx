import { useState, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';
import styles from './Transition.module.css';

const PHRASES = [
  'Breathe',
  'Let go',
  'Be still',
  'Drop out',
  'Relax',
  'Be here now',
];

// Timing (ms)
const STILLNESS = 300;
const PHRASE_FADE_IN = 1400;
const PHRASE_HOLD = 0;
const PHRASE_FADE_OUT = 800;
const FADE_TO_TIMER = 400;

type Phase = 'void' | 'phrase-in' | 'phrase-hold' | 'phrase-out' | 'done';

interface TransitionProps {
  onReady: () => void;
  onComplete: () => void;
}

function Transition({ onReady, onComplete }: TransitionProps) {
  const [phase, setPhase] = useState<Phase>('void');

  const phrase = useMemo(
    () => PHRASES[Math.floor(Math.random() * PHRASES.length)],
    []
  );

  const skip = useCallback(() => {
    setPhase('done');
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') skip();
  };

  // Phase sequencing
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    switch (phase) {
      case 'void':
        timer = setTimeout(() => setPhase('phrase-in'), STILLNESS);
        break;
      case 'phrase-in':
        timer = setTimeout(() => setPhase('phrase-hold'), PHRASE_FADE_IN);
        break;
      case 'phrase-hold':
        timer = setTimeout(() => setPhase('phrase-out'), PHRASE_HOLD);
        break;
      case 'phrase-out':
        timer = setTimeout(() => setPhase('done'), PHRASE_FADE_OUT);
        break;
      case 'done':
        onReady();
        timer = setTimeout(() => onComplete(), FADE_TO_TIMER);
        break;
    }

    return () => clearTimeout(timer);
  }, [phase, onReady, onComplete]);

  const showPhrase = phase === 'phrase-in' || phase === 'phrase-hold' || phase === 'phrase-out';
  const phraseVisible = phase === 'phrase-hold' || phase === 'phrase-in';
  const isDone = phase === 'done';

  return (
    <div
      className={`${styles.container} ${isDone ? styles.fadeOut : ''}`}
      onClick={skip}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Tap to skip transition"
    >
      {showPhrase && (
        <p className={`${styles.phrase} ${phraseVisible ? styles.phraseVisible : ''}`}>
          {phrase}
        </p>
      )}
    </div>
  );
}

export default Transition;
