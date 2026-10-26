import type { SavedPost, ScheduledPost } from '../domain/types';
import type { Repository } from '../infra/repository';
import type { Clock } from '../core/clock';
import { newId } from '../core/id';

export class PastDateError extends Error {
  constructor() {
    super('The selected date and time has already passed.');
    this.name = 'PastDateError';
  }
}

/**
 * CalendarService: assign/move/remove scheduled posts with past-date rejection
 * validated against the injected Clock (Req 7). Rejections happen before any
 * repository write, so no state changes on the rejection path.
 */
export class CalendarService {
  constructor(
    private savedRepo: Repository<SavedPost>,
    private scheduledRepo: Repository<ScheduledPost>,
    private clock: Clock,
  ) {}

  isInPast(when: Date): boolean {
    return when.getTime() < this.clock.now().getTime();
  }

  /** Create a Scheduled_Post from a Saved_Post (Req 7.3); reject past (Req 7.4). */
  async assign(savedPostId: string, when: Date): Promise<ScheduledPost> {
    if (this.isInPast(when)) throw new PastDateError(); // Saved_Post unchanged (Req 7.4)
    const saved = await this.savedRepo.get(savedPostId);
    if (!saved) throw new Error('Saved post not found');
    const scheduled: ScheduledPost = {
      id: newId(),
      savedPostId: saved.id,
      idea: saved.idea,
      caption: saved.caption,
      scheduledFor: when.toISOString(),
      status: 'pending',
      publishedAt: null,
    };
    await this.scheduledRepo.put(scheduled);
    return scheduled;
  }

  /** Move a Scheduled_Post to a new time (Req 7.5); reject past (Req 7.6). */
  async move(scheduledId: string, when: Date): Promise<ScheduledPost> {
    const existing = await this.scheduledRepo.get(scheduledId);
    if (!existing) throw new Error('Scheduled post not found');
    if (this.isInPast(when)) throw new PastDateError(); // original time retained (Req 7.6)
    const updated: ScheduledPost = { ...existing, scheduledFor: when.toISOString() };
    await this.scheduledRepo.put(updated);
    return updated;
  }

  /** Remove a Scheduled_Post; the underlying Saved_Post is retained (Req 7.7). */
  async remove(scheduledId: string): Promise<void> {
    await this.scheduledRepo.delete(scheduledId);
  }

  async getAll(): Promise<ScheduledPost[]> {
    const all = await this.scheduledRepo.getAll();
    return all.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  }
}
