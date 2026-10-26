import type {
  CaptionSuggestion,
  CompletedPostLike,
  ContentIdea,
  SavedPost,
  ScheduledPost,
} from '../domain/types';
import type { Repository } from '../infra/repository';
import type { Clock } from '../core/clock';
import { newId } from '../core/id';

// A completed post is just a ScheduledPost with status 'completed' + timestamp.
// (The spec's CompletedPost type is structurally this.)
export type { CompletedPostLike };

/**
 * PostService: save/schedule/complete operations. All writes go through the
 * repository and are treated as atomic from the user's perspective: on a
 * repository failure the prior state is preserved and the error propagates so
 * the UI can show a message (Req 6.2, 9.2).
 */
export class PostService {
  constructor(
    private savedRepo: Repository<SavedPost>,
    private scheduledRepo: Repository<ScheduledPost>,
    private clock: Clock,
  ) {}

  /** Save a Content_Idea (optionally with an edited caption) (Req 6.1-6.3). */
  async save(idea: ContentIdea, caption?: CaptionSuggestion | null): Promise<SavedPost> {
    const post: SavedPost = {
      id: newId(),
      idea,
      caption: caption ?? null,
      savedAt: this.clock.now().toISOString(),
    };
    await this.savedRepo.put(post); // may reject -> caller keeps unsaved state (Req 6.2)
    return post;
  }

  /** All saved posts, most-recent-first (Req 6.4). Empty array = empty state (Req 6.5). */
  async listSaved(): Promise<SavedPost[]> {
    const all = await this.savedRepo.getAll();
    return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  /** Remove only the selected saved post (Req 6.6). */
  async deleteSaved(id: string): Promise<void> {
    await this.savedRepo.delete(id);
  }

  /** Mark a scheduled post published (Req 9.1). Status committed only after write. */
  async markPublished(scheduledId: string, at: Date = this.clock.now()): Promise<ScheduledPost> {
    const existing = await this.scheduledRepo.get(scheduledId);
    if (!existing) throw new Error('Scheduled post not found');
    const updated: ScheduledPost = {
      ...existing,
      status: 'completed',
      publishedAt: at.toISOString(),
    };
    await this.scheduledRepo.put(updated); // on failure (Req 9.2) prior status retained
    return updated;
  }

  /** Revert a completed post to pending, clearing the publish timestamp (Req 9.4). */
  async markUnpublished(scheduledId: string): Promise<ScheduledPost> {
    const existing = await this.scheduledRepo.get(scheduledId);
    if (!existing) throw new Error('Scheduled post not found');
    const updated: ScheduledPost = {
      ...existing,
      status: 'pending',
      publishedAt: null,
    };
    await this.scheduledRepo.put(updated);
    return updated;
  }

  /** Completed vs pending counts; they partition the total (Req 9.5). */
  async counts(): Promise<{ completed: number; pending: number }> {
    const all = await this.scheduledRepo.getAll();
    let completed = 0;
    let pending = 0;
    for (const p of all) {
      if (p.status === 'completed') completed++;
      else pending++;
    }
    return { completed, pending };
  }
}
