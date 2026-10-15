import type { StateValue, WorldId } from '../types/game';

/** Matches an object by type, tag and/or state. */
export interface Matcher {
  type?: string | readonly string[];
  tag?: string;
  state?: Readonly<Record<string, StateValue | { gte?: number; lte?: number; not?: StateValue }>>;
}

export type ComboTrigger = 'drop' | 'hover' | 'contact';

export interface CombinationRule {
  id: string;
  world: WorldId;
  /** The object being moved (or the first body in a contact). */
  a: Matcher;
  /** The target object, or a named zone in the world. */
  b: Matcher | { zone: string };
  trigger: ComboTrigger;
  /** Name of the world action that applies the result. */
  result: string;
  /** Discovery unlocked the first time this happens. */
  discovery?: string;
  sound?: string;
  effect?: string;
}

/**
 * Data-driven object combinations. Order matters: the first matching rule wins,
 * so more specific rules come first. New discoveries only need a rule here and
 * an action in the world scene.
 */
export const COMBINATIONS: readonly CombinationRule[] = [
  // ---- Little Town
  { id: 'town.drive', world: 'town', a: { tag: 'vehicle' }, b: { zone: 'road' }, trigger: 'drop', result: 'drive', discovery: 'town.drive' },
  { id: 'town.plant', world: 'town', a: { tag: 'flower', state: { planted: { not: true } } }, b: { tag: 'bed' }, trigger: 'drop', result: 'plantFlower', discovery: 'town.flower', sound: 'grow', effect: 'sparkle' },
  { id: 'town.nap', world: 'town', a: { type: 'cat' }, b: { tag: 'bench' }, trigger: 'drop', result: 'catNap', discovery: 'town.nap' },
  { id: 'town.sit', world: 'town', a: { tag: 'person' }, b: { tag: 'bench' }, trigger: 'drop', result: 'sitOnBench', discovery: 'town.sit' },
  { id: 'town.treat', world: 'town', a: { tag: 'treat' }, b: { type: 'dog' }, trigger: 'drop', result: 'feedDog', discovery: 'town.treat', sound: 'munch', effect: 'hearts' },
  { id: 'town.mail', world: 'town', a: { tag: 'person' }, b: { type: 'mailbox' }, trigger: 'drop', result: 'postLetter', discovery: 'town.mail' },
  { id: 'town.perch', world: 'town', a: { tag: 'bird' }, b: { tag: 'perch' }, trigger: 'drop', result: 'perch', discovery: 'town.perch' },

  // ---- Nature Garden
  { id: 'garden.plant', world: 'garden', a: { tag: 'seedpacket' }, b: { type: 'soil', state: { stage: 0 } }, trigger: 'drop', result: 'plantSeed', discovery: 'garden.plant' },
  { id: 'garden.water', world: 'garden', a: { type: 'watering_can' }, b: { type: 'soil', state: { stage: { gte: 1, lte: 3 } } }, trigger: 'hover', result: 'waterPlant', discovery: 'garden.water' },
  { id: 'garden.waterDrop', world: 'garden', a: { type: 'watering_can' }, b: { type: 'soil', state: { stage: { gte: 1, lte: 3 } } }, trigger: 'drop', result: 'waterPlant', discovery: 'garden.water' },
  { id: 'garden.waterBloom', world: 'garden', a: { type: 'watering_can' }, b: { type: 'soil', state: { stage: 4 } }, trigger: 'hover', result: 'happyBloom' },
  { id: 'garden.flutter', world: 'garden', a: { tag: 'butterfly' }, b: { type: 'soil', state: { stage: 4 } }, trigger: 'drop', result: 'landOnFlower', discovery: 'garden.butterfly' },
  { id: 'garden.perch', world: 'garden', a: { tag: 'bird' }, b: { tag: 'perch' }, trigger: 'drop', result: 'perch', discovery: 'garden.perch' },
  { id: 'garden.carrot', world: 'garden', a: { type: 'carrot' }, b: { type: 'rabbit' }, trigger: 'drop', result: 'eatCarrot', discovery: 'garden.carrot', sound: 'munch' },
  { id: 'garden.lilyFrog', world: 'garden', a: { type: 'frog' }, b: { tag: 'pad' }, trigger: 'drop', result: 'sitOnPad', discovery: 'garden.frog' },
  { id: 'garden.swim', world: 'garden', a: { tag: 'swimmer' }, b: { zone: 'pond' }, trigger: 'drop', result: 'swim', discovery: 'garden.swim' },
  { id: 'garden.splash', world: 'garden', a: { tag: 'droppable' }, b: { zone: 'pond' }, trigger: 'drop', result: 'splash', discovery: 'garden.splash', sound: 'splash' },
  { id: 'garden.wateringPond', world: 'garden', a: { type: 'watering_can' }, b: { zone: 'pond' }, trigger: 'drop', result: 'splash', sound: 'splash' },
  { id: 'garden.dig', world: 'garden', a: { type: 'shovel' }, b: { zone: 'meadow' }, trigger: 'drop', result: 'dig', discovery: 'garden.dig' },

  // ---- Creative Workshop
  { id: 'workshop.googly', world: 'workshop', a: { type: 'sticker_googly' }, b: { tag: 'shape' }, trigger: 'drop', result: 'googlyFriend', discovery: 'workshop.googly' },

  // ---- Build & Play (physics contacts)
  { id: 'build.roll', world: 'build', a: { tag: 'ball' }, b: { tag: 'ramp' }, trigger: 'contact', result: 'whee', discovery: 'build.roll' },
  { id: 'build.carRamp', world: 'build', a: { tag: 'vehicle' }, b: { tag: 'ramp' }, trigger: 'contact', result: 'whee', discovery: 'build.carRamp' },
  { id: 'build.bell', world: 'build', a: {}, b: { tag: 'bell' }, trigger: 'contact', result: 'ringBell', discovery: 'build.bell' },
  { id: 'build.seesaw', world: 'build', a: {}, b: { tag: 'seesaw' }, trigger: 'contact', result: 'seesawHit', discovery: 'build.seesaw' },
  { id: 'build.spring', world: 'build', a: {}, b: { tag: 'spring' }, trigger: 'contact', result: 'boing', discovery: 'build.spring' },
];
