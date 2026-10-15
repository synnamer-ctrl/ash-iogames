import type { SceneSnapshot, WorldId } from '../../types/game';
import { StorageError, type AutosaveRecord, type Creation, type CreationSummary } from '../../types/persistence';
import { makeId } from '../../utils/rng';

const DB_VERSION = 1;
const CREATIONS = 'creations';
const AUTOSAVE = 'autosave';
const META = 'meta';

function toStorageError(e: unknown, fallback: StorageError['kind'] = 'unknown'): StorageError {
  if (e instanceof StorageError) return e;
  const name = (e as { name?: string } | null)?.name;
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') return new StorageError('quota', 'Storage is full');
  if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'UnknownError') return new StorageError('unavailable', 'Storage is not available');
  return new StorageError(fallback, (e as Error | null)?.message ?? 'Storage error');
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(toStorageError(r.error));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(toStorageError(tx.error));
    tx.onabort = () => reject(toStorageError(tx.error ?? new DOMException('Transaction aborted', 'AbortError')));
  });
}

/**
 * Persistent storage for creations, per-world autosaves and small metadata
 * (discoveries) on top of IndexedDB. Every write resolves only after the
 * transaction has committed, so the UI never reports a save that did not happen.
 */
export class SaveSystem {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory | null = globalThis.indexedDB ?? null, private readonly dbName = 'little-wonder-world') {}

  get available(): boolean {
    return !!this.factory;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.factory) return Promise.reject(new StorageError('unavailable', 'IndexedDB is not supported'));
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        let r: IDBOpenDBRequest;
        try {
          r = this.factory!.open(this.dbName, DB_VERSION);
        } catch (e) {
          reject(toStorageError(e, 'unavailable'));
          return;
        }
        r.onupgradeneeded = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains(CREATIONS)) {
            const s = db.createObjectStore(CREATIONS, { keyPath: 'id' });
            s.createIndex('worldId', 'worldId', { unique: false });
          }
          if (!db.objectStoreNames.contains(AUTOSAVE)) db.createObjectStore(AUTOSAVE, { keyPath: 'worldId' });
          if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
        };
        r.onsuccess = () => {
          const db = r.result;
          db.onversionchange = () => db.close();
          resolve(db);
        };
        r.onerror = () => reject(toStorageError(r.error, 'unavailable'));
        r.onblocked = () => reject(new StorageError('unavailable', 'Storage is blocked by another tab'));
      }).catch((e) => {
        this.dbPromise = null;
        throw e;
      });
    }
    return this.dbPromise;
  }

  private async tx(stores: string | string[], mode: IDBTransactionMode): Promise<IDBTransaction> {
    const db = await this.open();
    try {
      return db.transaction(stores, mode);
    } catch (e) {
      throw toStorageError(e, 'unavailable');
    }
  }

  async listCreations(worldId?: WorldId): Promise<CreationSummary[]> {
    const t = await this.tx(CREATIONS, 'readonly');
    const store = t.objectStore(CREATIONS);
    const source = worldId ? store.index('worldId') : store;
    const out: CreationSummary[] = [];
    await new Promise<void>((resolve, reject) => {
      const cur = source.openCursor(worldId ? IDBKeyRange.only(worldId) : undefined);
      cur.onsuccess = () => {
        const c = cur.result;
        if (!c) return resolve();
        const v = c.value as Creation;
        out.push({ id: v.id, worldId: v.worldId, name: v.name, createdAt: v.createdAt, updatedAt: v.updatedAt, thumbnail: v.thumbnail ?? null });
        c.continue();
      };
      cur.onerror = () => reject(toStorageError(cur.error));
    });
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getCreation(id: string): Promise<Creation> {
    const t = await this.tx(CREATIONS, 'readonly');
    const v = (await req(t.objectStore(CREATIONS).get(id))) as Creation | undefined;
    if (!v) throw new StorageError('not-found', 'Creation not found');
    return v;
  }

  /** Create (no id) or overwrite (existing id) a creation. */
  async saveCreation(input: { id?: string; worldId: WorldId; name: string; snapshot: SceneSnapshot; thumbnail: Blob | null }): Promise<Creation> {
    const now = Date.now();
    let createdAt = now;
    if (input.id) {
      try {
        createdAt = (await this.getCreation(input.id)).createdAt;
      } catch {
        createdAt = now;
      }
    }
    const rec: Creation = {
      id: input.id ?? makeId('c'),
      worldId: input.worldId,
      name: cleanName(input.name),
      createdAt,
      updatedAt: now,
      snapshot: input.snapshot,
      thumbnail: input.thumbnail,
    };
    const t = await this.tx(CREATIONS, 'readwrite');
    t.objectStore(CREATIONS).put(rec);
    await done(t);
    return rec;
  }

  async renameCreation(id: string, name: string): Promise<void> {
    const t = await this.tx(CREATIONS, 'readwrite');
    const store = t.objectStore(CREATIONS);
    const v = (await req(store.get(id))) as Creation | undefined;
    if (!v) throw new StorageError('not-found', 'Creation not found');
    v.name = cleanName(name);
    v.updatedAt = Date.now();
    store.put(v);
    await done(t);
  }

  async deleteCreation(id: string): Promise<void> {
    const t = await this.tx(CREATIONS, 'readwrite');
    t.objectStore(CREATIONS).delete(id);
    await done(t);
  }

  async saveAutosave(worldId: WorldId, snapshot: SceneSnapshot): Promise<void> {
    const t = await this.tx(AUTOSAVE, 'readwrite');
    const rec: AutosaveRecord = { worldId, snapshot, updatedAt: Date.now() };
    t.objectStore(AUTOSAVE).put(rec);
    await done(t);
  }

  async loadAutosave(worldId: WorldId): Promise<AutosaveRecord | null> {
    const t = await this.tx(AUTOSAVE, 'readonly');
    return ((await req(t.objectStore(AUTOSAVE).get(worldId))) as AutosaveRecord | undefined) ?? null;
  }

  async clearAutosave(worldId: WorldId): Promise<void> {
    const t = await this.tx(AUTOSAVE, 'readwrite');
    t.objectStore(AUTOSAVE).delete(worldId);
    await done(t);
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    const t = await this.tx(META, 'readonly');
    const v = (await req(t.objectStore(META).get(key))) as { key: string; value: T } | undefined;
    return v?.value;
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    const t = await this.tx(META, 'readwrite');
    t.objectStore(META).put({ key, value });
    await done(t);
  }
}

export function cleanName(name: string): string {
  const n = name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
  return n.length ? n : 'My creation';
}

export const saveSystem = new SaveSystem();
