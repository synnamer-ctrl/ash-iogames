import Phaser from 'phaser';
import layoutJson from '../../data/world-layout.json';
import type { AssetKey } from '../../data/asset-manifest';
import { assetAnchor, assetSize } from '../../data/assets';
import { SHAPE_TINTS } from '../../data/palette';
import type { LineStroke, ObjectDef, Stroke, Vec2, WorldId } from '../../types/game';
import { pointInRect } from '../../utils/coordinates';
import { addPoint, countPoints, drawLine, drawStamp, renderAll } from '../drawing/Painter';
import type { ToolState } from '../GameBridge';
import { bridge } from '../GameBridge';
import { InteractiveObject } from '../objects/InteractiveObject';
import { WorldScene, type ActionFn, type BehaviorMap } from './WorldScene';

const PAPER = layoutJson.workshop.paper;
export const DEFAULT_PAPER = '#FFFDF7';
const MAX_POINTS = 250000;
const PAINT_KEY = 'workshop_paint';

export class WorkshopScene extends WorldScene {
  readonly worldId: WorldId = 'workshop';
  private paperRect!: Phaser.GameObjects.Rectangle;
  private paintCanvas!: HTMLCanvasElement;
  private paintCtx!: CanvasRenderingContext2D;
  private paintTex!: Phaser.Textures.CanvasTexture;
  private res = 1.5;
  private dirty = false;
  private stroke: LineStroke | null = null;
  private strokePointer = -1;
  private drawDist = 0;
  private selected: InteractiveObject | null = null;
  private handles: { rotate: Phaser.GameObjects.Image; scale: Phaser.GameObjects.Image } | null = null;
  private handleStart: { angle: number; rot: number; dist: number; scale: number } | null = null;

  constructor() {
    super({ key: 'WorkshopScene' });
  }

  get tool(): ToolState {
    return this.registry.get('tool') as ToolState;
  }

  protected setupWorld(): void {
    this.groundTop = null;
    this.stroke = null;
    this.selected = null;
    this.res = this.dpr >= 1.5 ? 1.5 : 1.25;
    this.paperRect = this.add.rectangle(PAPER.x, PAPER.y, PAPER.w, PAPER.h, 0xfffdf7).setOrigin(0).setDepth(10);
    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = Math.round(PAPER.w * this.res);
    this.paintCanvas.height = Math.round(PAPER.h * this.res);
    this.paintCtx = this.paintCanvas.getContext('2d')!;
    if (this.textures.exists(PAINT_KEY)) this.textures.remove(PAINT_KEY);
    this.paintTex = this.textures.addCanvas(PAINT_KEY, this.paintCanvas)!;
    this.add.image(PAPER.x, PAPER.y, PAINT_KEY).setOrigin(0).setDisplaySize(PAPER.w, PAPER.h).setDepth(20);
    this.createHandles();
    this.zones = [{ name: 'paper', contains: (p) => this.onPaper(p) }];
  }

  private onPaper(p: Vec2): boolean {
    return pointInRect(p, PAPER);
  }

  protected spawnPoint(def: ObjectDef): Vec2 {
    void def;
    const c = this.rig.viewCenter();
    const x = Phaser.Math.Clamp(c.x + Phaser.Math.Between(-120, 120), PAPER.x + 80, PAPER.x + PAPER.w - 80);
    const y = Phaser.Math.Clamp(c.y + Phaser.Math.Between(-90, 90), PAPER.y + 80, PAPER.y + PAPER.h - 80);
    return { x, y };
  }

  protected applyWorldState(): void {
    this.paperRect.setFillStyle(Phaser.Display.Color.HexStringToColor(this.worldState.paperColor ?? DEFAULT_PAPER).color);
    renderAll(this.paintCtx, this.worldState.strokes ?? [], this.res);
    this.paintTex.refresh();
    this.select(null);
  }

  protected worldUpdate(): void {
    if (this.dirty) {
      this.dirty = false;
      this.paintTex.refresh();
    }
    this.updateHandles();
  }

