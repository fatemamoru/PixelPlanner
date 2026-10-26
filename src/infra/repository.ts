/**
 * Repository pattern for persistence. Views/services never touch IndexedDB
 * directly. There are two implementations: IndexedDB (production) and
 * in-memory (fallback for private browsing / quota-denied, and for tests).
 * Both honor the same contract so no calling code changes between them.
 */
export interface Repository<T extends { id: string }> {
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  put(item: T): Promise<void>;
  delete(id: string): Promise<void>;
}

/** In-memory repository. Deterministic and synchronous under the hood. */
export class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private store = new Map<string, T>();

  async get(id: string): Promise<T | undefined> {
    const v = this.store.get(id);
    return v ? structuredCloneSafe(v) : undefined;
  }

  async getAll(): Promise<T[]> {
    return Array.from(this.store.values()).map(structuredCloneSafe);
  }

  async put(item: T): Promise<void> {
    this.store.set(item.id, structuredCloneSafe(item));
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
