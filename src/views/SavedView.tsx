import { useEffect, useState, useCallback } from 'react';
import { Button } from '../components/Button';
import { useServices } from '../app/AppContext';
import { useNotifications } from '../app/NotificationContext';
import { PastDateError } from '../services/calendarService';
import type { SavedPost } from '../domain/types';
import styles from './views.module.css';

export function SavedView() {
  const { posts, calendar } = useServices();
  const { notifySuccess, notifyError } = useNotifications();
  const [saved, setSaved] = useState<SavedPost[] | null>(null);
  const [scheduling, setScheduling] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setSaved(await posts.listSaved());
  }, [posts]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleDelete(id: string) {
    try {
      await posts.deleteSaved(id);
      notifySuccess('Saved post deleted.');
      await refresh();
    } catch {
      notifyError('That post could not be deleted. Please try again.');
    }
  }

  async function handleSchedule(post: SavedPost) {
    const value = scheduling[post.id];
    if (!value) {
      notifyError('Please choose a date and time first.');
      return;
    }
    try {
      await calendar.assign(post.id, new Date(value));
      notifySuccess('Added to your calendar.');
      setScheduling((prev) => ({ ...prev, [post.id]: '' }));
    } catch (e) {
      if (e instanceof PastDateError) {
        notifyError('That date and time has already passed. Pick a future slot.');
      } else {
        notifyError('That post could not be scheduled. Please try again.');
      }
    }
  }

  return (
    <section className={styles.view} aria-labelledby="saved-heading">
      <h1 id="saved-heading">Saved posts</h1>

      {saved === null ? (
        <p role="status">Loading…</p>
      ) : saved.length === 0 ? (
        <p className={styles.empty}>
          No saved posts yet. Generate ideas on the Create tab and save your favorites here.
        </p>
      ) : (
        <ul className={styles.list}>
          {saved.map((post) => (
            <li key={post.id} className={styles.card}>
              <h3>{post.idea.title}</h3>
              <p>{post.idea.description}</p>
              {post.caption && <p className={styles.muted}>Caption: {post.caption.text}</p>}
              <div className={styles.row}>
                <label className={styles.sr} htmlFor={`sched-${post.id}`}>
                  Schedule date and time
                </label>
                <input
                  id={`sched-${post.id}`}
                  className={styles.input}
                  style={{ maxWidth: 240 }}
                  type="datetime-local"
                  value={scheduling[post.id] ?? ''}
                  onChange={(e) =>
                    setScheduling((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                />
                <Button onClick={() => handleSchedule(post)}>Add to calendar</Button>
                <Button variant="secondary" onClick={() => handleDelete(post.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
