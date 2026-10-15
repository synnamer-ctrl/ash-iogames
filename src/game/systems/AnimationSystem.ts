import Phaser from 'phaser';
import type { InteractiveObject } from '../objects/InteractiveObject';

/**
 * Reusable, restrained object animations. They act on the object's inner
 * `bouncer` / `art` containers, never on its saved transform, so animations
 * can't drift an object's real position. The bouncer pivots at the object's
 * base, so squashes look grounded.
 */
export class AnimationSystem {
  reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {}

  private kill(o: InteractiveObject): void {
    this.scene.tweens.killTweensOf(o.bouncer);
  }

  press(o: InteractiveObject): void {
    this.kill(o);
    this.scene.tweens.add({ targets: o.bouncer, scaleX: 1.04, scaleY: 0.94, duration: 70, ease: 'Quad.easeOut' });
  }

  release(o: InteractiveObject): void {
    this.kill(o);
    if (this.reducedMotion) {
      o.bouncer.setScale(1);
      return;
    }
    this.scene.tweens.add({ targets: o.bouncer, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' });
  }

  /** Lift for dragging. */
  lift(o: InteractiveObject): void {
    this.kill(o);
    o.bouncer.y = o.h / 2;
    this.scene.tweens.add({ targets: o.bouncer, scaleX: 1.08, scaleY: 1.08, y: o.h / 2 - 10, duration: 120, ease: 'Quad.easeOut' });
  }

  /** Settle after a drop: a soft squash and bounce. */
  settle(o: InteractiveObject, onDone?: () => void): void {
    this.kill(o);
    if (this.reducedMotion) {
      o.bouncer.setScale(1);
      o.bouncer.y = o.h / 2;
      onDone?.();
      return;
    }
    this.scene.tweens.chain({
      targets: o.bouncer,
      tweens: [
        { scaleX: 1.1, scaleY: 0.88, y: o.h / 2, duration: 90, ease: 'Quad.easeIn' },
        { scaleX: 0.97, scaleY: 1.04, duration: 120, ease: 'Quad.easeOut' },
        { scaleX: 1, scaleY: 1, duration: 160, ease: 'Sine.easeInOut' },
      ],
      onComplete: () => onDone?.(),
    });
  }

  /** Little "boing" used for most taps. */
  squash(o: InteractiveObject, amount = 1): void {
    this.kill(o);
    o.bouncer.y = o.h / 2;
    if (this.reducedMotion) {
      this.scene.tweens.add({ targets: o.bouncer, scaleX: 1.04, scaleY: 1.04, duration: 90, yoyo: true });
      return;
    }
    this.scene.tweens.chain({
      targets: o.bouncer,
      tweens: [
        { scaleX: 1 + 0.12 * amount, scaleY: 1 - 0.14 * amount, duration: 80, ease: 'Quad.easeOut' },
        { scaleX: 1 - 0.06 * amount, scaleY: 1 + 0.1 * amount, duration: 110, ease: 'Quad.easeOut' },
        { scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' },
      ],
    });
  }

  wiggle(o: InteractiveObject, deg = 6): void {
    if (this.reducedMotion) {
      this.squash(o, 0.4);
      return;
    }
    o.stopIdle();
    this.scene.tweens.killTweensOf(o.art);
    o.art.angle = 0;
    this.scene.tweens.add({
      targets: o.art, angle: { from: -deg, to: deg }, duration: 70, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
      onComplete: () => {
        o.art.angle = 0;
        if (o.active && o.animationState !== 'held') this.idle(o);
      },
    });
  }

  hop(o: InteractiveObject, height = 40, onDone?: () => void): void {
    this.kill(o);
    if (this.reducedMotion) {
      this.squash(o, 0.5);
      onDone?.();
      return;
    }
    o.bouncer.y = o.h / 2;
    this.scene.tweens.chain({
      targets: o.bouncer,
      tweens: [
        { scaleX: 1.1, scaleY: 0.9, duration: 80 },
        { y: o.h / 2 - height, scaleX: 0.95, scaleY: 1.06, duration: 200, ease: 'Quad.easeOut' },
        { y: o.h / 2, scaleX: 1, scaleY: 1, duration: 200, ease: 'Quad.easeIn' },
        { scaleX: 1.08, scaleY: 0.92, duration: 70, yoyo: true },
      ],
      onComplete: () => onDone?.(),
    });
  }

  pop(o: InteractiveObject): void {
    this.kill(o);
    if (this.reducedMotion) {
      o.bouncer.setScale(1);
      return;
    }
    o.bouncer.setScale(0.2);
    this.scene.tweens.add({ targets: o.bouncer, scaleX: 1, scaleY: 1, duration: 380, ease: 'Back.easeOut' });
  }

  spinOnce(target: Phaser.GameObjects.Components.Transform & object, turns = 1, ms = 700): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({ targets: target, angle: `+=${360 * turns}`, duration: ms, ease: 'Cubic.easeInOut' });
  }

  /** Start the def's gentle idle loop. Only a few object types have one. */
  idle(o: InteractiveObject): void {
    o.stopIdle();
    if (this.reducedMotion) return;
    const kind = o.def.idle ?? 'none';
    const delay = Phaser.Math.Between(0, 1200);
    switch (kind) {
      case 'sway':
        o.addIdleTween(this.scene.tweens.add({ targets: o.art, angle: { from: -2.5, to: 2.5 }, duration: Phaser.Math.Between(1800, 2400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay }));
        break;
      case 'bob':
        o.addIdleTween(this.scene.tweens.add({ targets: o.art, y: { from: -o.h / 2, to: -o.h / 2 - 8 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay }));
        break;
      case 'breathe':
        o.addIdleTween(this.scene.tweens.add({ targets: o.art, scaleY: { from: 1, to: 1.025 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay }));
        break;
      case 'flutter':
        o.addIdleTween(this.scene.tweens.add({ targets: o.main, scaleX: { from: o.main.scaleX, to: o.main.scaleX * 0.45 }, duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        o.addIdleTween(this.scene.tweens.add({ targets: o.art, y: { from: -o.h / 2, to: -o.h / 2 - 10 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay }));
        break;
      case 'drift':
        o.addIdleTween(this.scene.tweens.add({ targets: o.art, x: { from: -26, to: 26 }, duration: Phaser.Math.Between(7000, 9000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay }));
        break;
      default:
        break;
    }
  }
}
