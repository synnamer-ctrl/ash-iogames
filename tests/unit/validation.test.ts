import { describe, expect, it } from 'vitest';
import { validateSnapshot, LIMITS } from '../../src/utils/validation';
import { KNOWN_TYPES } from '../../src/data/objects';

const base = { version: 1, worldId: 'town', objects: [], world: {} };

describe('validateSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    const r = validateSnapshot({ ...base, objects: [{ id: 'a', type: 'car_red', x: 10, y: 20, rotation: 0.5, scale: 1, depth: 3, state: { driving: true, dir: -1 } }] }, KNOWN_TYPES, 'town');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.objects).toHaveLength(1);
      expect(r.snapshot.objects[0]!.state).toEqual({ driving: true, dir: -1 });
    }
  });

  it('rejects wrong versions, worlds and shapes', () => {
    expect(validateSnapshot(null, KNOWN_TYPES).ok).toBe(false);
    expect(validateSnapshot({ ...base, version: 2 }, KNOWN_TYPES).ok).toBe(false);
    expect(validateSnapshot({ ...base, worldId: 'moon' }, KNOWN_TYPES).ok).toBe(false);
    expect(validateSnapshot({ ...base, objects: 'nope' }, KNOWN_TYPES).ok).toBe(false);
    expect(validateSnapshot(base, KNOWN_TYPES, 'garden').ok).toBe(false);
  });

  it('drops unknown types, duplicates and broken objects but keeps the rest', () => {
    const r = validateSnapshot({
      ...base,
      objects: [
        { id: 'a', type: 'car_red', x: 1, y: 2 },
        { id: 'a', type: 'bus', x: 1, y: 2 },
        { id: 'b', type: 'spaceship', x: 1, y: 2 },
        { id: 'c', type: 'bus', x: 'left', y: 2 },
        { id: 'd', type: 'bus', x: 5, y: 6, scale: 99, rotation: Infinity, state: { ok: 1, bad: { nested: true }, fn: null } },
      ],
    }, KNOWN_TYPES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.objects.map((o) => o.id)).toEqual(['a', 'd']);
    expect(r.dropped).toBe(3);
    const d = r.snapshot.objects[1]!;
    expect(d.scale).toBe(5);
    expect(d.rotation).toBe(0);
    expect(d.state).toEqual({ ok: 1 });
  });

  it('validates strokes and paper colour', () => {
    const r = validateSnapshot({
      version: 1, worldId: 'workshop', objects: [],
      world: {
        paperColor: '#ABCDEF',
        strokes: [
          { tool: 'brush', color: '#112233', size: 10, seed: 4, points: [1, 2, 3, 4] },
          { tool: 'brush', color: 'red', size: 10, seed: 4, points: [1, 2] },
          { tool: 'crayon', color: '#112233', size: 10, seed: 4, points: [1, 2, 3] },
          { tool: 'stamp', shape: 'star', color: '#445566', size: 60, x: 5, y: 6, rot: 0.2 },
          { tool: 'stamp', shape: 'rocket', color: '#445566', size: 60, x: 5, y: 6, rot: 0 },
        ],
      },
    }, KNOWN_TYPES, 'workshop');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.world.paperColor).toBe('#ABCDEF');
    expect(r.snapshot.world.strokes?.map((s) => s.tool)).toEqual(['brush', 'stamp']);
  });

  it('caps the number of objects', () => {
    const objects = Array.from({ length: LIMITS.objects + 20 }, (_, i) => ({ id: `o${i}`, type: 'rock', x: 0, y: 0 }));
    const r = validateSnapshot({ version: 1, worldId: 'garden', objects, world: {} }, KNOWN_TYPES);
    expect(r.ok && r.snapshot.objects.length).toBe(LIMITS.objects);
  });
});
