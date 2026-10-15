import type { ObjectDef, WorldId } from '../types/game';

type DefInput = Omit<ObjectDef, 'tags' | 'interactions' | 'layer' | 'category'> & Partial<Pick<ObjectDef, 'tags' | 'interactions' | 'layer' | 'category'>>;
const def = (d: DefInput): ObjectDef => ({ tags: [], interactions: ['tap', 'drag'], layer: 'ground', category: 'toys', ...d });

const TOWN: WorldId[] = ['town'];
const GARDEN: WorldId[] = ['garden'];
const WORKSHOP: WorldId[] = ['workshop'];
const BUILD: WorldId[] = ['build'];
const OUTDOORS: WorldId[] = ['town', 'garden'];

const house = (type: string, label: string, peek: 'peek_kid' | 'peek_cat' | 'peek_baker', door: 'door_wood' | 'door_shop', behavior = 'house', size: [number, number]) =>
  def({
    type, label, worlds: TOWN, key: type as ObjectDef['key'], category: 'buildings', behavior,
    interactions: ['tap', 'longpress', 'drag'], library: true, max: 3, tags: ['building'],
    hit: { shape: 'rect', fw: 0.86, fh: 0.88 },
    state: { open: false, lights: false },
    parts: [
      { name: 'lit', key: `${type}_lit` as ObjectDef['key'], at: [size[0] / 2, size[1] / 2], visible: false },
      { name: 'peek', key: peek, at: 'peek', visible: false },
      { name: 'door', key: door, at: 'door', origin: [0, 0.5] },
    ],
  });

const vehicle = (type: string, label: string, wheel: 'wheel_s' | 'wheel_m' | 'wheel_bike', max = 4) =>
  def({
    type, label, worlds: TOWN, key: type as ObjectDef['key'], category: 'vehicles', behavior: 'vehicle',
    interactions: ['tap', 'longpress', 'drag'], library: true, max, tags: ['vehicle'],
    hit: { shape: 'rect', fw: 0.9, fh: 0.86 },
    state: { driving: false, dir: 1 },
    parts: [
      { name: 'wheelA', key: wheel, at: 'wheelA' },
      { name: 'wheelB', key: wheel, at: 'wheelB' },
    ],
  });

const person = (type: 'pip' | 'nana', label: string) =>
  def({
    type, label, worlds: TOWN, key: type, category: 'characters', behavior: 'person',
    interactions: ['tap', 'longpress', 'drag'], library: true, max: 4, tags: ['person'],
    hit: { shape: 'ellipse', fw: 0.95, fh: 0.95 }, state: { dir: 1 },
    parts: [
      { name: 'arm', key: `${type}_arm`, at: 'arm', origin: [0.5, 0.08] },
      { name: 'blink', key: `${type}_blink`, at: 'blink', visible: false },
    ],
  });

const flower = (type: 'flower_red' | 'flower_yellow' | 'flower_blue', label: string) =>
  def({ type, label, worlds: TOWN, key: type, category: 'nature', idle: 'sway', library: true, max: 16, tags: ['flower', 'droppable'], state: { planted: false }, hit: { shape: 'rect', fw: 1.3, fh: 1 } });

const treat = (type: 'treat_croissant' | 'treat_cupcake' | 'treat_donut' | 'treat_cookie', label: string) =>
  def({ type, label, worlds: TOWN, key: type, category: 'food', library: true, max: 8, tags: ['treat', 'droppable'], hit: { shape: 'ellipse', fw: 1.4, fh: 1.4 } });

const packet = (type: 'packet_tulip' | 'packet_sun' | 'packet_daisy', label: string, species: string) =>
  def({ type, label, worlds: GARDEN, key: type, category: 'nature', behavior: 'packet', library: true, max: 6, tags: ['seedpacket'], state: { species } });

const sticker = (type: string, label: string, extra: Partial<ObjectDef> = {}) =>
  def({
    type, label, worlds: WORKSHOP, key: type as ObjectDef['key'], category: 'art', layer: 'stack', behavior: 'sticker',
    interactions: ['tap', 'drag', 'rotate', 'resize'], library: true, max: 40, tags: ['sticker'], minScale: 0.4, maxScale: 3,
    ...extra,
  });

