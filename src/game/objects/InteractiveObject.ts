import Phaser from 'phaser';
import type { AnimationState, InteractionType, ObjectDef, ObjectState, SavedObject, Vec2 } from '../../types/game';
import type { AssetKey } from '../../data/asset-manifest';
import { assetAnchor, assetSize } from '../../data/assets';

/**
 * A single interactive thing in a world. Transform hierarchy:
 *
 *   InteractiveObject (position, rotation, user scale, input hit area)
 *     └ bouncer  (temporary squash / lift / pop tweens)
 *         └ art  (facing flip)
 *             └ main image + named parts
 */
export class InteractiveObject extends Phaser.GameObjects.Container {
  readonly id: string;
  readonly def: ObjectDef;
  readonly bouncer: Phaser.GameObjects.Container;
  readonly art: Phaser.GameObjects.Container;
  readonly main: Phaser.GameObjects.Image;
  readonly parts: Record<string, Phaser.GameObjects.Image> = {};
  persistentState: ObjectState;
  animationState: AnimationState = 'idle';
  /** Persisted user scale (resize). */
  baseScale: number;
  /** Ordering within the 'stack' layer (workshop). */
  stackOrder = 0;
  /** Runtime-only scratch data for behaviours (never saved). */
  runtime: Record<string, unknown> = {};
  /** Art width in asset pixels (`w` is taken by Phaser's Transform). */
  readonly aw: number;
  readonly h: number;
  private idleTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, def: ObjectDef, saved: SavedObject) {
    super(scene, saved.x, saved.y);
    this.id = saved.id;
    this.def = def;
    this.persistentState = { ...(def.state ?? {}), ...saved.state };
    this.baseScale = saved.scale;
    const size = assetSize(def.key);
    this.aw = size.w;
    this.h = size.h;

    // the bouncer pivots at the object's base so squashes look grounded
    this.bouncer = new Phaser.GameObjects.Container(scene, 0, this.h / 2);
    this.art = new Phaser.GameObjects.Container(scene, 0, -this.h / 2);
    this.bouncer.add(this.art);
    this.add(this.bouncer);

    this.main = new Phaser.GameObjects.Image(scene, 0, 0, def.key);
    InteractiveObject.fitTexture(this.main, def.key);
    const behind: Phaser.GameObjects.Image[] = [];
    const front: Phaser.GameObjects.Image[] = [];
    for (const p of def.parts ?? []) {
      const at = typeof p.at === 'string' ? assetAnchor(def.key, p.at) : p.at;
      if (!at) throw new Error(`Missing anchor ${String(p.at)} on ${def.key}`);
      const img = new Phaser.GameObjects.Image(scene, at[0] - this.aw / 2, at[1] - this.h / 2, p.key);
      InteractiveObject.fitTexture(img, p.key);
      if (p.origin) img.setOrigin(p.origin[0], p.origin[1]);
      img.setVisible(p.visible ?? true);
      this.parts[p.name] = img;
      (p.behind ? behind : front).push(img);
    }
    this.art.add([...behind, this.main, ...front]);

    this.setRotation(saved.rotation);
    this.setScale(this.baseScale);
    this.setSize(this.aw, this.h);
    this.setDepth(saved.depth);
    this.setupHitArea();
  }

  /** Textures are rasterised at a higher resolution; display them at asset size. */
  static fitTexture(img: Phaser.GameObjects.Image, key: AssetKey): void {
    const { w, h } = assetSize(key);
    const frame = img.frame;
    if (frame && frame.width > 0) img.setScale(w / frame.width, h / frame.height);
  }

  setTextureKey(img: Phaser.GameObjects.Image, key: AssetKey): void {
    if (img.texture.key === key) return;
    img.setTexture(key);
    InteractiveObject.fitTexture(img, key);
  }

  private setupHitArea(): void {
    if (this.def.interactions.length === 0) return;
    const hit = this.def.hit ?? { shape: 'ellipse' as const };
    const minPx = 76;
    const hw = Math.max(minPx / 2, (this.aw * (hit.fw ?? 0.9)) / 2);
    const hh = Math.max(minPx / 2, (this.h * (hit.fh ?? 0.9)) / 2);
    const cx = this.aw / 2 + (hit.ox ?? 0), cy = this.h / 2 + (hit.oy ?? 0);
    if (hit.shape === 'rect') this.setInteractive(new Phaser.Geom.Rectangle(cx - hw, cy - hh, hw * 2, hh * 2), Phaser.Geom.Rectangle.Contains);
    else this.setInteractive(new Phaser.Geom.Ellipse(cx, cy, hw * 2, hh * 2), Phaser.Geom.Ellipse.Contains);
  }

  /** Object type id (GameObject already uses `type` for its class name). */
  get objType(): string {
    return this.def.type;
  }
  get assetKey(): AssetKey {
    return this.main.texture.key as AssetKey;
  }
  get interactionTypes(): readonly InteractionType[] {
    return this.def.interactions;
  }
  get pos(): Vec2 {
    return { x: this.x, y: this.y };
  }
  get tags(): readonly string[] {
    return this.def.tags;
  }
  can(i: InteractionType): boolean {
    return this.def.interactions.includes(i);
  }

  /** World y of the object's base, used for depth sorting. */
  footY(): number {
    return this.y + (this.h / 2) * this.baseScale;
  }

  /** Approximate world-space radius for proximity checks. */
  radius(): number {
    return (Math.max(this.aw, this.h) / 2) * this.baseScale;
  }

  worldBounds(): Phaser.Geom.Rectangle {
    const w = this.aw * this.baseScale, h = this.h * this.baseScale;
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - h / 2, w, h);
  }

  /** Convert a point in main-asset pixel space to world space. */
  assetToWorld(ax: number, ay: number): Vec2 {
    const lx = (ax - this.aw / 2) * this.art.scaleX;
    const ly = ay - this.h / 2;
    const m = this.getWorldTransformMatrix();
    return { x: m.getX(lx, ly), y: m.getY(lx, ly) };
  }

  facing(): 1 | -1 {
    return this.art.scaleX < 0 ? -1 : 1;
  }
  setFacing(dir: number): void {
    this.art.scaleX = dir < 0 ? -1 : 1;
  }

  addIdleTween(t: Phaser.Tweens.Tween): void {
    this.idleTweens.push(t);
  }
  stopIdle(): void {
    if (this.idleTweens.length === 0) return;
    for (const t of this.idleTweens) t.remove();
    this.idleTweens = [];
    this.resetArt();
  }

  /** Restore the art container to rest (after idle or interrupted tweens). */
  resetArt(): void {
    this.art.setPosition(0, -this.h / 2);
    this.art.angle = 0;
    InteractiveObject.fitTexture(this.main, this.main.texture.key as AssetKey);
  }

  serialize(): SavedObject {
    return {
      id: this.id,
      type: this.def.type,
      x: Math.round(this.x * 10) / 10,
      y: Math.round(this.y * 10) / 10,
      rotation: Math.round(this.rotation * 1000) / 1000,
      scale: Math.round(this.baseScale * 1000) / 1000,
      depth: Math.round(this.depth),
      state: { ...this.persistentState },
    };
  }

  destroy(fromScene?: boolean): void {
    this.stopIdle();
    super.destroy(fromScene);
  }
}
