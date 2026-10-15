import Phaser from 'phaser';
import type { Vec2 } from '../../types/game';
import { clamp, clampCenter, computeBaseZoom, type WorldDims } from '../../utils/coordinates';

/**
 * Fits the fixed-size world into any screen. Objects always live in world
 * coordinates; resizing only changes camera zoom and centre, so scenes are
 * never corrupted by orientation changes. Supports drag-pan, pinch and wheel zoom.
 */
export class CameraRig {
  private center: Vec2;
  private userZoom = 1;
  readonly maxUserZoom = 2.4;

  /** Optional: never zoom in so far that less than this many world pixels fit across. */
  minVisibleWidth = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly dims: WorldDims) {
    this.center = { x: dims.w / 2, y: dims.h / 2 };
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.layout();
  }

  get cam(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  get baseZoom(): number {
    const z = computeBaseZoom(this.scene.scale.width, this.scene.scale.height, this.dims);
    return this.minVisibleWidth > 0 ? Math.min(z, this.scene.scale.width / this.minVisibleWidth) : z;
  }

  layout(): void {
    const cam = this.cam;
    const w = this.scene.scale.width, h = this.scene.scale.height;
    cam.setSize(w, h);
    cam.setZoom(this.baseZoom * this.userZoom);
    this.apply();
  }

  private apply(): void {
    const cam = this.cam;
    this.center = clampCenter(this.center, cam.width, cam.height, cam.zoom, this.dims);
    cam.centerOn(this.center.x, this.center.y);
  }

  /** Pan by a screen-space delta (game pixels). */
  panBy(dx: number, dy: number): void {
    const z = this.cam.zoom;
    this.center = { x: this.center.x - dx / z, y: this.center.y - dy / z };
    this.apply();
  }

  centerOn(x: number, y: number): void {
    this.center = { x, y };
    this.apply();
  }

  /** Zoom around a screen point, keeping the world point under it fixed. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const cam = this.cam;
    const z0 = cam.zoom;
    const before = this.screenToWorld(sx, sy);
    this.userZoom = clamp(this.userZoom * factor, 1, this.maxUserZoom);
    const z1 = this.baseZoom * this.userZoom;
    cam.setZoom(z1);
    if (z1 === z0) return;
    this.center = { x: before.x - (sx - cam.width / 2) / z1, y: before.y - (sy - cam.height / 2) / z1 };
    this.apply();
  }

  /** Screen (game pixel) to world, computed from the rig state so it is valid mid-frame. */
  screenToWorld(sx: number, sy: number): Vec2 {
    const cam = this.cam;
    return { x: this.center.x + (sx - cam.width / 2) / cam.zoom, y: this.center.y + (sy - cam.height / 2) / cam.zoom };
  }

  /** True when the whole play area is not visible, i.e. panning is meaningful. */
  canPan(): boolean {
    const cam = this.cam;
    return cam.width / cam.zoom < this.dims.w + 2 * this.dims.bleedX - 1 || cam.height / cam.zoom < this.dims.h + 2 * this.dims.bleedY - 1;
  }

  /** Make sure a world point is visible (used when spawning objects). */
  viewCenter(): Vec2 {
    return { ...this.center };
  }

  visibleRect(): Phaser.Geom.Rectangle {
    return this.cam.worldView;
  }
}
