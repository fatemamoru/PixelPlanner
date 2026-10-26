import { useNotifications } from '../app/NotificationContext';
import styles from './NotificationRegion.module.css';

/**
 * Single surface for confirmations and errors (Spec: Surfacing Mechanism).
 * Success uses role="status"/aria-live="polite"; errors use role="alert"/
 * aria-live="assertive" so screen readers are informed without moving focus.
 * Messages never rely on color alone - each carries a text label prefix.
 */
export function NotificationRegion() {
  const { toasts, dismiss } = useNotifications();
  return (
    <div className={styles.region} aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles.toast} ${t.kind === 'alert' ? styles.alert : styles.status}`}
          role={t.kind === 'alert' ? 'alert' : 'status'}
        >
          <span className={styles.label}>{t.kind === 'alert' ? 'Error:' : 'Done:'}</span>
          <span>{t.message}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
