import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { SaveSystem, cleanName } from '../../src/game/systems/SaveSystem';
import { StorageError } from '../../src/types/persistence';
import type { SceneSnapshot } from '../../src/types/game';

const snap = (n: number): SceneSnapshot => ({ version: 1, worldId: 'town', objects: [{ id: 'a', type: 'car_red', x: n, y: 1, rotation: 0, scale: 1, depth: 0, state: {} }], world: {} });

describe('SaveSystem (IndexedDB)', () => {
  it('creates, lists, renames, overwrites and deletes creations', async () => {
    const s = new SaveSystem(new IDBFactory(), 'test-a');
    const a = await s.saveCreation({ worldId: 'town', name: 'My town', snapshot: snap(1), thumbnail: null });
    await new Promise((r) => setTimeout(r, 5));
    await s.saveCreation({ worldId: 'garden', name: 'Garden', snapshot: { ...snap(2), worldId: 'garden' }, thumbnail: null });
    expect((await s.listCreations('town')).map((c) => c.name)).toEqual(['My town']);
    expect(await s.listCreations()).toHaveLength(2);
    await s.renameCreation(a.id, '  Sunny street  ');
    expect((await s.getCreation(a.id)).name).toBe('Sunny street');
    await s.saveCreation({ id: a.id, worldId: 'town', name: 'Sunny street', snapshot: snap(99), thumbnail: null });
    const again = await s.getCreation(a.id);
    expect(again.snapshot.objects[0]!.x).toBe(99);
    expect(again.createdAt).toBe(a.createdAt);
    await s.deleteCreation(a.id);
    await expect(s.getCreation(a.id)).rejects.toBeInstanceOf(StorageError);
  });

  it('keeps one autosave per world', async () => {
    const s = new SaveSystem(new IDBFactory(), 'test-b');
    expect(await s.loadAutosave('town')).toBeNull();
    await s.saveAutosave('town', snap(1));
    await s.saveAutosave('town', snap(2));
    expect((await s.loadAutosave('town'))!.snapshot.objects[0]!.x).toBe(2);
    await s.clearAutosave('town');
    expect(await s.loadAutosave('town')).toBeNull();
  });

  it('stores metadata', async () => {
    const s = new SaveSystem(new IDBFactory(), 'test-c');
    await s.setMeta('discoveries', ['town.drive']);
    expect(await s.getMeta<string[]>('discoveries')).toEqual(['town.drive']);
  });

  it('reports unavailable storage as a typed error', async () => {
    const s = new SaveSystem(null, 'none');
    await expect(s.listCreations()).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(s.saveAutosave('town', snap(1))).rejects.toBeInstanceOf(StorageError);
  });

  it('cleans names', () => {
    expect(cleanName('   ')).toBe('My creation');
    expect(cleanName('a'.repeat(80))).toHaveLength(40);
  });
});
