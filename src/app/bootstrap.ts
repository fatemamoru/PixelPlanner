import { systemClock } from '../core/clock';
import { TemplateRecommendationEngine } from '../core/engine';
import { createRepositories } from '../infra/db';
import { BrowserNotificationAdapter, type ReminderNotification } from '../infra/notification';
import { SessionService } from '../services/sessionService';
import { PostService } from '../services/postService';
import { CalendarService } from '../services/calendarService';
import { ReminderService } from '../services/reminderService';
import { MARKETING_SERVICES } from '../domain/catalog';
import type { MarketingService } from '../domain/types';
import type { AppServices } from './AppContext';

/**
 * Compose the running application's services on top of the repository layer.
 * On startup we seed the marketing-services catalog if it is empty.
 */
export async function bootstrap(
  onInAppReminder: (n: ReminderNotification) => void,
): Promise<AppServices> {
  const repos = await createRepositories();
  const clock = systemClock;

  const session = new SessionService();
  const posts = new PostService(repos.savedPosts, repos.scheduledPosts, clock);
  const calendar = new CalendarService(repos.savedPosts, repos.scheduledPosts, clock);
  const notifier = new BrowserNotificationAdapter(onInAppReminder);
  const reminders = new ReminderService(repos.reminders, repos.scheduledPosts, clock, notifier);
  const engine = new TemplateRecommendationEngine({ seed: Date.now() & 0xffff });

  // Seed services catalog once (Req 14). Treated as the available catalog.
  const existing = await repos.services.getAll();
  if (existing.length === 0) {
    await Promise.all(MARKETING_SERVICES.map((s) => repos.services.put(s)));
  }

  const loadServices = async (): Promise<MarketingService[]> => {
    const list = await repos.services.getAll();
    return list.sort((a, b) => a.name.localeCompare(b.name));
  };

  const loadPreference = async (key: string): Promise<string | null> => {
    const row = await repos.preferences.get(key);
    return row ? (row.value as string) : null;
  };

  const savePreference = async (key: string, value: string): Promise<void> => {
    await repos.preferences.put({ id: key, value });
  };

  return {
    session,
    posts,
    calendar,
    reminders,
    engine,
    loadServices,
    loadPreference,
    savePreference,
    usingFallback: repos.usingFallback,
  };
}
