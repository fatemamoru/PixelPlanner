import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type {
  SavedPost,
  ScheduledPost,
  PostingReminder,
  MarketingService,
} from '../domain/types';
import { InMemoryRepository, type Repository } from './repository';

const DB_NAME = 'pixel-planner';
const DB_VERSION = 1;

export const STORE = {
  savedPosts: 'savedPosts',
  scheduledPosts: 'scheduledPosts',
  reminders: 'reminders',
  preferences: 'preferences',
  services: 'services',
} as const;

interface PreferenceRow {
  id: string;
  value: unknown;
}

interface PixelPlannerDB extends DBSchema {
  savedPosts: { key: string; value: SavedPost; indexes: { savedAt: string } };
  scheduledPosts: {
    key: string;
    value: ScheduledPost;
    indexes: { scheduledFor: string; status: string };
  };
  reminders: {
    key: string;
    value: PostingReminder;
    indexes: { scheduledPostId: string; triggerAt: string };
  };
  preferences: { key: string; value: PreferenceRow };
  services: { key: string; value: MarketingService };
}

type StoreName = keyof PixelPlannerDB;

/** IndexedDB-backed repository for one object store. */
class IdbRepository<T extends { id: string }> implements Repository<T> {
  // Use an untyped handle for the generic CRUD calls; the store schema is
  // enforced at creation time in createRepositories().
  private readonly handle: {
    get: (store: StoreName, key: string) => Promise<unknown>;
    getAll: (store: StoreName) => Promise<unknown[]>;
    put: (store: StoreName, value: unknown) => Promise<unknown>;
    delete: (store: StoreName, key: string) => Promise<void>;
  };

  constructor(db: IDBPDatabase<PixelPlannerDB>, private storeName: StoreName) {
    this.handle = db as unknown as IdbRepository<T>['handle'];
  }

  async get(id: string): Promise<T | undefined> {
    return (await this.handle.get(this.storeName, id)) as T | undefined;
  }

  async getAll(): Promise<T[]> {
    return (await this.handle.getAll(this.storeName)) as T[];
  }

  async put(item: T): Promise<void> {
    await this.handle.put(this.storeName, item);
  }

  async delete(id: string): Promise<void> {
    await this.handle.delete(this.storeName, id);
  }
}

export interface Repositories {
  savedPosts: Repository<SavedPost>;
  scheduledPosts: Repository<ScheduledPost>;
  reminders: Repository<PostingReminder>;
  services: Repository<MarketingService>;
  preferences: Repository<PreferenceRow>;
  /** true when IndexedDB was unavailable and the in-memory fallback is in use. */
  usingFallback: boolean;
}

/**
 * Factory: tries IndexedDB; on any failure (unavailable, denied, quota),
 * transparently returns in-memory repositories so the app stays functional
 * for the session. (Spec: Storage Environment Failure)
 */
export async function createRepositories(): Promise<Repositories> {
  try {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB unavailable');
    }
    const db = await openDB<PixelPlannerDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const saved = database.createObjectStore('savedPosts', { keyPath: 'id' });
        saved.createIndex('savedAt', 'savedAt');

        const scheduled = database.createObjectStore('scheduledPosts', { keyPath: 'id' });
        scheduled.createIndex('scheduledFor', 'scheduledFor');
        scheduled.createIndex('status', 'status');

        const reminders = database.createObjectStore('reminders', { keyPath: 'id' });
        reminders.createIndex('scheduledPostId', 'scheduledPostId');
        reminders.createIndex('triggerAt', 'triggerAt');

        database.createObjectStore('preferences', { keyPath: 'id' });
        database.createObjectStore('services', { keyPath: 'id' });
      },
    });

    return {
      savedPosts: new IdbRepository<SavedPost>(db, 'savedPosts'),
      scheduledPosts: new IdbRepository<ScheduledPost>(db, 'scheduledPosts'),
      reminders: new IdbRepository<PostingReminder>(db, 'reminders'),
      services: new IdbRepository<MarketingService>(db, 'services'),
      preferences: new IdbRepository<PreferenceRow>(db, 'preferences'),
      usingFallback: false,
    };
  } catch {
    return {
      savedPosts: new InMemoryRepository<SavedPost>(),
      scheduledPosts: new InMemoryRepository<ScheduledPost>(),
      reminders: new InMemoryRepository<PostingReminder>(),
      services: new InMemoryRepository<MarketingService>(),
      preferences: new InMemoryRepository<PreferenceRow>(),
      usingFallback: true,
    };
  }
}

/** Build an all-in-memory set of repositories (used by tests). */
export function createInMemoryRepositories(): Repositories {
  return {
    savedPosts: new InMemoryRepository<SavedPost>(),
    scheduledPosts: new InMemoryRepository<ScheduledPost>(),
    reminders: new InMemoryRepository<PostingReminder>(),
    services: new InMemoryRepository<MarketingService>(),
    preferences: new InMemoryRepository<PreferenceRow>(),
    usingFallback: true,
  };
}
