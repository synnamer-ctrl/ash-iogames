import type { AssetKey } from '../data/asset-manifest';

export type WorldId = 'town' | 'garden' | 'workshop' | 'build';
export const WORLD_IDS: readonly WorldId[] = ['town', 'garden', 'workshop', 'build'];

export type InteractionType = 'tap' | 'longpress' | 'drag' | 'rotate' | 'resize';
export type StateValue = string | number | boolean;
export type ObjectState = Record<string, StateValue>;
export interface Vec2 {
  x: number;
  y: number;
}

/** Visual animation state of an object at runtime (not persisted). */
export type AnimationState = 'idle' | 'pressed' | 'held' | 'settling' | 'moving' | 'busy';

/** Where an object lives in the depth ordering. */
export type Layer = 'sky' | 'back' | 'ground' | 'air' | 'stack';

export type IdleKind = 'none' | 'sway' | 'bob' | 'breathe' | 'flutter' | 'drift';

export type ObjectCategory = 'buildings' | 'nature' | 'vehicles' | 'characters' | 'animals' | 'toys' | 'furniture' | 'art' | 'food';

export interface PartDef {
  name: string;
  key: AssetKey;
  /** Anchor name from the asset manifest, or explicit [x, y] in main-asset pixels. */
  at: string | readonly [number, number];
  origin?: readonly [number, number];
  visible?: boolean;
  /** Draw behind the main image. */
  behind?: boolean;
}

export interface HitDef {
  shape: 'ellipse' | 'rect';
  /** Size as a fraction of the asset (defaults 0.9). */
  fw?: number;
  fh?: number;
  /** Offset in asset pixels from centre. */
  ox?: number;
  oy?: number;
}

export interface PhysicsDef {
  kind: 'dynamic' | 'static' | 'hinge';
  shape: 'rect' | 'circle' | 'verts';
  /** For verts: points in asset pixel space. */
  verts?: readonly (readonly [number, number])[];
  /** Body size in asset pixels (defaults to asset size). */
  w?: number;
  h?: number;
  r?: number;
  chamfer?: number;
  density?: number;
  restitution?: number;
  friction?: number;
  frictionAir?: number;
}

export interface ObjectDef {
  type: string;
  label: string;
  worlds: readonly WorldId[];
  key: AssetKey;
  category: ObjectCategory;
  tags: readonly string[];
  interactions: readonly InteractionType[];
  layer: Layer;
  parts?: readonly PartDef[];
  hit?: HitDef;
  idle?: IdleKind;
  /** Offered in the object library. */
  library?: boolean;
  /** Maximum number allowed in one scene. */
  max?: number;
  /** Default persistent state. */
  state?: ObjectState;
  /** Behaviour module id (defaults to type). */
  behavior?: string;
  physics?: PhysicsDef;
  minScale?: number;
  maxScale?: number;
  /** Library thumbnail override. */
  thumb?: AssetKey;
}

export interface SavedObject {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  depth: number;
  state: ObjectState;
}

export type StampShape = 'star' | 'heart' | 'flower' | 'paw' | 'circle' | 'cloud';
export type DrawTool = 'brush' | 'crayon' | 'eraser' | 'stamp' | 'bucket';

export interface LineStroke {
  tool: 'brush' | 'crayon' | 'eraser';
  color: string;
  size: number;
  seed: number;
  /** Flat [x0, y0, x1, y1, ...] in paper coordinates. */
  points: number[];
}
export interface StampStroke {
  tool: 'stamp';
  shape: StampShape;
  color: string;
  size: number;
  x: number;
  y: number;
  rot: number;
}
export type Stroke = LineStroke | StampStroke;

export interface WorldStateData {
  night?: boolean;
  paperColor?: string;
  strokes?: Stroke[];
}

export const SNAPSHOT_VERSION = 1 as const;

export interface SceneSnapshot {
  version: typeof SNAPSHOT_VERSION;
  worldId: WorldId;
  objects: SavedObject[];
  world: WorldStateData;
}

export interface LayoutItem {
  type: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  state?: ObjectState;
}
