import { useApp } from '../../context/AppContext';
import styles from './StorageErrorToast.module.css';

/**
 * Global banner surfacing persistence failures from any of the app's
 * stores (sessions, settings, quotes, custom sounds, presets).
 *
 * Renders nothing while storage is healthy. Deliberately persistent while
 * an error stands — "your data is not saving" should not auto-dismiss —
 * and clears automatically when the next write to the failing store
 * succeeds (usePersistedState resets its error on setValue).
 */
export default function StorageErrorToast() {
  const { storageError } = useApp();

  if (!storageError) return null;

  return (
    <div className={styles.toast} role="alert">
      {storageError}
    </div>
  );
}
