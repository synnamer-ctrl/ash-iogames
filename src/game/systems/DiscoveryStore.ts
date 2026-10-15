import { DISCOVERY_IDS } from '../../data/discoveries';
import { saveSystem } from './SaveSystem';
import { Emitter } from '../GameBridge';

/** Remembers which optional surprises have been found (persisted in IndexedDB). */
class DiscoveryStoreImpl extends Emitter<{ changed: ReadonlySet<string> }> {
  private found = new Set<string>();
  private loaded: Promise<void> | null = null;

  load(): Promise<void> {
    if (!this.loaded) {
      this.loaded = saveSystem
        .getMeta<string[]>('discoveries')
        .then((ids) => {
          for (const id of ids ?? []) if (DISCOVERY_IDS.has(id)) this.found.add(id);
          this.emit('changed', this.found);
        })
        .catch(() => undefined);
    }
    return this.loaded;
  }

  has(id: string): boolean {
    return this.found.has(id);
  }

  get all(): ReadonlySet<string> {
    return this.found;
  }

  /** Returns true if this is a new discovery. */
  add(id: string): boolean {
    if (!DISCOVERY_IDS.has(id) || this.found.has(id)) return false;
    this.found.add(id);
    this.emit('changed', this.found);
    void saveSystem.setMeta('discoveries', [...this.found]).catch(() => undefined);
    return true;
  }
}

export const discoveryStore = new DiscoveryStoreImpl();