const shape = (type: string, label: string) =>
  def({
    type, label, worlds: WORKSHOP, key: type as ObjectDef['key'], category: 'art', layer: 'stack', behavior: 'paperShape',
    interactions: ['tap', 'drag', 'rotate', 'resize'], library: true, max: 40, tags: ['shape'], minScale: 0.4, maxScale: 3.5, state: { color: 0 },
  });

const block = (type: string, label: string, w: number, h: number, extra: Partial<ObjectDef> = {}) =>
  def({
    type, label, worlds: BUILD, key: type as ObjectDef['key'], category: 'toys', behavior: 'block', library: true, max: 30,
    interactions: ['tap', 'longpress', 'drag'], tags: ['block'],
    physics: { kind: 'dynamic', shape: 'rect', w: w - 4, h: h - 4, chamfer: 6, density: 0.002, friction: 0.7, restitution: 0.05 },
    ...extra,
  });

export const OBJECT_DEFS: readonly ObjectDef[] = [
  // ------------------------------------------------------------- shared sky
  def({
    type: 'sun', label: 'Sun', worlds: OUTDOORS, key: 'sun_face', category: 'nature', layer: 'sky', behavior: 'sun',
    parts: [{ name: 'rays', key: 'sun_rays', at: [85, 85], behind: true }], hit: { shape: 'ellipse', fw: 1.1, fh: 1.1 }, max: 1, state: { happy: false },
  }),
  def({ type: 'cloud_a', label: 'Big cloud', worlds: OUTDOORS, key: 'cloud_a', category: 'nature', layer: 'sky', behavior: 'cloud', idle: 'drift', library: true, max: 5, tags: ['cloud'] }),
  def({ type: 'cloud_b', label: 'Little cloud', worlds: OUTDOORS, key: 'cloud_b', category: 'nature', layer: 'sky', behavior: 'cloud', idle: 'drift', library: true, max: 5, tags: ['cloud'] }),
  def({ type: 'bird', label: 'Bird', worlds: OUTDOORS, key: 'bird_up', category: 'animals', layer: 'air', behavior: 'bird', library: true, max: 6, tags: ['bird', 'animal'], hit: { shape: 'ellipse', fw: 1.4, fh: 1.4 } }),
  def({ type: 'tree_round', label: 'Round tree', worlds: OUTDOORS, key: 'tree_round', category: 'nature', behavior: 'tree', library: true, max: 6, tags: ['tree', 'perch'], hit: { shape: 'ellipse', fw: 0.85, fh: 0.95 } }),
  def({ type: 'tree_pine', label: 'Pine tree', worlds: OUTDOORS, key: 'tree_pine', category: 'nature', behavior: 'tree', library: true, max: 6, tags: ['tree', 'perch'], hit: { shape: 'ellipse', fw: 0.8, fh: 0.95 } }),
  def({ type: 'bush', label: 'Bush', worlds: OUTDOORS, key: 'bush', category: 'nature', behavior: 'tree', library: true, max: 8, tags: ['bush'] }),

  // ------------------------------------------------------------- town
  house('house_a', 'Red cottage', 'peek_kid', 'door_wood', 'house', [280, 300]),
  house('house_b', 'Blue house', 'peek_cat', 'door_wood', 'house', [260, 290]),
  house('house_c', 'Tall yellow house', 'peek_kid', 'door_wood', 'house', [220, 350]),
  house('bakery', 'Bakery', 'peek_baker', 'door_shop', 'bakery', [340, 310]),
  house('florist', 'Flower shop', 'peek_cat', 'door_shop', 'florist', [300, 290]),
  vehicle('car_red', 'Red car', 'wheel_s'),
  vehicle('car_teal', 'Teal car', 'wheel_s'),
  vehicle('bus', 'Bus', 'wheel_m', 2),
  vehicle('ice_cream_van', 'Ice cream van', 'wheel_m', 2),
  vehicle('bike', 'Bike', 'wheel_bike', 3),
  def({
    type: 'traffic_light', label: 'Traffic light', worlds: TOWN, key: 'traffic_light', category: 'furniture', behavior: 'trafficLight', library: true, max: 2,
    hit: { shape: 'rect', fw: 1.4, fh: 1 }, state: { light: 'green' },
    parts: [
      { name: 'red', key: 'lamp_red', at: 'red', visible: false },
      { name: 'amber', key: 'lamp_amber', at: 'amber', visible: false },
      { name: 'green', key: 'lamp_green', at: 'green', visible: true },
    ],
  }),
  def({
    type: 'mailbox', label: 'Mailbox', worlds: TOWN, key: 'mailbox', category: 'furniture', behavior: 'mailbox', library: true, max: 3,
    hit: { shape: 'rect', fw: 1.2, fh: 1 }, state: { open: false },
    parts: [{ name: 'flag', key: 'mailbox_flag', at: 'flag', origin: [0.5, 0.95] }],
  }),
  def({
    type: 'streetlight', label: 'Street lamp', worlds: TOWN, key: 'streetlight', category: 'furniture', behavior: 'streetlight', library: true, max: 4, tags: ['perch'],
    hit: { shape: 'rect', fw: 1, fh: 1 }, state: { on: false },
    parts: [{ name: 'glow', key: 'fx_glow', at: 'glow', visible: false }],
  }),
  def({ type: 'bench', label: 'Bench', worlds: TOWN, key: 'bench', category: 'furniture', behavior: 'wiggle', library: true, max: 4, tags: ['bench'] }),
  def({ type: 'hydrant', label: 'Hydrant', worlds: TOWN, key: 'hydrant', category: 'furniture', behavior: 'hydrant', library: true, max: 3, hit: { shape: 'ellipse', fw: 1.3, fh: 1.1 } }),
  def({ type: 'flowerbed', label: 'Flower bed', worlds: TOWN, key: 'flowerbed', category: 'nature', behavior: 'wiggle', library: true, max: 4, tags: ['bed'], hit: { shape: 'rect', fw: 1, fh: 1.6 } }),
  flower('flower_red', 'Red tulip'),
  flower('flower_yellow', 'Daisy'),
  flower('flower_blue', 'Bellflower'),
  treat('treat_croissant', 'Croissant'),
  treat('treat_cupcake', 'Cupcake'),
  treat('treat_donut', 'Donut'),
  treat('treat_cookie', 'Cookie'),
  person('pip', 'Pip'),
  person('nana', 'Nana Rose'),
  def({
    type: 'dog', label: 'Biscuit the dog', worlds: TOWN, key: 'dog', category: 'animals', behavior: 'dog', interactions: ['tap', 'longpress', 'drag'], library: true, max: 3, tags: ['animal', 'pet'],
    parts: [{ name: 'tail', key: 'dog_tail', at: 'tail', origin: [0.12, 0.88], behind: true }],
  }),
  def({
    type: 'cat', label: 'Mochi the cat', worlds: TOWN, key: 'cat', category: 'animals', behavior: 'cat', interactions: ['tap', 'longpress', 'drag'], library: true, max: 3, tags: ['animal', 'pet'],
    state: { sleeping: false }, parts: [{ name: 'tail', key: 'cat_tail', at: 'tail', origin: [0.1, 0.9], behind: true }],
  }),

  // ------------------------------------------------------------- garden
  def({ type: 'tree_apple', label: 'Apple tree', worlds: GARDEN, key: 'tree_apple', category: 'nature', behavior: 'appleTree', library: true, max: 3, tags: ['tree', 'perch'], hit: { shape: 'ellipse', fw: 0.85, fh: 0.95 } }),
  def({
    type: 'soil', label: 'Garden patch', worlds: GARDEN, key: 'soil', category: 'nature', behavior: 'soil', library: true, max: 10, tags: ['soil'],
    hit: { shape: 'ellipse', fw: 1, fh: 2.4, oy: -20 }, state: { stage: 0, species: '' },
    parts: [{ name: 'plant', key: 'plant_sprout', at: [75, 36], origin: [0.5, 1], visible: false }],
  }),
  packet('packet_tulip', 'Tulip seeds', 'tulip'),
  packet('packet_sun', 'Sunflower seeds', 'sun'),
  packet('packet_daisy', 'Daisy seeds', 'daisy'),
  def({ type: 'watering_can', label: 'Watering can', worlds: GARDEN, key: 'watering_can', category: 'toys', behavior: 'wateringCan', library: true, max: 2, tags: ['tool'] }),
  def({ type: 'shovel', label: 'Shovel', worlds: GARDEN, key: 'shovel', category: 'toys', behavior: 'wiggle', library: true, max: 2, tags: ['tool'], hit: { shape: 'rect', fw: 1.4, fh: 1 } }),
  def({ type: 'butterfly_pink', label: 'Pink butterfly', worlds: GARDEN, key: 'butterfly_pink', category: 'animals', layer: 'air', behavior: 'butterfly', idle: 'flutter', library: true, max: 6, tags: ['butterfly', 'animal'], hit: { shape: 'ellipse', fw: 1.5, fh: 1.5 } }),
  def({ type: 'butterfly_blue', label: 'Blue butterfly', worlds: GARDEN, key: 'butterfly_blue', category: 'animals', layer: 'air', behavior: 'butterfly', idle: 'flutter', library: true, max: 6, tags: ['butterfly', 'animal'], hit: { shape: 'ellipse', fw: 1.5, fh: 1.5 } }),
  def({ type: 'bee', label: 'Bee', worlds: GARDEN, key: 'bee', category: 'animals', layer: 'air', behavior: 'bee', idle: 'bob', library: true, max: 4, tags: ['animal'], hit: { shape: 'ellipse', fw: 1.6, fh: 1.6 } }),
  def({ type: 'duck', label: 'Duck', worlds: GARDEN, key: 'duck', category: 'animals', behavior: 'duck', library: true, max: 4, tags: ['swimmer', 'animal'] }),
  def({ type: 'frog', label: 'Frog', worlds: GARDEN, key: 'frog', category: 'animals', behavior: 'frog', library: true, max: 4, tags: ['swimmer', 'animal'], hit: { shape: 'ellipse', fw: 1.3, fh: 1.3 } }),
  def({ type: 'lily_pad', label: 'Lily pad', worlds: GARDEN, key: 'lily_pad', category: 'nature', layer: 'back', behavior: 'wiggle', library: true, max: 6, tags: ['swimmer', 'pad'] }),
  def({ type: 'mushroom_red', label: 'Red mushroom', worlds: GARDEN, key: 'mushroom_red', category: 'nature', behavior: 'mushroom', library: true, max: 8, tags: ['droppable'] }),
  def({ type: 'mushroom_lav', label: 'Purple mushroom', worlds: GARDEN, key: 'mushroom_lav', category: 'nature', behavior: 'mushroom', library: true, max: 8, tags: ['droppable'] }),
  def({ type: 'rock', label: 'Rock', worlds: GARDEN, key: 'rock', category: 'nature', behavior: 'wiggle', library: true, max: 8, tags: ['droppable', 'sinks'] }),
  def({ type: 'pebble', label: 'Pebble', worlds: GARDEN, key: 'pebble', category: 'nature', behavior: 'wiggle', library: true, max: 10, tags: ['droppable', 'sinks'], hit: { shape: 'ellipse', fw: 1.5, fh: 1.8 } }),
  def({ type: 'apple', label: 'Apple', worlds: GARDEN, key: 'apple', category: 'food', behavior: 'wiggle', library: true, max: 8, tags: ['droppable', 'floats'], hit: { shape: 'ellipse', fw: 1.6, fh: 1.6 } }),
  def({ type: 'carrot', label: 'Carrot', worlds: GARDEN, key: 'carrot', category: 'food', behavior: 'wiggle', library: true, max: 6, tags: ['droppable', 'floats'], hit: { shape: 'rect', fw: 1.6, fh: 1 } }),
  def({ type: 'rabbit', label: 'Rabbit', worlds: GARDEN, key: 'rabbit', category: 'animals', behavior: 'rabbit', library: true, max: 3, tags: ['animal'] }),
  def({ type: 'hedgehog', label: 'Hedgehog', worlds: GARDEN, key: 'hedgehog', category: 'animals', behavior: 'hedgehog', library: true, max: 3, tags: ['animal'], state: { curled: false } }),
  def({ type: 'snail', label: 'Snail', worlds: GARDEN, key: 'snail', category: 'animals', behavior: 'snail', library: true, max: 4, tags: ['animal'], hit: { shape: 'ellipse', fw: 1.2, fh: 1.4 } }),

  // ------------------------------------------------------------- workshop
  sticker('sticker_star', 'Star sticker'),
  sticker('sticker_heart', 'Heart sticker'),
  sticker('sticker_rainbow', 'Rainbow sticker'),
  sticker('sticker_cat', 'Cat sticker'),
  sticker('sticker_sun', 'Sun sticker'),
  sticker('sticker_flower', 'Flower sticker'),
  sticker('sticker_rocket', 'Rocket sticker'),
  sticker('sticker_whale', 'Whale sticker'),
  sticker('sticker_googly', 'Googly eyes', {
    behavior: 'googly',
    parts: [
      { name: 'pupilA', key: 'googly_pupil', at: 'pupilA' },
      { name: 'pupilB', key: 'googly_pupil', at: 'pupilB' },
    ],
  }),
  shape('shape_circle', 'Paper circle'),
  shape('shape_triangle', 'Paper triangle'),
  shape('shape_square', 'Paper square'),
  shape('shape_moon', 'Paper moon'),
  sticker('tape', 'Washi tape', { behavior: 'wiggle', max: 12 }),
  def({ type: 'jar_brushes', label: 'Brush jar', worlds: WORKSHOP, key: 'jar_brushes', category: 'art', layer: 'stack', behavior: 'wiggle', library: true, max: 2 }),
  def({ type: 'palette', label: 'Palette', worlds: WORKSHOP, key: 'palette', category: 'art', layer: 'stack', behavior: 'wiggle', library: true, max: 2 }),

  // ------------------------------------------------------------- build & play
  block('block_red', 'Red block', 80, 80),
  block('block_blue', 'Blue block', 80, 80),
  block('block_yellow', 'Yellow block', 80, 80),
  block('block_green', 'Green block', 80, 80),
  block('block_long', 'Long plank', 240, 40, { physics: { kind: 'dynamic', shape: 'rect', w: 236, h: 36, chamfer: 8, density: 0.0015, friction: 0.8 } }),
  block('block_pillar', 'Pillar', 44, 140),
  block('block_tri', 'Triangle block', 104, 92, { physics: { kind: 'dynamic', shape: 'verts', verts: [[4, 88], [52, 4], [100, 88]], density: 0.002, friction: 0.7 } }),
  def({ type: 'ball_red', label: 'Red ball', worlds: BUILD, key: 'ball_red', behavior: 'ball', library: true, max: 16, tags: ['ball'], physics: { kind: 'dynamic', shape: 'circle', r: 30, density: 0.004, restitution: 0.55, friction: 0.05, frictionAir: 0.004 } }),
  def({ type: 'ball_beach', label: 'Beach ball', worlds: BUILD, key: 'ball_beach', behavior: 'ball', library: true, max: 8, tags: ['ball'], physics: { kind: 'dynamic', shape: 'circle', r: 45, density: 0.0006, restitution: 0.85, friction: 0.05, frictionAir: 0.012 } }),
  def({ type: 'ball_marble', label: 'Marble', worlds: BUILD, key: 'ball_marble', behavior: 'ball', library: true, max: 16, tags: ['ball'], hit: { shape: 'ellipse', fw: 1.6, fh: 1.6 }, physics: { kind: 'dynamic', shape: 'circle', r: 18, density: 0.006, restitution: 0.35, friction: 0.02, frictionAir: 0.002 } }),
  def({
    type: 'ramp', label: 'Ramp', worlds: BUILD, key: 'ramp', behavior: 'ramp', interactions: ['tap', 'longpress', 'drag'], library: true, max: 6, tags: ['ramp'], state: { flip: false },
    hit: { shape: 'rect', fw: 1, fh: 1 }, physics: { kind: 'static', shape: 'verts', verts: [[4, 146], [4, 6], [296, 146]], friction: 0.02 },
  }),
  def({ type: 'platform', label: 'Shelf', worlds: BUILD, key: 'platform', behavior: 'staticToy', interactions: ['tap', 'longpress', 'drag'], library: true, max: 6, hit: { shape: 'rect', fw: 1, fh: 2.4 }, physics: { kind: 'static', shape: 'rect', w: 276, h: 30, friction: 0.6 } }),
  def({
    type: 'toy_car', label: 'Toy car', worlds: BUILD, key: 'toy_car', behavior: 'toyCar', interactions: ['tap', 'longpress', 'drag'], library: true, max: 6, tags: ['vehicle'], state: { dir: 1 },
    parts: [{ name: 'wheelA', key: 'wheel_toy', at: 'wheelA' }, { name: 'wheelB', key: 'wheel_toy', at: 'wheelB' }],
    physics: { kind: 'dynamic', shape: 'rect', w: 150, h: 64, chamfer: 18, density: 0.002, friction: 0.01, frictionAir: 0.008, restitution: 0.1 },
  }),
  def({ type: 'wheel_big', label: 'Big wheel', worlds: BUILD, key: 'wheel_big', behavior: 'ball', library: true, max: 8, tags: ['ball', 'wheel'], physics: { kind: 'dynamic', shape: 'circle', r: 34, density: 0.003, restitution: 0.3, friction: 0.9 } }),
  def({
    type: 'seesaw', label: 'Seesaw', worlds: BUILD, key: 'seesaw_plank', behavior: 'hinge', library: true, max: 2, tags: ['seesaw'],
    hit: { shape: 'rect', fw: 1, fh: 3 }, physics: { kind: 'hinge', shape: 'rect', w: 376, h: 24, density: 0.002, friction: 0.8 },
  }),
  def({
    type: 'pinwheel', label: 'Pinwheel', worlds: BUILD, key: 'pinwheel', behavior: 'hinge', library: true, max: 3, tags: ['pinwheel'],
    physics: { kind: 'hinge', shape: 'circle', r: 66, density: 0.0006, friction: 0.3, frictionAir: 0.01 },
  }),
  def({ type: 'domino', label: 'Domino', worlds: BUILD, key: 'domino', behavior: 'domino', library: true, max: 24, tags: ['domino'], hit: { shape: 'rect', fw: 2.2, fh: 1 }, physics: { kind: 'dynamic', shape: 'rect', w: 24, h: 92, chamfer: 4, density: 0.003, friction: 0.5, restitution: 0.02 } }),
  def({ type: 'bell', label: 'Bell', worlds: BUILD, key: 'bell', behavior: 'bell', library: true, max: 3, tags: ['bell'], physics: { kind: 'static', shape: 'rect', w: 76, h: 104 } }),
  def({ type: 'spring_pad', label: 'Spring', worlds: BUILD, key: 'spring_pad', behavior: 'spring', library: true, max: 4, tags: ['spring'], physics: { kind: 'static', shape: 'rect', w: 118, h: 50 } }),
  def({ type: 'chute', label: 'Ball chute', worlds: BUILD, key: 'chute', behavior: 'chute', library: true, max: 3, tags: ['chute'], hit: { shape: 'rect', fw: 1, fh: 1 } }),
];

export const DEF_BY_TYPE: ReadonlyMap<string, ObjectDef> = new Map(OBJECT_DEFS.map((d) => [d.type, d]));
export const KNOWN_TYPES: ReadonlySet<string> = new Set(OBJECT_DEFS.map((d) => d.type));

export function defsForWorld(world: WorldId): ObjectDef[] {
  return OBJECT_DEFS.filter((d) => d.worlds.includes(world));
}

export function getDef(type: string): ObjectDef {
  const d = DEF_BY_TYPE.get(type);
  if (!d) throw new Error(`Unknown object type: ${type}`);
  return d;
}
