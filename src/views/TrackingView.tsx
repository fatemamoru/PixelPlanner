import { useEffect, useState } from 'react';
import { useServices } from '../app/AppContext';
import styles from './views.module.css';

export function TrackingView() {
  const { posts } = useServices();
  const [counts, setCounts] = useState<{ completed: number; pending: number }>({
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    void posts.counts().then(setCounts);
  }, [posts]);

  return (
    <section className={styles.view} aria-labelledby="tracking-heading">
      <h1 id="tracking-heading">Tracking</h1>
      <div className={styles.countGrid}>
        <div className={`${styles.card} ${styles.countCard}`}>
          <span className={styles.countNumber}>{counts.completed}</span>
          <span>Completed posts</span>
        </div>
        <div className={`${styles.card} ${styles.countCard}`}>
          <span className={styles.countNumber}>{counts.pending}</span>
          <span>Scheduled (not yet published)</span>
        </div>
      </div>
      <p className={styles.muted}>
        Counts update as you publish or revert posts on the calendar.
      </p>
    </section>
  );
}