  // ------------------------------------------------------------------ drawing
  onBackgroundDown(world: Vec2, pointer: Phaser.Input.Pointer): boolean {
    if (!this.onPaper(world)) {
      this.select(null);
      return false;
    }
    this.select(null);
    if (this.stroke) return true; // one brush at a time; extra fingers just rest
    const t = this.tool;
    const local = { x: world.x - PAPER.x, y: world.y - PAPER.y };
    const strokes = (this.worldState.strokes ??= []);
    if (t.tool === 'bucket') {
      this.worldState.paperColor = t.color;
      this.applyPaperOnly();
      this.sfx('fill');
      this.fx.burst('fx_dot', world.x, world.y, { count: 10, spread: 160, life: 600, tints: [Phaser.Display.Color.HexStringToColor(t.color).color] });
      this.discover('workshop.bucket', world);
      this.commit();
      return true;
    }
    if (countPoints(strokes) > MAX_POINTS) {
      bridge.emit('limit', { type: 'paint' });
      return true;
    }
    if (t.tool === 'stamp') {
      const s: Stroke = { tool: 'stamp', shape: t.stamp, color: t.color, size: 36 + t.size * 2.2, x: Math.round(local.x), y: Math.round(local.y), rot: Math.round(Phaser.Math.FloatBetween(-0.3, 0.3) * 100) / 100 };
      strokes.push(s);
      drawStamp(this.paintCtx, s, this.res);
      this.dirty = true;
      this.sfx('stamp', { pitch: Phaser.Math.FloatBetween(0.9, 1.15) });
      this.fx.burst('fx_sparkle', world.x, world.y, { count: 3, spread: 50, life: 400, scale: [0.4, 0.7] });
      this.discover('workshop.stamp', world);
      this.commit();
      return true;
    }
    this.stroke = { tool: t.tool === 'eraser' ? 'eraser' : t.tool === 'crayon' ? 'crayon' : 'brush', color: t.color, size: t.size, seed: Math.floor(Math.random() * 1e9), points: [] };
    this.strokePointer = pointer.id;
    addPoint(this.stroke, local.x, local.y, 0);
    drawLine(this.paintCtx, this.stroke, this.res, 0);
    this.dirty = true;
    this.drawDist = 0;
    this.sfx('draw');
    return true;
  }

  onBackgroundMove(world: Vec2, pointer: Phaser.Input.Pointer): void {
    const s = this.stroke;
    if (!s || pointer.id !== this.strokePointer) return;
    const n = s.points.length / 2;
    const lx = world.x - PAPER.x, ly = world.y - PAPER.y;
    const px = s.points[s.points.length - 2]!, py = s.points[s.points.length - 1]!;
    if (addPoint(s, lx, ly, Math.max(1.5, s.size * 0.12))) {
      drawLine(this.paintCtx, s, this.res, n);
      this.dirty = true;
      this.drawDist += Math.hypot(lx - px, ly - py);
      if (this.drawDist > 38) {
        this.drawDist = 0;
        this.sfx('draw', { pitch: s.tool === 'crayon' ? 0.8 : s.tool === 'eraser' ? 0.6 : 1.1 });
      }
    }
  }

  onBackgroundUp(world: Vec2, pointer: Phaser.Input.Pointer, wasTap: boolean): void {
    const s = this.stroke;
    if (s && pointer.id === this.strokePointer) {
      this.stroke = null;
      this.strokePointer = -1;
      (this.worldState.strokes ??= []).push(s);
      if (s.tool === 'brush') this.discover('workshop.draw', world);
      if (s.tool === 'crayon') this.discover('workshop.crayon', world);
      this.commit();
      return;
    }
    if (!this.onPaper(world)) super.onBackgroundUp(world, pointer, wasTap);
  }

  private applyPaperOnly(): void {
    this.paperRect.setFillStyle(Phaser.Display.Color.HexStringToColor(this.worldState.paperColor ?? DEFAULT_PAPER).color);
    if (!this.reducedMotion) this.tweens.add({ targets: this.paperRect, alpha: { from: 0.6, to: 1 }, duration: 300 });
  }

