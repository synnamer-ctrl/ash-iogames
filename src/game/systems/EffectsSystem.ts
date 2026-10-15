import Phaser from 'phaser';
import type { AssetKey } from '../../data/asset-manifest';
import { InteractiveObject } from '../objects/InteractiveObject';

const MAX_PARTICLES = 70;
export const FX_DEPTH = 30000;

export interface BurstOpts {
  count?: number;
  spread?: number;
  speed?: number;
  life?: number;
  gravity?: number;
  scale?: [number, number];
  tints?: number[];
  depth?: number;
  up?: boolean;
}

/**
 * Lightweight, bounded visual effects built from pooled images and tweens.
 * Every effect has a hard cap and a finite lifetime, so nothing can loop
 * forever or flood the scene. Reduced motion swaps movement for soft fades.
 */
export class EffectsSystem {
  private active = 0;
  reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {}

  private spawnImage(key: AssetKey, x: number, y: number, depth = FX_DEPTH): Phaser.GameObjects.Image | null {
    if (this.active >= MAX_PARTICLES) return null;
    if (!this.scene.textures.exists(key)) return null;
    const img = this.scene.add.image(x, y, key);
    InteractiveObject.fitTexture(img, key);
    img.setDepth(depth);
    this.active++;
    img.once(Phaser.GameObjects.Events.DESTROY, () => this.active--);
    return img;
  }

  burst(key: AssetKey, x: number, y: number, o: BurstOpts = {}): void {
    const count = this.reducedMotion ? Math.min(3, o.count ?? 8) : (o.count ?? 8);
    for (let i = 0; i < count; i++) {
      const img = this.spawnImage(key, x, y, o.depth);
      if (!img) return;
      const base = img.scaleX;
      const [s0, s1] = o.scale ?? [0.6, 1.1];
      const s = base * Phaser.Math.FloatBetween(s0, s1);
      img.setScale(s);
      if (o.tints) img.setTint(o.tints[i % o.tints.length]!);
      const life = o.life ?? 700;
      if (this.reducedMotion) {
        img.setPosition(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-30, 10));
        this.scene.tweens.add({ targets: img, alpha: 0, duration: life, onComplete: () => img.destroy() });
        continue;
      }
      const a = o.up ? Phaser.Math.FloatBetween(-Math.PI * 0.85, -Math.PI * 0.15) : Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = (o.spread ?? 90) * Phaser.Math.FloatBetween(0.5, 1);
      const tx = x + Math.cos(a) * dist, ty = y + Math.sin(a) * dist + (o.gravity ?? 0);
      img.setAngle(Phaser.Math.Between(-30, 30));
      this.scene.tweens.add({
        targets: img, x: tx, y: ty, angle: img.angle + Phaser.Math.Between(-90, 90), scale: s * 0.5, alpha: { from: 1, to: 0 },
        duration: life * Phaser.Math.FloatBetween(0.8, 1.2), ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
      });
    }
  }

  sparkle(x: number, y: number, count = 7): void {
    this.burst('fx_sparkle', x, y, { count, spread: 80, life: 650, tints: [0xffffff, 0xffe28a, 0xfdd3dd] });
  }

  hearts(x: number, y: number, count = 4): void {
    this.floatUp('fx_heart', x, y, count);
  }

  confetti(x: number, y: number, count = 14): void {
    this.burst('fx_dot', x, y, { count, spread: 140, life: 900, gravity: 60, scale: [0.6, 1.1], tints: [0xf58f83, 0xffd66b, 0x9bcf8a, 0x9eddf5, 0xc5b5f0] });
  }

  puff(x: number, y: number, count = 5): void {
    this.burst('fx_puff', x, y, { count, spread: 50, life: 500, scale: [0.5, 0.9] });
  }

  /** Items (hearts, notes, zzz) drifting gently upward. */
  floatUp(key: AssetKey, x: number, y: number, count = 3, depth?: number): void {
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 160, () => {
        const img = this.spawnImage(key, x + Phaser.Math.Between(-24, 24), y, depth);
        if (!img) return;
        const s = img.scaleX;
        img.setScale(s * 0.4);
        this.scene.tweens.add({
          targets: img, y: y - (this.reducedMotion ? 30 : 110), x: img.x + Phaser.Math.Between(-20, 20), scale: s, alpha: { from: 1, to: 0 },
          duration: 1300, ease: 'Sine.easeOut', onComplete: () => img.destroy(),
        });
      });
    }
  }

  ripple(x: number, y: number, rings = 2): void {
    for (let i = 0; i < rings; i++) {
      this.scene.time.delayedCall(i * 220, () => {
        const img = this.spawnImage('fx_ring', x, y, 5);
        if (!img) return;
        const s = img.scaleX;
        img.setScale(s * 0.3);
        this.scene.tweens.add({ targets: img, scale: s * 1.3, alpha: { from: 0.9, to: 0 }, duration: 900, ease: 'Sine.easeOut', onComplete: () => img.destroy() });
      });
    }
  }

  splash(x: number, y: number): void {
    this.ripple(x, y, 3);
    this.burst('fx_drop', x, y - 10, { count: 7, spread: 70, life: 600, up: true, gravity: 40 });
  }

  /** Falling droplets over an area for `ms` milliseconds (bounded timer). */
  rain(getArea: () => { x: number; y: number; w: number }, ms: number, groundY: number): Phaser.Time.TimerEvent {
    const repeats = Math.floor(ms / 90);
    return this.scene.time.addEvent({
      delay: 90, repeat: repeats,
      callback: () => {
        const a = getArea();
        for (let i = 0; i < (this.reducedMotion ? 1 : 2); i++) {
          const x = a.x + Phaser.Math.FloatBetween(-a.w / 2, a.w / 2);
          const img = this.spawnImage('fx_drop', x, a.y, FX_DEPTH - 1);
          if (!img) return;
          img.setAlpha(0.85);
          const endY = groundY + Phaser.Math.Between(-30, 30);
          this.scene.tweens.add({ targets: img, y: endY, duration: Math.max(250, (endY - a.y) * 1.1), ease: 'Quad.easeIn', onComplete: () => img.destroy() });
        }
      },
    });
  }

  /** A short-lived image that pops in, waits and fades out. */
  flash(key: AssetKey, x: number, y: number, ms = 900, depth?: number): void {
    const img = this.spawnImage(key, x, y, depth);
    if (!img) return;
    const s = img.scaleX;
    img.setScale(s * 0.4);
    this.scene.tweens.chain({
      targets: img,
      tweens: [
        { scale: s, duration: 220, ease: 'Back.easeOut' },
        { alpha: 0, delay: ms, duration: 300, onComplete: () => img.destroy() },
      ],
    });
  }

  /** An image arcing from a to b (e.g. a treat popping out of the bakery). */
  arc(img: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, to: { x: number; y: number }, height = 120, ms = 600, onDone?: () => void): void {
    const from = { x: img.x, y: img.y };
    if (this.reducedMotion) {
      img.x = to.x;
      img.y = to.y;
      onDone?.();
      return;
    }
    const p = { t: 0 };
    this.scene.tweens.add({
      targets: p, t: 1, duration: ms, ease: 'Sine.easeInOut',
      onUpdate: () => {
        img.x = from.x + (to.x - from.x) * p.t;
        img.y = from.y + (to.y - from.y) * p.t - Math.sin(p.t * Math.PI) * height;
      },
      onComplete: () => onDone?.(),
    });
  }
}
