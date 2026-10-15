import {
  SNAPSHOT_VERSION, WORLD_IDS,
  type ObjectState, type SavedObject, type SceneSnapshot, type StampShape, type Stroke, type WorldId, type WorldStateData,
} from '../types/game';

export const LIMITS = {
  objects: 300,
  stateKeys: 32,
  stringLen: 200,
  strokes: 3000,
  pointsPerStroke: 20000,
  totalPoints: 300000,
} as const;

const STAMPS: readonly StampShape[] = ['star', 'heart', 'flower', 'paw', 'circle', 'cloud'];
const HEX = /^#[0-9a-fA-F]{6}$/;

export type ValidationResult =
  | { ok: true; snapshot: SceneSnapshot; dropped: number }
  | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;

export function isWorldId(v: unknown): v is WorldId {
  return typeof v === 'string' && (WORLD_IDS as readonly string[]).includes(v);
}

function validState(v: unknown): ObjectState {
  const out: ObjectState = {};
  if (!isObj(v)) return out;
  let n = 0;
  for (const [k, val] of Object.entries(v)) {
    if (n >= LIMITS.stateKeys) break;
    if (k.length > 40) continue;
    if (typeof val === 'boolean') out[k] = val;
    else if (typeof val === 'number' && Number.isFinite(val)) out[k] = val;
    else if (typeof val === 'string') out[k] = val.slice(0, LIMITS.stringLen);
    else continue;
    n++;
  }
  return out;
}

function validObject(v: unknown, knownTypes: ReadonlySet<string>): SavedObject | null {
  if (!isObj(v)) return null;
  if (typeof v.type !== 'string' || !knownTypes.has(v.type)) return null;
  if (typeof v.id !== 'string' || v.id.length === 0 || v.id.length > 64) return null;
  if (typeof v.x !== 'number' || typeof v.y !== 'number' || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
  return {
    id: v.id,
    type: v.type,
    x: num(v.x, -1000, 2600, 0),
    y: num(v.y, -1000, 2200, 0),
    rotation: num(v.rotation, -1000, 1000, 0) % (Math.PI * 2),
    scale: num(v.scale, 0.2, 5, 1),
    depth: num(v.depth, -1e6, 1e6, 0),
    state: validState(v.state),
  };
}

function validStroke(v: unknown, budget: { points: number }): Stroke | null {
  if (!isObj(v)) return null;
  if (typeof v.color !== 'string' || !HEX.test(v.color)) return null;
  const size = num(v.size, 1, 160, NaN);
  if (Number.isNaN(size)) return null;
  if (v.tool === 'stamp') {
    if (typeof v.shape !== 'string' || !(STAMPS as readonly string[]).includes(v.shape)) return null;
    if (typeof v.x !== 'number' || typeof v.y !== 'number' || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
    return { tool: 'stamp', shape: v.shape as StampShape, color: v.color, size, x: v.x, y: v.y, rot: num(v.rot, -100, 100, 0) };
  }
  if (v.tool !== 'brush' && v.tool !== 'crayon' && v.tool !== 'eraser') return null;
  if (!Array.isArray(v.points) || v.points.length < 2 || v.points.length % 2 !== 0) return null;
  if (v.points.length > LIMITS.pointsPerStroke || budget.points + v.points.length > LIMITS.totalPoints) return null;
  for (const p of v.points) if (typeof p !== 'number' || !Number.isFinite(p)) return null;
  budget.points += v.points.length;
  return { tool: v.tool, color: v.color, size, seed: num(v.seed, 0, 2 ** 32, 1), points: v.points as number[] };
}

function validWorld(v: unknown): WorldStateData {
  const out: WorldStateData = {};
  if (!isObj(v)) return out;
  if (typeof v.night === 'boolean') out.night = v.night;
  if (typeof v.paperColor === 'string' && HEX.test(v.paperColor)) out.paperColor = v.paperColor;
  if (Array.isArray(v.strokes)) {
    const budget = { points: 0 };
    out.strokes = [];
    for (const s of v.strokes.slice(0, LIMITS.strokes)) {
      const st = validStroke(s, budget);
      if (st) out.strokes.push(st);
    }
  }
  return out;
}

/**
 * Validate an untrusted snapshot (from IndexedDB or an older version of the
 * game). Unknown object types and malformed entries are dropped rather than
 * failing the whole scene; structural problems fail with an error.
 */
export function validateSnapshot(input: unknown, knownTypes: ReadonlySet<string>, expectedWorld?: WorldId): ValidationResult {
  if (!isObj(input)) return { ok: false, error: 'Snapshot is not an object' };
  if (input.version !== SNAPSHOT_VERSION) return { ok: false, error: `Unsupported version ${String(input.version)}` };
  if (!isWorldId(input.worldId)) return { ok: false, error: 'Unknown world' };
  if (expectedWorld && input.worldId !== expectedWorld) return { ok: false, error: 'Snapshot belongs to another world' };
  if (!Array.isArray(input.objects)) return { ok: false, error: 'Objects missing' };
  const objects: SavedObject[] = [];
  const ids = new Set<string>();
  let dropped = 0;
  for (const raw of input.objects.slice(0, LIMITS.objects)) {
    const o = validObject(raw, knownTypes);
    if (!o || ids.has(o.id)) {
      dropped++;
      continue;
    }
    ids.add(o.id);
    objects.push(o);
  }
  dropped += Math.max(0, input.objects.length - LIMITS.objects);
  return { ok: true, snapshot: { version: SNAPSHOT_VERSION, worldId: input.worldId, objects, world: validWorld(input.world) }, dropped };
}
