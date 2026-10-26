import type { PostingReminder, ScheduledPost } from '../domain/types';
import type { Repository } from '../infra/repository';
import type { Clock } from '../core/clock';
import type { NotificationAdapter } from '../infra/notification';
import { newId } from '../core/id';
import { validateLeadTime } from '../core/validation';

export const DEFAULT_LEAD_MINUTES = 15;
export const MAX_DELIVERY_ATTEMPTS = 3;
export const RETRY_INTERVAL_MS = 60_000;

/** triggerAt = scheduledFor - leadMinutes (Req 8.1, 8.4). Pure helper. */
export function computeTriggerAt(scheduledFor: Date, leadMinutes: number): Date {
  return new Date(scheduledFor.getTime() - leadMinutes * 60_000);
}

/**
 * ReminderService: create/disable reminders, keep trigger time in sync with
 * reschedules, and deliver with a retry policy (Req 8).
 */
export class ReminderService {
  constructor(
    private reminderRepo: Repository<PostingReminder>,
    private scheduledRepo: Repository<ScheduledPost>,
    private clock: Clock,
    private notifier: NotificationAdapter,
  ) {}

  private async findByScheduled(scheduledId: string): Promise<PostingReminder | undefined> {
    const all = await this.reminderRepo.getAll();
    return all.find((r) => r.scheduledPostId === scheduledId);
  }

  /** Enable (or update) a reminder for a scheduled post (Req 8.1, default 15m). */
  async enable(scheduledId: string, leadMinutes: number = DEFAULT_LEAD_MINUTES): Promise<PostingReminder> {
    const check = validateLeadTime(leadMinutes);
    if (!check.valid) throw new Error(check.message); // Req 8.1 range

    const scheduled = await this.scheduledRepo.get(scheduledId);
    if (!scheduled) throw new Error('Scheduled post not found');

    const triggerAt = computeTriggerAt(new Date(scheduled.scheduledFor), leadMinutes);
    const existing = await this.findByScheduled(scheduledId);

    const reminder: PostingReminder = {
      id: existing?.id ?? newId(),
      scheduledPostId: scheduledId,
      leadMinutes,
      triggerAt: triggerAt.toISOString(),
      enabled: true,
      deliveryState: 'pending',
      attempts: 0,
    };
    await this.reminderRepo.put(reminder);
    return reminder;
  }

  /** Disable a reminder and stop notifications (Req 8.6). */
  async disable(scheduledId: string): Promise<void> {
    const existing = await this.findByScheduled(scheduledId);
    if (!existing) return;
    await this.reminderRepo.put({ ...existing, enabled: false });
  }

  /**
   * Recompute the trigger time when the scheduled time changes (Req 8.4). If the
   * new trigger time is already in the past, mark the reminder missed (Req 8.5).
   */
  async onScheduleChanged(scheduledId: string, newWhen: Date): Promise<void> {
    const existing = await this.findByScheduled(scheduledId);
    if (!existing || !existing.enabled) return;
    const triggerAt = computeTriggerAt(newWhen, existing.leadMinutes);
    const isMissed = triggerAt.getTime() < this.clock.now().getTime();
    await this.reminderRepo.put({
      ...existing,
      triggerAt: triggerAt.toISOString(),
      deliveryState: isMissed ? 'missed' : 'pending', // Req 8.5
    });
  }

  /**
   * Attempt delivery for a due reminder, applying the retry policy: up to 3
   * attempts; after the final failure mark 'undelivered' (Req 8.2, 8.3). Returns
   * the updated reminder. (Scheduling/timing of retries is driven by the host's
   * Clock/timer; this method performs one delivery pass with internal retries.)
   */
  async deliverDue(reminder: PostingReminder): Promise<PostingReminder> {
    if (!reminder.enabled || reminder.deliveryState === 'delivered') return reminder;

    const scheduled = await this.scheduledRepo.get(reminder.scheduledPostId);
    const title = 'Time to post';
    const body = scheduled ? `"${scheduled.idea.title}" is due.` : 'A scheduled post is due.';

    let attempts = reminder.attempts;
    for (; attempts < MAX_DELIVERY_ATTEMPTS; ) {
      attempts++;
      const ok = await this.notifier.deliver({
        reminderId: reminder.id,
        scheduledPostId: reminder.scheduledPostId,
        title,
        body,
      });
      if (ok) {
        const delivered: PostingReminder = {
          ...reminder,
          attempts,
          deliveryState: 'delivered',
        };
        await this.reminderRepo.put(delivered);
        return delivered;
      }
    }

    // All attempts failed (Req 8.3): record undelivered.
    const undelivered: PostingReminder = {
      ...reminder,
      attempts,
      deliveryState: 'undelivered',
    };
    await this.reminderRepo.put(undelivered);
    return undelivered;
  }

  async getForScheduled(scheduledId: string): Promise<PostingReminder | undefined> {
    return this.findByScheduled(scheduledId);
  }

  async listUndelivered(): Promise<PostingReminder[]> {
    const all = await this.reminderRepo.getAll();
    return all.filter((r) => r.deliveryState === 'undelivered' || r.deliveryState === 'missed');
  }
}
