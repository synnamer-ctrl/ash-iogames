import Phaser from 'phaser';
import type { Vec2 } from '../../types/game';
import { InteractiveObject } from '../objects/InteractiveObject';
import type { CameraRig } from './CameraRig';

export interface InteractionHost {
  readonly rig: CameraRig;
  readonly dpr: number;
  acceptingInput(): boolean;
  onPress(o: InteractiveObject): void;
  onRelease(o: InteractiveObject): void;
  onTap(o: InteractiveObject, world: Vec2): void;
  onLongPress(o: InteractiveObject): void;
  onDragStart(o: InteractiveObject, world: Vec2): void;
  onDragMove(o: InteractiveObject, target: Vec2, world: Vec2): void;
  onDrop(o: InteractiveObject): void;
  /** Return true to capture the gesture (e.g. drawing). */
  onBackgroundDown(world: Vec2, pointer: Phaser.Input.Pointer): boolean;
  onBackgroundMove(world: Vec2, pointer: Phaser.Input.Pointer): void;
  onBackgroundUp(world: Vec2, pointer: Phaser.Input.Pointer, wasTap: boolean): void;
  onHandle?(handle: string, phase: 'down' | 'move' | 'up', world: Vec2, pointer: Phaser.Input.Pointer): void;
}

interface Gesture {
  pointerId: number;
  kind: 'object' | 'background' | 'captured' | 'handle';
  obj?: InteractiveObject;
  handle?: string;
  startScreen: Vec2;
  lastScreen: Vec2;
  offset: Vec2;
  moved: boolean;
  dragging: boolean;
  panning: boolean;
  longPressed: boolean;
  /** Edge auto-pan only starts once the finger has been away from the screen edge. */
  edgeArmed?: boolean;
  timer?: Phaser.Time.TimerEvent;
}

const TAP_SLOP_CSS = 9;
const LONG_PRESS_MS = 480;
const EDGE = 0.07;

/**
 * Unified mouse / touch / pen handling for every world. Each pointer owns one
 * gesture, captured on press: a tap never turns into a drag (movement beyond a
 * small slop cancels it), and a drag only ever moves the object it started on,
 * so neighbouring objects are never activated by accident. Background gestures
 * pan the camera (one finger) or zoom it (two fingers / mouse wheel).
 */
