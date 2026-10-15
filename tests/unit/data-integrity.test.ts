import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST } from '../../src/data/asset-manifest';
import { OBJECT_DEFS, KNOWN_TYPES } from '../../src/data/objects';
import { DEFAULT_LAYOUTS } from '../../src/data/layouts';
import { DISCOVERIES } from '../../src/data/discoveries';
import { WORLDS } from '../../src/data/worlds';
import { validateSnapshot } from '../../src/utils/validation';
import { WORLD_IDS } from '../../src/types/game';

const manifest = ASSET_MANIFEST as Record<string, { anchors?: Record<string, unknown> }>;

describe('art & data integrity', () => {
  it('every object uses real illustrations and anchors', () => {
    for (const d of OBJECT_DEFS) {
      expect(manifest[d.key], d.type).toBeDefined();
      for (const p of d.parts ?? []) {
        expect(manifest[p.key], `${d.type}.${p.name}`).toBeDefined();
        if (typeof p.at === 'string') expect(manifest[d.key]!.anchors?.[p.at], `${d.type} anchor ${p.at}`).toBeDefined();
      }
    }
  });

  it('every world has a background, a card and a populated default scene that validates', () => {
    for (const w of WORLDS) {
      expect(manifest[w.background]).toBeDefined();
      expect(manifest[w.card]).toBeDefined();
      const items = DEFAULT_LAYOUTS[w.id];
      expect(items.length).toBeGreaterThan(8);
      const snap = { version: 1, worldId: w.id, objects: items.map((it, i) => ({ id: `x${i}`, type: it.type, x: it.x, y: it.y, rotation: 0, scale: 1, depth: 0, state: it.state ?? {} })), world: {} };
      const r = validateSnapshot(snap, KNOWN_TYPES, w.id);
      expect(r.ok && r.dropped).toBe(0);
      for (const it of items) expect(OBJECT_DEFS.find((d) => d.type === it.type)!.worlds).toContain(w.id);
    }
  });

  it('each world offers library items and several discoveries', () => {
    for (const id of WORLD_IDS) {
      expect(OBJECT_DEFS.filter((d) => d.library && d.worlds.includes(id)).length).toBeGreaterThan(8);
      expect(DISCOVERIES.filter((d) => d.world === id).length).toBeGreaterThanOrEqual(6);
    }
    for (const d of DISCOVERIES) expect(manifest[d.icon], d.id).toBeDefined();
  });
});
