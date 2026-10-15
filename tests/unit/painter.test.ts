import { describe, expect, it } from 'vitest';
import { addPoint, countPoints } from '../../src/game/drawing/Painter';
import { nextStage, plantKey } from '../../src/game/logic/garden';
import type { LineStroke } from '../../src/types/game';

describe('stroke capture', () => {
  it('skips points that barely moved and rounds coordinates', () => {
    const s: LineStroke = { tool: 'brush', color: '#000000', size: 10, seed: 1, points: [] };
    expect(addPoint(s, 10.123, 20.456, 2)).toBe(true);
    expect(addPoint(s, 10.5, 20.5, 2)).toBe(false);
    expect(addPoint(s, 15, 20, 2)).toBe(true);
    expect(s.points).toEqual([10.1, 20.5, 15, 20]);
    expect(countPoints([s, { tool: 'stamp', shape: 'star', color: '#000000', size: 40, x: 0, y: 0, rot: 0 }])).toBe(3);
  });
});

describe('plant growth', () => {
  it('is deterministic and bounded', () => {
    expect(nextStage(0)).toBe(0);
    expect(nextStage(1)).toBe(2);
    expect(nextStage(4)).toBe(4);
    expect(plantKey(0, 'sun')).toBeNull();
    expect(plantKey(3, 'sun')).toBe('plant_bud_sun');
    expect(plantKey(4, 'mystery')).toBe('plant_bloom_tulip');
  });
});
