import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { getMissedDayToAskAbout } from '../../utils/dateUtils';

/**
 * Missed-day check-in.
 *
 * If the user practiced two days ago but has nothing recorded for yesterday,
 * we ask — once — whether they meditated yesterday. A "yes" records a manual
 * session for that date (the same mechanism as adding a session from the
 * calendar), which reconnects their streak. A "no" (or dismissing the prompt)
 * is remembered so we never ask about the same day twice.
 *
 * Renders nothing when there is no missed day worth asking about.
 */
function MissedDayPrompt() {
  const { sessions, settings, updateSettings, addManualSession } = useApp();

  // Decided once per mount; lazy init keeps render pure
  const [missedDate] = useState<string | null>(() =>
    getMissedDayToAskAbout(sessions, settings.lastMissedDayPromptDate)
  );
  const [answered, setAnswered] = useState(false);
  const [showDurationInput, setShowDurationInput] = useState(false);
  const [duration, setDuration] = useState(10);

  const open = missedDate !== null && !answered;

  const markAsked = () => {
    if (missedDate) {
      updateSettings({ lastMissedDayPromptDate: missedDate });
    }
  };

  const handleNo = () => {
    markAsked();
    setAnswered(true);
  };

  const handleAdd = () => {
    if (missedDate && duration > 0) {
      addManualSession(missedDate, duration * 60);
      markAsked();
      setAnswered(true);
    }
  };

  // Escape counts as "no" — the question was seen and declined
  const modalRef = useFocusTrap<HTMLDivElement>(open, () => handleNo());

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleNo} role="presentation">
      <div
        ref={modalRef}
        className="modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="missed-day-title"
      >
        <h2 id="missed-day-title" className="modal-title">
          Did you meditate yesterday?
        </h2>
        <p>
          There's no session recorded for yesterday. If you practiced,
          add it and your streak continues unbroken.
        </p>

        {!showDurationInput ? (
          <div className="modal-actions">
            <button className="btn btn--secondary" onClick={handleNo}>
              No
            </button>
            <button className="btn btn--primary" onClick={() => setShowDurationInput(true)}>
              Yes, I did
            </button>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="missed-day-duration">
                For how long? (minutes)
              </label>
              <input
                id="missed-day-duration"
                type="number"
                className="input"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 0)}
                min="1"
                max="1440"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={handleNo}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleAdd} disabled={duration <= 0}>
                Add Session
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MissedDayPrompt;
