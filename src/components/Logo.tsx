import styles from './Logo.module.css';

/**
 * Single shared logo component, rendered identically across all views (Req 11.4).
 * The mark is decorative (aria-hidden); the wordmark carries the accessible name.
 */
export function Logo() {
  return (
    <span className={styles.logo}>
      <svg className={styles.mark} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <rect x="2" y="2" width="9" height="9" rx="2" fill="var(--color-blue-600)" />
        <rect x="13" y="2" width="9" height="9" rx="2" fill="var(--color-brown-500)" />
        <rect x="2" y="13" width="9" height="9" rx="2" fill="var(--color-brown-500)" />
        <rect x="13" y="13" width="9" height="9" rx="2" fill="var(--color-blue-600)" />
      </svg>
      <span className={styles.wordmark}>Pixel Planner</span>
    </span>
  );
}
