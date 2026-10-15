import { describe, expect, it } from 'vitest';
import { COMBINATIONS } from '../../src/data/combinations';
import { findCombination, matches, type Combinable } from '../../src/game/systems/CombinationSystem';
import { DEF_BY_TYPE } from '../../src/data/objects';

const obj = (id: string, type: string, state: Combinable['state'] = {}): Combinable => ({ id, type, tags: DEF_BY_TYPE.get(type)!.tags, state: { ...(DEF_BY_TYPE.get(type)!.state ?? {}), ...state } });
const rules = (w: string) => COMBINATIONS.filter((r) => r.world === w);

describe('matchers', () => {
  it('match by type, tag and state conditions', () => {
    const soil = obj('s', 'soil', { stage: 2 });
    expect(matches({ type: 'soil' }, soil)).toBe(true);
    expect(matches({ type: ['rock', 'soil'] }, soil)).toBe(true);
    expect(matches({ tag: 'soil' }, soil)).toBe(true);
    expect(matches({ state: { stage: { gte: 1, lte: 3 } } }, soil)).toBe(true);
    expect(matches({ state: { stage: { gte: 3 } } }, soil)).toBe(false);
    expect(matches({ state: { stage: { not: 2 } } }, soil)).toBe(false);
    expect(matches({ state: { stage: 2 } }, soil)).toBe(true);
  });
});

describe('combination rules', () => {
  it('seed packet + empty soil plants a seed', () => {
    const m = findCombination(rules('garden'), 'drop', obj('p', 'packet_sun'), [obj('s', 'soil', { stage: 0 })], []);
    expect(m?.rule.result).toBe('plantSeed');
    expect(m?.target?.id).toBe('s');
  });

  it('seed packet does nothing on soil that already has a plant', () => {
    expect(findCombination(rules('garden'), 'drop', obj('p', 'packet_sun'), [obj('s', 'soil', { stage: 3 })], [])).toBeNull();
  });

  it('watering can + growing plant waters it, + bloom makes it happy', () => {
    expect(findCombination(rules('garden'), 'hover', obj('c', 'watering_can'), [obj('s', 'soil', { stage: 1 })], [])?.rule.result).toBe('waterPlant');
    expect(findCombination(rules('garden'), 'hover', obj('c', 'watering_can'), [obj('s', 'soil', { stage: 4 })], [])?.rule.result).toBe('happyBloom');
    expect(findCombination(rules('garden'), 'hover', obj('c', 'watering_can'), [obj('s', 'soil', { stage: 0 })], [])).toBeNull();
  });

  it('bird + tree perches, car + road drives', () => {
    expect(findCombination(rules('garden'), 'drop', obj('b', 'bird'), [obj('t', 'tree_apple')], [])?.rule.result).toBe('perch');
    expect(findCombination(rules('town'), 'drop', obj('c', 'car_red'), [], ['road'])?.rule.result).toBe('drive');
  });

  it('prefers swimming over splashing for swimmers, splashes droppables', () => {
    expect(findCombination(rules('garden'), 'drop', obj('d', 'duck'), [], ['pond'])?.rule.result).toBe('swim');
    expect(findCombination(rules('garden'), 'drop', obj('r', 'rock'), [], ['pond'])?.rule.result).toBe('splash');
  });

  it('ball + ramp contact rolls; anything + bell rings', () => {
    expect(findCombination(rules('build'), 'contact', obj('b', 'ball_red'), [obj('r', 'ramp')], [])?.rule.result).toBe('whee');
    expect(findCombination(rules('build'), 'contact', obj('x', 'block_red'), [obj('b', 'bell')], [])?.rule.result).toBe('ringBell');
  });

  it('never combines an object with itself', () => {
    const can = obj('same', 'watering_can');
    expect(findCombination(rules('garden'), 'drop', can, [can], [])).toBeNull();
  });

  it('every rule references real object types and discoveries', async () => {
    const { DISCOVERY_IDS } = await import('../../src/data/discoveries');
    for (const r of COMBINATIONS) {
      if (r.discovery) expect(DISCOVERY_IDS.has(r.discovery), r.id).toBe(true);
      for (const m of [r.a, 'zone' in r.b ? {} : r.b]) {
        const types = m && 'type' in m && m.type ? (typeof m.type === 'string' ? [m.type] : m.type) : [];
        for (const t of types) expect(DEF_BY_TYPE.has(t), `${r.id}: ${t}`).toBe(true);
      }
    }
  });
});
