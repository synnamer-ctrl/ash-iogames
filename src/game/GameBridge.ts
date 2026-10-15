import type { DrawTool, SceneSnapshot, StampShape, WorldId } from '../types/game';
import type { StorageErrorKind } from '../types/persistence';

export interface ToolState {
  tool: DrawTool;
  color: string;
  size: number;
  stamp: StampShape;
}

export interface GameEvents {
  loadProgress: number;
  worldReady: { world: WorldId };
  history: { canUndo: boolean; canRedo: boolean };
  discovery: { id: string };
  autosave: { ok: boolean; kind?: StorageErrorKind };
  limit: { type: string };
  objectCount: { count: number };
}

type Handler<T> = (payload: T) => void;

/** Tiny typed event emitter connecting the Phaser game and the React UI. */
export class Emitter<E extends object> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(fn as Handler<never>);
    return () => this.off(event, fn);
  }

  off<K extends keyof E>(event: K, fn: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of [...set]) (fn as Handler<E[K]>)(payload);
  }
}

export const bridge = new Emitter<GameEvents>();

/** Commands the UI can send to the running game. */
export interface GameController {
  enterWorld(world: WorldId, snapshot?: SceneSnapshot): Promise<void>;
  leaveWorld(): void;
  currentWorld(): WorldId | null;
  undo(): void;
  redo(): void;
  resetScene(): void;
  spawn(type: string): boolean;
  snapshot(): SceneSnapshot | null;
  loadSnapshot(s: SceneSnapshot): void;
  thumbnail(): Promise<Blob | null>;
  exportPicture(): Promise<Blob | null>;
  setTool(t: Partial<ToolState>): void;
  getTool(): ToolState;
  setReducedMotion(on: boolean): void;
  /** Persist the current world immediately (e.g. before leaving). */
  flushAutosave(): Promise<boolean>;
  hasUnsavedChanges(): boolean;
}