  // ------------------------------------------------------------------ selection handles
  private createHandles(): void {
    const make = (key: string, icon: AssetKey, color: number) => {
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0x38454a, 1).fillCircle(30, 30, 30);
        g.fillStyle(color, 1).fillCircle(30, 30, 26);
        g.generateTexture(key, 60, 60);
        g.destroy();
      }
      const img = this.add.image(0, 0, key).setDepth(35000).setVisible(false);
      img.setInteractive(new Phaser.Geom.Circle(30, 30, 38), Phaser.Geom.Circle.Contains);
      img.setData('handle', key === 'handle_rotate' ? 'rotate' : 'scale');
      const ic = this.add.image(0, 0, icon).setDepth(35001).setVisible(false);
      InteractiveObject.fitTexture(ic, icon);
      ic.setScale(ic.scaleX * 0.62);
      img.setData('icon', ic);
      return img;
    };
    this.handles = { rotate: make('handle_rotate', 'icon_redo', 0xd7f1fb), scale: make('handle_scale', 'icon_plus', 0xd9efcf) };
  }

  select(o: InteractiveObject | null): void {
    this.selected = o && (o.can('rotate') || o.can('resize')) ? o : null;
    this.updateHandles();
  }

  private updateHandles(): void {
    if (!this.handles) return;
    const o = this.selected;
    const show = !!o && o.active && o.animationState !== 'held';
    for (const h of [this.handles.rotate, this.handles.scale]) {
      h.setVisible(show);
      (h.getData('icon') as Phaser.GameObjects.Image).setVisible(show);
      if (show) h.setInteractive();
      else h.disableInteractive();
    }
    if (!show || !o) return;
    const zoom = this.cameras.main.zoom / this.dpr;
    const hs = 1 / Math.max(0.5, zoom);
    const place = (h: Phaser.GameObjects.Image, ax: number, ay: number) => {
      const c = Math.cos(o.rotation), s = Math.sin(o.rotation);
      const lx = ax * o.w * 0.5 * o.baseScale + 18 * hs * Math.sign(ax), ly = ay * o.h * 0.5 * o.baseScale + 18 * hs * Math.sign(ay);
      h.setPosition(o.x + lx * c - ly * s, o.y + lx * s + ly * c).setScale(hs);
      const ic = h.getData('icon') as Phaser.GameObjects.Image;
      ic.setPosition(h.x, h.y).setScale((assetSize(ic.texture.key as AssetKey).w / ic.frame.width) * 0.62 * hs);
    };
    place(this.handles.rotate, 1, -1);
    place(this.handles.scale, 1, 1);
  }

  onHandle(handle: string, phase: 'down' | 'move' | 'up', world: Vec2): void {
    const o = this.selected;
    if (!o) return;
    const angle = Math.atan2(world.y - o.y, world.x - o.x);
    const dist = Math.max(10, Phaser.Math.Distance.Between(world.x, world.y, o.x, o.y));
    if (phase === 'down') {
      this.handleStart = { angle, rot: o.rotation, dist, scale: o.baseScale };
      this.sfx('pickup');
      return;
    }
    const st = this.handleStart;
    if (!st) return;
    if (phase === 'move') {
      if (handle === 'rotate' && o.can('rotate')) o.setRotation(st.rot + (angle - st.angle));
      if (handle === 'scale' && o.can('resize')) {
        const k = Phaser.Math.Clamp(st.scale * (dist / st.dist), o.def.minScale ?? 0.4, o.def.maxScale ?? 3);
        o.baseScale = k;
        o.setScale(k);
      }
      return;
    }
    this.handleStart = null;
    this.sfx('drop', { pitch: 1.2 });
    this.discover('workshop.spin', o.pos);
    this.commit();
  }

  onTap(o: InteractiveObject, world: Vec2): void {
    super.onTap(o, world);
    this.select(o);
  }

  onDragStart(o: InteractiveObject, world: Vec2): void {
    super.onDragStart(o, world);
    this.select(o);
  }

  protected afterDrop(o: InteractiveObject, settle: boolean): void {
    super.afterDrop(o, settle);
    if (o.def.tags.includes('sticker') && this.onPaper(o.pos)) this.discover('workshop.sticker', o.pos);
    this.select(o);
  }

  removeObject(o: InteractiveObject, puff = false): void {
    if (this.selected === o) this.select(null);
    super.removeObject(o, puff);
  }

  // ------------------------------------------------------------------ behaviours
  protected worldBehaviors(): BehaviorMap {
    return {
      sticker: {
        tap: (o, s) => {
          s.anim.squash(o, 0.7);
          s.sfx('pop', { pitch: Phaser.Math.FloatBetween(0.9, 1.2) });
        },
      },
      paperShape: {
        apply: (o) => {
          const tint = SHAPE_TINTS[(o.persistentState.color as number) % SHAPE_TINTS.length] ?? 0xffffff;
          o.main.setTint(tint);
        },
        tap: (o, s) => {
          s.setState(o, { color: ((o.persistentState.color as number) + 1) % SHAPE_TINTS.length });
          s.anim.squash(o, 0.8);
          s.sfx('pop', { pitch: 0.8 + ((o.persistentState.color as number) % 7) * 0.08 });
          s.discover('workshop.color', o.pos);
        },
      },
      googly: {
        update: (o, s) => {
          const p = s.input.activePointer;
          const w = s.rig.screenToWorld(p.x, p.y);
          for (const name of ['pupilA', 'pupilB'] as const) {
            const pupil = o.parts[name];
            const at = assetAnchor(o.def.key, name);
            if (!pupil || !at) continue;
            const base = { x: at[0] - o.w / 2, y: at[1] - o.h / 2 };
            if (o.runtime.spinning) continue;
            const a = Math.atan2(w.y - o.y, w.x - o.x) - o.rotation;
            pupil.setPosition(base.x + Math.cos(a) * 9, base.y + Math.sin(a) * 9);
          }
        },
        tap: (o, s) => {
          s.sfx('boing', { pitch: 1.4 });
          s.anim.squash(o, 0.6);
          o.runtime.spinning = true;
          let t = 0;
          const ev = s.time.addEvent({
            delay: 30, repeat: 24,
            callback: () => {
              t += 0.6;
              for (const name of ['pupilA', 'pupilB'] as const) {
                const at = assetAnchor(o.def.key, name);
                const pupil = o.parts[name];
                if (!at || !pupil) continue;
                pupil.setPosition(at[0] - o.w / 2 + Math.cos(t + (name === 'pupilB' ? 1 : 0)) * 9, at[1] - o.h / 2 + Math.sin(t) * 9);
              }
            },
          });
          s.time.delayedCall(800, () => {
            ev.remove();
            o.runtime.spinning = false;
          });
        },
      },
    };
  }

  protected worldActions(): Record<string, ActionFn> {
    return {
      googlyFriend: (eyes, shape, s) => {
        if (!shape) return false;
        eyes.setPosition(shape.x, shape.y - shape.h * 0.12 * shape.baseScale);
        eyes.setRotation(shape.rotation);
        s.bringToFront(eyes);
        s.anim.squash(shape);
        s.time.delayedCall(120, () => s.anim.squash(eyes));
        s.sfx('hello', { pitch: 1.3 });
      },
    };
  }

  // ------------------------------------------------------------------ export
  /** Compose the paper, painting and everything stuck on it into a PNG. */
  compose(scale: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = Math.round(PAPER.w * scale);
    c.height = Math.round(PAPER.h * scale);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = this.worldState.paperColor ?? DEFAULT_PAPER;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(this.paintCanvas, 0, 0, c.width, c.height);
    const items = [...this.objects.values()].filter((o) => o.def.layer === 'stack').sort((a, b) => a.depth - b.depth);
    for (const o of items) {
      const r = o.worldBounds();
      if (r.right < PAPER.x || r.left > PAPER.x + PAPER.w || r.bottom < PAPER.y || r.top > PAPER.y + PAPER.h) continue;
      ctx.save();
      ctx.translate((o.x - PAPER.x) * scale, (o.y - PAPER.y) * scale);
      ctx.rotate(o.rotation);
      ctx.scale(o.baseScale * scale * o.facing(), o.baseScale * scale);
      const images: [Phaser.GameObjects.Image, number, number][] = [[o.main, 0, 0]];
      for (const p of Object.values(o.parts)) if (p.visible) images.push([p, p.x, p.y]);
      for (const [img, x, y] of images) {
        const key = img.texture.key as AssetKey;
        const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        const dw = img.frame.width * img.scaleX, dh = img.frame.height * img.scaleY;
        const drawSrc = img.isTinted ? tinted(src, img.tintTopLeft) : src;
        ctx.drawImage(drawSrc, x - dw * img.originX, y - dh * img.originY, dw, dh);
      }
      ctx.restore();
    }
    return c;
  }

  exportPicture(): Promise<Blob | null> {
    return new Promise((resolve) => {
      try {
        this.compose(2).toBlob((b) => {
          if (b) {
            this.discover('workshop.export');
            this.sfx('shutter');
          }
          resolve(b);
        }, 'image/png');
      } catch {
        resolve(null);
      }
    });
  }

  thumbnail(): Promise<Blob | null> {
    return new Promise((resolve) => {
      try {
        const big = this.compose(0.5);
        const c = document.createElement('canvas');
        c.width = 360;
        c.height = 240;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#E6BE8A';
        ctx.fillRect(0, 0, 360, 240);
        const s = Math.min(340 / big.width, 220 / big.height);
        ctx.drawImage(big, (360 - big.width * s) / 2, (240 - big.height * s) / 2, big.width * s, big.height * s);
        c.toBlob((b) => resolve(b), 'image/png');
      } catch {
        resolve(null);
      }
    });
  }
}

const tintCache = new WeakMap<object, Map<number, HTMLCanvasElement>>();
/** Multiply-tint an image while keeping its alpha (matches Phaser's tint). */
function tinted(src: HTMLImageElement | HTMLCanvasElement, color: number): HTMLCanvasElement {
  let m = tintCache.get(src);
  if (!m) tintCache.set(src, (m = new Map()));
  const hit = m.get(color);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(src, 0, 0);
  m.set(color, c);
  return c;
}