export class InteractionSystem {
  private gestures = new Map<number, Gesture>();
  private pinchStart: { dist: number; mid: Vec2 } | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly host: InteractionHost) {
    const input = scene.input;
    input.topOnly = true;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.down, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.up, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.up, this);
    input.on(Phaser.Input.Events.POINTER_WHEEL, this.wheel, this);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.cancelAll, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.game.events.off(Phaser.Core.Events.BLUR, this.cancelAll, this);
      this.gestures.clear();
    });
  }

  private slop(): number {
    return TAP_SLOP_CSS * this.host.dpr;
  }

  private world(p: Phaser.Input.Pointer): Vec2 {
    return this.host.rig.screenToWorld(p.x, p.y);
  }

  get activeDrags(): InteractiveObject[] {
    return [...this.gestures.values()].filter((g) => g.dragging && g.obj).map((g) => g.obj!);
  }

  isHeld(o: InteractiveObject): boolean {
    for (const g of this.gestures.values()) if (g.obj === o) return true;
    return false;
  }

  private down(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (!this.host.acceptingInput()) return;
    if (this.gestures.has(pointer.id)) return;
    const top = over[0];
    const base = { pointerId: pointer.id, startScreen: { x: pointer.x, y: pointer.y }, lastScreen: { x: pointer.x, y: pointer.y }, offset: { x: 0, y: 0 }, moved: false, dragging: false, panning: false, longPressed: false };
    const w = this.world(pointer);
    if (top && top.getData && top.getData('handle')) {
      const g: Gesture = { ...base, kind: 'handle', handle: top.getData('handle') as string };
      this.gestures.set(pointer.id, g);
      this.host.onHandle?.(g.handle!, 'down', w, pointer);
      return;
    }
    if (top instanceof InteractiveObject && !this.isHeld(top) && top.active) {
      const g: Gesture = { ...base, kind: 'object', obj: top, offset: { x: w.x - top.x, y: w.y - top.y } };
      this.gestures.set(pointer.id, g);
      this.host.onPress(top);
      if (top.can('longpress')) {
        g.timer = this.scene.time.delayedCall(LONG_PRESS_MS, () => {
          if (!g.moved && this.gestures.get(pointer.id) === g && top.active) {
            g.longPressed = true;
            this.host.onLongPress(top);
          }
        });
      }
      return;
    }
    const captured = this.host.onBackgroundDown(w, pointer);
    this.gestures.set(pointer.id, { ...base, kind: captured ? 'captured' : 'background' });
    if (!captured) this.updatePinchStart();
  }

  private backgroundPointers(): Gesture[] {
    return [...this.gestures.values()].filter((g) => g.kind === 'background');
  }

  private updatePinchStart(): void {
    const bg = this.backgroundPointers();
    if (bg.length >= 2) {
      const [a, b] = bg as [Gesture, Gesture];
      this.pinchStart = { dist: Math.max(1, Math.hypot(a.lastScreen.x - b.lastScreen.x, a.lastScreen.y - b.lastScreen.y)), mid: { x: (a.lastScreen.x + b.lastScreen.x) / 2, y: (a.lastScreen.y + b.lastScreen.y) / 2 } };
      for (const g of bg) g.moved = true;
    } else {
      this.pinchStart = null;
    }
  }

  private move(pointer: Phaser.Input.Pointer): void {
    const g = this.gestures.get(pointer.id);
    if (!g) return;
    const dxs = pointer.x - g.lastScreen.x, dys = pointer.y - g.lastScreen.y;
    g.lastScreen = { x: pointer.x, y: pointer.y };
    const dist = Math.hypot(pointer.x - g.startScreen.x, pointer.y - g.startScreen.y);
    if (dist > this.slop()) g.moved = true;
    const w = this.world(pointer);

    switch (g.kind) {
      case 'handle':
        this.host.onHandle?.(g.handle!, 'move', w, pointer);
        return;
      case 'captured':
        this.host.onBackgroundMove(w, pointer);
        return;
      case 'background': {
        if (this.pinchStart) {
          const bg = this.backgroundPointers();
          if (bg.length >= 2) {
            const [a, b] = bg as [Gesture, Gesture];
            const d = Math.max(1, Math.hypot(a.lastScreen.x - b.lastScreen.x, a.lastScreen.y - b.lastScreen.y));
            const mid = { x: (a.lastScreen.x + b.lastScreen.x) / 2, y: (a.lastScreen.y + b.lastScreen.y) / 2 };
            // two fingers: pinch to zoom and move together to pan
            this.host.rig.panBy(mid.x - this.pinchStart.mid.x, mid.y - this.pinchStart.mid.y);
            this.host.rig.zoomAt(d / this.pinchStart.dist, mid.x, mid.y);
            this.pinchStart = { dist: d, mid };
          }
          return;
        }
        if (g.moved) {
          g.panning = true;
          this.host.rig.panBy(dxs, dys);
        }
        return;
      }
      case 'object': {
        const o = g.obj!;
        if (!o.active) {
          this.gestures.delete(pointer.id);
          return;
        }
        if (!g.dragging && g.moved && !g.longPressed) {
          g.timer?.remove();
          if (o.can('drag')) {
            g.dragging = true;
            this.host.onDragStart(o, w);
          } else {
            // non-draggable objects (e.g. a pinned house) let the finger pan instead
            this.host.onRelease(o);
            g.kind = 'background';
            g.obj = undefined;
            g.panning = true;
            return;
          }
        }
        if (!g.dragging && g.longPressed && g.moved && o.can('drag')) {
          g.dragging = true;
          this.host.onDragStart(o, w);
        }
        if (g.dragging) this.host.onDragMove(o, { x: w.x - g.offset.x, y: w.y - g.offset.y }, w);
        return;
      }
    }
  }

  private up(pointer: Phaser.Input.Pointer): void {
    const g = this.gestures.get(pointer.id);
    if (!g) return;
    this.gestures.delete(pointer.id);
    g.timer?.remove();
    const w = this.world(pointer);
    switch (g.kind) {
      case 'handle':
        this.host.onHandle?.(g.handle!, 'up', w, pointer);
        break;
      case 'captured':
        this.host.onBackgroundUp(w, pointer, !g.moved);
        break;
      case 'background':
        this.updatePinchStart();
        if (!g.moved) this.host.onBackgroundUp(w, pointer, true);
        break;
      case 'object': {
        const o = g.obj!;
        if (!o.active) break;
        if (g.dragging) this.host.onDrop(o);
        else {
          this.host.onRelease(o);
          if (!g.moved && !g.longPressed && o.can('tap')) this.host.onTap(o, w);
        }
        break;
      }
    }
  }

  private wheel(pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void {
    if (!this.host.acceptingInput()) return;
    this.host.rig.zoomAt(dy > 0 ? 0.9 : 1.1, pointer.x, pointer.y);
  }

  /** Drop everything (window blur, scene change) so nothing stays stuck to a finger. */
  cancelAll(): void {
    for (const [id, g] of [...this.gestures]) {
      this.gestures.delete(id);
      g.timer?.remove();
      if (g.kind === 'object' && g.obj?.active) {
        if (g.dragging) this.host.onDrop(g.obj);
        else this.host.onRelease(g.obj);
      }
      if (g.kind === 'captured') {
        const p = this.scene.input.activePointer;
        this.host.onBackgroundUp(this.world(p), p, false);
      }
    }
    this.pinchStart = null;
  }

  /** Auto-pan when dragging near the screen edge so objects can travel across large worlds. */
  update(dt: number): void {
    if (!this.host.rig.canPan()) return;
    const cam = this.scene.cameras.main;
    for (const g of this.gestures.values()) {
      if (!(g.dragging && g.obj)) continue;
      const { x, y } = g.lastScreen;
      const inEdge = x < cam.width * EDGE || x > cam.width * (1 - EDGE) || y < cam.height * EDGE || y > cam.height * (1 - EDGE);
      if (!g.edgeArmed) {
        if (!inEdge) g.edgeArmed = true;
        continue;
      }
      let vx = 0, vy = 0;
      if (x < cam.width * EDGE) vx = 1;
      else if (x > cam.width * (1 - EDGE)) vx = -1;
      if (y < cam.height * EDGE) vy = 1;
      else if (y > cam.height * (1 - EDGE)) vy = -1;
      if (vx || vy) {
        const speed = 0.5 * dt * this.host.dpr;
        this.host.rig.panBy(vx * speed, vy * speed);
        const w = this.host.rig.screenToWorld(x, y);
        this.host.onDragMove(g.obj, { x: w.x - g.offset.x, y: w.y - g.offset.y }, w);
      }
    }
  }
}
