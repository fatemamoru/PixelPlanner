import { useCallback, useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { useServices } from '../app/AppContext';
import { useNotifications } from '../app/NotificationContext';
// (services + preference read/write come from useServices)
import { PastDateError } from '../services/calendarService';
import { DEFAULT_LEAD_MINUTES } from '../services/reminderService';
import { validateLeadTime } from '../core/validation';
import type { CalendarViewMode, PostingReminder, ScheduledPost } from '../domain/types';
import styles from './views.module.css';

const VIEW_PREF_KEY = 'calendarViewMode';

export function CalendarView() {
  const { calendar, posts, reminders, loadPreference, savePreference } = useServices();
  const { notifySuccess, notifyError } = useNotifications();

  const [mode, setMode] = useState<CalendarViewMode>('weekly'); // default weekly (Req 7.1)
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [reminderMap, setReminderMap] = useState<Record<string, PostingReminder | undefined>>({});
  const [moveValues, setMoveValues] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const list = await calendar.getAll();
    setScheduled(list);
    const entries = await Promise.all(
      list.map(async (p) => [p.id, await reminders.getForScheduled(p.id)] as const),
    );
    setReminderMap(Object.fromEntries(entries));
  }, [calendar, reminders]);

  useEffect(() => {
    // Restore the last-used view (Req 7.1).
    void loadPreference(VIEW_PREF_KEY).then((v) => {
      if (v === 'weekly' || v === 'monthly') setMode(v);
    });
    void refresh();
  }, [loadPreference, refresh]);

  function switchMode(next: CalendarViewMode) {
    setMode(next); // preserves displayed posts (Req 7.2)
    void savePreference(VIEW_PREF_KEY, next);
  }

  async function handleMove(post: ScheduledPost) {
    const value = moveValues[post.id];
    if (!value) {
      notifyError('Choose a new date and time first.');
      return;
    }
    try {
      await calendar.move(post.id, new Date(value));
      await reminders.onScheduleChanged(post.id, new Date(value));
      notifySuccess('Post rescheduled.');
      setMoveValues((prev) => ({ ...prev, [post.id]: '' }));
      await refresh();
    } catch (e) {
      if (e instanceof PastDateError) {
        notifyError('That date and time has already passed. The post was left where it was.');
      } else {
        notifyError('That post could not be moved. Please try again.');
      }
    }
  }

  async function handleRemove(post: ScheduledPost) {
    try {
      await calendar.remove(post.id);
      notifySuccess('Removed from the calendar. The saved idea was kept.');
      await refresh();
    } catch {
      notifyError('That post could not be removed. Please try again.');
    }
  }

  async function togglePublished(post: ScheduledPost) {
    try {
      if (post.status === 'completed') {
        await posts.markUnpublished(post.id);
        notifySuccess('Marked as not published.');
      } else {
        await posts.markPublished(post.id);
        notifySuccess('Marked as published.');
      }
      await refresh();
    } catch {
      notifyError('The status could not be updated. Please try again.');
    }
  }

  async function toggleReminder(post: ScheduledPost) {
    const current = reminderMap[post.id];
    try {
      if (current?.enabled) {
        await reminders.disable(post.id);
        notifySuccess('Reminder turned off.');
      } else {
        await reminders.enable(post.id, DEFAULT_LEAD_MINUTES);
        notifySuccess(`Reminder set for ${DEFAULT_LEAD_MINUTES} minutes before.`);
      }
      await refresh();
    } catch {
      notifyError('The reminder could not be updated.');
    }
  }

  async function changeLead(post: ScheduledPost, minutes: number) {
    const check = validateLeadTime(minutes);
    if (!check.valid) {
      notifyError(check.message);
      return;
    }
    try {
      await reminders.enable(post.id, minutes);
      await refresh();
    } catch {
      notifyError('The reminder could not be updated.');
    }
  }

  return (
    <section className={styles.view} aria-labelledby="calendar-heading">
      <h1 id="calendar-heading">Content calendar</h1>

      <div className={styles.card}>
        <div className={styles.row} role="group" aria-label="Calendar view">
          <Button
            variant={mode === 'weekly' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'weekly'}
            onClick={() => switchMode('weekly')}
          >
            Weekly
          </Button>
          <Button
            variant={mode === 'monthly' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'monthly'}
            onClick={() => switchMode('monthly')}
          >
            Monthly
          </Button>
          <span className={styles.muted}>Showing {mode} view</span>
        </div>
      </div>

      {scheduled.length === 0 ? (
        <p className={styles.empty}>
          Nothing scheduled yet. Add a saved post to the calendar from the Saved tab.
        </p>
      ) : (
        <ul className={styles.list}>
          {scheduled.map((post) => {
            const rem = reminderMap[post.id];
            return (
              <li key={post.id} className={styles.card}>
                <div className={styles.row}>
                  <h3 style={{ marginRight: 'auto' }}>{post.idea.title}</h3>
                  <span
                    className={`${styles.badge} ${
                      post.status === 'completed' ? styles.badgeCompleted : styles.badgePending
                    }`}
                  >
                    {post.status === 'completed' ? '✓ Published' : '○ Scheduled'}
                  </span>
                </div>
                <p className={styles.muted}>{formatWhen(post.scheduledFor)}</p>

                <div className={styles.row}>
                  <Button variant="secondary" onClick={() => togglePublished(post)}>
                    {post.status === 'completed' ? 'Mark not published' : 'Mark published'}
                  </Button>
                  <Button variant="secondary" onClick={() => toggleReminder(post)}>
                    {rem?.enabled ? 'Reminder on' : 'Set reminder'}
                  </Button>
                  {rem?.enabled && (
                    <>
                      <label className={styles.sr} htmlFor={`lead-${post.id}`}>
                        Reminder lead minutes
                      </label>
                      <input
                        id={`lead-${post.id}`}
                        className={styles.input}
                        style={{ maxWidth: 120 }}
                        type="number"
                        min={0}
                        max={1440}
                        value={rem.leadMinutes}
                        onChange={(e) => changeLead(post, Number(e.target.value))}
                      />
                      <span className={styles.muted}>min before</span>
                    </>
                  )}
                  {rem && (rem.deliveryState === 'undelivered' || rem.deliveryState === 'missed') && (
                    <span className={styles.badge}>Reminder {rem.deliveryState}</span>
                  )}
                </div>

                <div className={styles.row}>
                  <label className={styles.sr} htmlFor={`move-${post.id}`}>
                    New date and time
                  </label>
                  <input
                    id={`move-${post.id}`}
                    className={styles.input}
                    style={{ maxWidth: 240 }}
                    type="datetime-local"
                    value={moveValues[post.id] ?? ''}
                    onChange={(e) =>
                      setMoveValues((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                  />
                  <Button onClick={() => handleMove(post)}>Reschedule</Button>
                  <Button variant="secondary" onClick={() => handleRemove(post)}>
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}


