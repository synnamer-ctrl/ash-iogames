import Phaser from 'phaser';
import layoutJson from '../../data/world-layout.json';
import { nextStage, plantKey } from '../logic/garden';
import { assetSize } from '../../data/assets';
import type { ObjectDef, Vec2, WorldId } from '../../types/game';
import { pointInEllipse } from '../../utils/coordinates';
import { InteractiveObject } from '../objects/InteractiveObject';
import { perchOn, WorldScene, type ActionFn, type BehaviorMap } from './WorldScene';

const G = layoutJson.garden;
const POND = G.pond;
const RAINBOW_WINDOW_MS = 25000;

export const inPond = (p: Vec2, pad = 0) => pointInEllipse(p, POND.cx, POND.cy, POND.rx + pad, POND.ry + pad);

export class GardenScene extends WorldScene {
  readonly worldId: WorldId = 'garden';
  private lastRainEnd = -Infinity;
  private rainbow: Phaser.GameObjects.Image | null = null;

  constructor() {
    super({ key: 'GardenScene' });
  }

  protected setupWorld(): void {
    this.groundTop = G.meadowTop;
    this.lastRainEnd = -Infinity;
    this.zones = [
      { name: 'pond', contains: (p) => inPond(p, 8) },
      { name: 'meadow', contains: (p) => p.y > G.meadowTop + 70 && !inPond(p, 70) },
    ];
    this.rainbow = this.add.image(820, 560, 'rainbow').setDepth(80).setAlpha(0).setVisible(false);
    InteractiveObject.fitTexture(this.rainbow, 'rainbow');
    this.rainbow.setScale(this.rainbow.scaleX * 1.25);
  }

  protected spawnPoint(def: ObjectDef): Vec2 {
    const p = super.spawnPoint(def);
    if (def.layer === 'ground') {
      const foot = Phaser.Math.Clamp(p.y + 120, G.meadowTop + 90, 980);
      let x = p.x;
      if (inPond({ x, y: foot }, 40) && !def.tags.includes('swimmer')) x = POND.cx - POND.rx - 120;
      return { x, y: foot - assetSize(def.key).h / 2 };
    }
    return p;
  }

  /** Top of a soil patch's plant, where butterflies land. */
  bloomTop(soil: InteractiveObject): Vec2 {
    const plant = soil.parts.plant;
    const h = plant ? plant.displayHeight : 100;
    return { x: soil.x, y: soil.y - 18 * soil.baseScale - h * 0.82 * soil.baseScale };
  }

  grow(soil: InteractiveObject, by = 1): boolean {
    const stage = soil.persistentState.stage as number;
    let next = stage;
    for (let i = 0; i < by; i++) next = nextStage(next);
    if (next === stage) return false;
    soil.runtime.animateGrow = true;
    this.setState(soil, { stage: next });
    this.sfx('grow', { pitch: 0.9 + next * 0.1 });
    this.fx.sparkle(soil.x, soil.y - 40, 6);
    if (next === 4) this.discover('garden.bloom', this.bloomTop(soil));
    return true;
  }

  onRainStart(cloud: InteractiveObject): void {
    this.discover('garden.rain', cloud.pos);
    const cx = cloud.x + cloud.art.x;
    if (Math.abs(cx - POND.cx) < POND.rx + cloud.w * 0.3) {
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(250 + i * 380, () => this.fx.ripple(POND.cx + Phaser.Math.Between(-POND.rx * 0.6, POND.rx * 0.6), POND.cy + Phaser.Math.Between(-30, 30), 1));
      }
    }
  }

  onRainEnd(cloud: InteractiveObject): void {
    this.lastRainEnd = this.time.now;
    const cx = cloud.x + cloud.art.x;
    let grew = false;
    for (const soil of this.ofType('soil')) {
      if (Math.abs(soil.x - cx) < cloud.w * 0.5 * cloud.baseScale + 30) grew = this.grow(soil) || grew;
    }
    if (grew) this.commit();
  }

  showRainbow(): void {
    const r = this.rainbow;
    if (!r) return;
    this.tweens.killTweensOf(r);
    r.setVisible(true);
    this.tweens.chain({
      targets: r,
      tweens: [
        { alpha: 0.85, duration: this.reducedMotion ? 1 : 1500 },
        { alpha: 0, delay: 9000, duration: 2000, onComplete: () => r.setVisible(false) },
      ],
    });
    this.sfx('magic');
  }

  // ------------------------------------------------------------------ behaviours
  protected worldBehaviors(): BehaviorMap {
    return {
      sun: {
        create: (o, s) => {
          if (!s.reducedMotion && o.parts.rays) o.runtime.spin = s.tweens.add({ targets: o.parts.rays, angle: 360, duration: 60000, repeat: -1 });
        },
        tap: (o, s) => {
          const g = s as GardenScene;
          o.setTextureKey(o.main, 'sun_face_happy');
          s.time.delayedCall(1600, () => o.active && o.setTextureKey(o.main, 'sun_face'));
          s.anim.squash(o);
          if (o.parts.rays) s.anim.spinOnce(o.parts.rays, 0.25, 900);
          s.sfx('chime');
          s.fx.sparkle(o.x, o.y, 8);
          if (s.time.now - g.lastRainEnd < RAINBOW_WINDOW_MS) {
            g.showRainbow();
            s.discover('garden.rainbow', { x: 820, y: 420 });
            g.lastRainEnd = -Infinity;
          }
        },
      },
      soil: {
        apply: (o, s) => {
          const plant = o.parts.plant;
          if (!plant) return;
          const key = plantKey(o.persistentState.stage as number, o.persistentState.species as string);
          if (!key) {
            plant.setVisible(false);
            return;
          }
          plant.setVisible(true);
          o.setTextureKey(plant, key);
          const sx = plant.scaleX, sy = plant.scaleY;
          if (o.runtime.animateGrow && !s.reducedMotion) {
            o.runtime.animateGrow = false;
            s.tweens.killTweensOf(plant);
            plant.setScale(sx * 0.6, sy * 0.3);
            s.tweens.add({ targets: plant, scaleX: sx, scaleY: sy, duration: 500, ease: 'Back.easeOut' });
          }
        },
        tap: (o, s) => {
          const stage = o.persistentState.stage as number;
          if (stage === 0) {
            s.anim.squash(o, 0.5);
            s.fx.puff(o.x, o.y, 3);
            s.sfx('thud', { pitch: 1.4 });
          } else {
            const plant = o.parts.plant;
            if (plant && !s.reducedMotion) {
              s.tweens.killTweensOf(plant);
              plant.angle = 0;
              s.tweens.add({ targets: plant, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => (plant.angle = 0) });
            }
            s.sfx(stage === 4 ? 'chime' : 'rustle', { pitch: 1.2 });
            if (stage === 4) s.fx.sparkle(o.x, (s as GardenScene).bloomTop(o).y, 5);
          }
        },
      },
      packet: {
        tap: (o, s) => {
          s.anim.wiggle(o, 10);
          s.sfx('rustle', { pitch: 1.5 });
          s.fx.burst('fx_seed', o.x, o.y - 20, { count: 6, spread: 50, life: 600, gravity: 60 });
        },
      },
      wateringCan: {
        tap: (o, s) => {
          pour(o, s, true);
          s.time.delayedCall(900, () => o.active && pour(o, s, false));
          s.sfx('splash', { pitch: 1.6, volume: 0.5 });
        },
        dragMove: (o, s) => {
          const foot = { x: o.x, y: o.footY() + 30 };
          const over = inPond(foot, 10) || s.ofType('soil').some((soil) => Math.abs(soil.x - (o.x + 60)) < 90 && Math.abs(soil.y - foot.y) < 110);
          pour(o, s, over);
        },
        drop: (o, s) => {
          pour(o, s, false);
          void s;
        },
      },
      butterfly: {
        tap: (o, s) => butterflyFly(o, s as GardenScene),
      },
      bee: {
        update: (o, s, dt) => beeUpdate(o, s as GardenScene, dt),
        tap: (o, s) => {
          s.sfx('buzz');
          s.anim.spinOnce(o.art, 1, 600);
        },
        dragStart: (_o, s) => s.sfx('buzz', { pitch: 1.3 }),
      },
      duck: {
        update: (o, s, dt) => swimUpdate(o, s, dt, 26),
        tap: (o, s) => {
          s.sfx('quack', { pitch: Phaser.Math.FloatBetween(0.95, 1.1) });
          s.anim.squash(o);
          if (inPond({ x: o.x, y: o.footY() })) s.fx.ripple(o.x, o.footY() - 8, 1);
        },
      },
      frog: {
        tap: (o, s) => frogJump(o, s),
      },
      mushroom: {
        tap: (o, s) => {
          s.anim.squash(o, 1.6);
          s.sfx('boing', { pitch: o.def.type === 'mushroom_lav' ? 1.3 : 1 });
          s.fx.burst('fx_dot', o.x, o.y - o.h * 0.3, { count: 6, spread: 50, life: 700, up: true, tints: [0xfff2c4, 0xffffff] });
        },
      },
      appleTree: {
        tap: (o, s) => {
          s.anim.wiggle(o, 3);
          s.sfx('rustle');
          s.fx.burst('fx_leaf', o.x, o.y - o.h * 0.2, { count: 5, spread: 120, life: 1000, gravity: 80 });
          const k = o.baseScale;
          const from = { x: o.x + Phaser.Math.Between(-90, 90) * k, y: o.y - o.h * 0.15 * k };
          const apple = s.spawnRecycled('apple', from.x, from.y);
          apple.animationState = 'moving';
          apple.setDepth(o.depth + 1);
          const groundFoot = o.footY() + Phaser.Math.Between(6, 40);
          s.tweens.add({
            targets: apple, y: groundFoot - apple.h / 2, duration: s.reducedMotion ? 1 : 650, ease: 'Bounce.easeOut',
            onComplete: () => {
              if (!apple.active) return;
              apple.animationState = 'idle';
              s.refreshDepth(apple);
              s.sfx('thud', { pitch: 1.6 });
              s.commit();
            },
          });
          for (const b of s.ofType('bird')) if (Math.abs(b.x - o.x) < o.w * 0.5 * k && b.y < o.y) s.time.delayedCall(150, () => s.behaviorOf(b).tap?.(b, s, b.pos));
        },
      },
      rabbit: {
        tap: (o, s) => {
          s.anim.hop(o, 46);
          s.sfx('squeak', { pitch: 1.4 });
        },
        nearby: (o, other, s) => {
          if (other.def.type === 'carrot' || o.animationState !== 'idle') return;
          const dir = o.x >= other.x ? 1 : -1;
          o.animationState = 'moving';
          s.anim.hop(o, 40);
          s.tweens.add({
            targets: o, x: Phaser.Math.Clamp(o.x + dir * 90, -150, 1750), duration: s.reducedMotion ? 1 : 450, ease: 'Sine.easeOut',
            onComplete: () => {
              o.animationState = 'idle';
              s.commit();
            },
          });
        },
      },
      hedgehog: {
        apply: (o) => o.setTextureKey(o.main, o.runtime.curled ? 'hedgehog_ball' : 'hedgehog'),
        tap: (o, s) => curl(o, s),
        nearby: (o, _other, s) => curl(o, s),
      },
      snail: {
        update: (o, s, dt) => {
          if (s.reducedMotion || o.animationState !== 'idle' || o.runtime.hidden) return;
          const dir = (o.runtime.dir as number | undefined) ?? -1;
          o.x += (dir * 5 * dt) / 1000;
          o.setFacing(dir);
          const home = (o.runtime.home as number | undefined) ?? (o.runtime.home = o.x);
          if (Math.abs(o.x - home) > 70) o.runtime.dir = -dir;
        },
        tap: (o, s) => {
          o.runtime.hidden = true;
          s.sfx('squeak', { pitch: 0.7 });
          s.tweens.killTweensOf(o.bouncer);
          s.tweens.add({ targets: o.bouncer, scaleX: 0.75, scaleY: 0.85, duration: 120, yoyo: true, hold: 900, onComplete: () => (o.runtime.hidden = false) });
        },
        dragStart: (o) => {
          o.runtime.home = undefined;
        },
      },
    };
  }

  protected worldActions(): Record<string, ActionFn> {
    return {
      plantSeed: (packet, soil, s) => {
        if (!soil) return false;
        s.fx.burst('fx_seed', soil.x, soil.y - 30, { count: 8, spread: 40, life: 500, gravity: 50 });
        soil.runtime.animateGrow = true;
        s.setState(soil, { stage: 1, species: packet.persistentState.species as string });
        s.sfx('pop', { pitch: 0.8 });
        // the packet hops back a little so the new seedling stays visible
        s.tweens.add({ targets: packet, x: packet.x + 90, y: packet.y - 30, duration: s.reducedMotion ? 1 : 350, ease: 'Back.easeOut' });
      },
      waterPlant: (_can, soil, s) => {
        if (!soil) return false;
        return (s as GardenScene).grow(soil);
      },
      happyBloom: (_can, soil, s) => {
        if (!soil) return false;
        const top = (s as GardenScene).bloomTop(soil);
        s.fx.hearts(top.x, top.y, 3);
        s.sfx('chime', { pitch: 1.2 });
      },
      landOnFlower: (bfly, soil, s) => {
        if (!soil) return false;
        const top = (s as GardenScene).bloomTop(soil);
        s.tweens.add({ targets: bfly, x: top.x, y: top.y - 10, duration: s.reducedMotion ? 1 : 300, ease: 'Sine.easeOut' });
        s.fx.sparkle(top.x, top.y, 4);
        s.sfx('flutter');
      },
      perch: (bird, target, s) => {
        if (!target) return false;
        perchOn(bird, target, s, false);
      },
      eatCarrot: (carrot, rabbit, s) => {
        if (!rabbit) return false;
        s.vanish(carrot, 500);
        s.time.delayedCall(250, () => {
          if (!rabbit.active) return;
          s.anim.hop(rabbit, 36);
          s.fx.hearts(rabbit.x, rabbit.y - 50, 4);
        });
      },
      sitOnPad: (frog, pad, s) => {
        if (!pad) return false;
        frog.setPosition(pad.x, pad.y - 18 * pad.baseScale);
        s.fx.ripple(pad.x, pad.y, 1);
        s.sfx('ribbit');
      },
      swim: (o, _t, s) => {
        if (o.def.type === 'frog') {
          const pad = nearestPad(o, s);
          if (pad) {
            s.actions.sitOnPad?.(o, pad, s, null);
            s.discover('garden.frog', pad.pos);
            return;
          }
        }
        // keep swimmers comfortably inside the water
        const foot = { x: o.x, y: o.footY() - 10 };
        if (!inPond(foot, -20)) {
          const a = Math.atan2((foot.y - POND.cy) / POND.ry, (foot.x - POND.cx) / POND.rx);
          o.x = POND.cx + Math.cos(a) * POND.rx * 0.7;
          o.y = POND.cy + Math.sin(a) * POND.ry * 0.6 - (o.h / 2) * o.baseScale + 10;
        }
        s.fx.ripple(o.x, o.footY() - 6, 2);
        s.sfx('splash', { pitch: 1.4, volume: 0.6 });
      },
      splash: (o, _t, s) => {
        const at = { x: o.x, y: o.footY() - 6 };
        s.fx.splash(at.x, at.y);
        if (o.def.type === 'watering_can') return false;
        if (o.def.tags.includes('sinks')) {
          o.animationState = 'moving';
          o.disableInteractive();
          s.tweens.add({
            targets: o, alpha: 0, y: o.y + 30, duration: s.reducedMotion ? 1 : 700,
            onComplete: () => {
              if (!o.active) return;
              // wash up on the shore so the toy is never lost
              const a = Math.random() < 0.5 ? Math.PI * 0.9 : Math.PI * 0.1;
              o.setPosition(POND.cx + Math.cos(a) * (POND.rx + 70), POND.cy + Math.sin(a) * (POND.ry + 40));
              o.setAlpha(1);
              o.setInteractive();
              o.animationState = 'idle';
              s.refreshDepth(o);
              s.anim.pop(o);
              s.commit();
            },
          });
        } else {
          s.tweens.add({ targets: o.art, y: { from: -o.h / 2, to: -o.h / 2 + 5 }, duration: 700, yoyo: true, repeat: 3 });
        }
      },
      dig: (shovel, _t, s) => {
        const foot = { x: shovel.x, y: shovel.footY() };
        const soils = s.ofType('soil');
        if (soils.length >= 10 || soils.some((o) => Phaser.Math.Distance.Between(o.x, o.y, foot.x, foot.y) < 130)) return false;
        const soil = s.spawn('soil', foot.x, foot.y - 6, { animate: true });
        s.fx.burst('fx_dot', soil.x, soil.y, { count: 8, spread: 60, life: 500, tints: [0x9b6b4c, 0x7a5038] });
        s.sfx('thud');
        s.tweens.add({ targets: shovel, x: shovel.x - 110, duration: s.reducedMotion ? 1 : 350, ease: 'Back.easeOut' });
      },
    };
  }
}

// ---------------------------------------------------------------------- helpers

function pour(o: InteractiveObject, s: WorldScene, on: boolean): void {
  const target = on ? 28 : 0;
  if (o.runtime.pouring === on) return;
  o.runtime.pouring = on;
  s.tweens.killTweensOf(o.art);
  s.tweens.add({ targets: o.art, angle: target, duration: 180, ease: 'Quad.easeOut' });
  const ev = o.runtime.pourTimer as Phaser.Time.TimerEvent | undefined;
  ev?.remove();
  o.runtime.pourTimer = undefined;
  if (on) {
    o.runtime.pourTimer = s.time.addEvent({
      delay: 110, loop: true,
      callback: () => {
        if (!o.active) return;
        const spout = o.assetToWorld(146, 22);
        s.fx.burst('fx_drop', spout.x + 6, spout.y + 6, { count: 1, spread: 40, life: 450, gravity: 70, scale: [0.6, 0.9] });
      },
    });
    o.once(Phaser.GameObjects.Events.DESTROY, () => (o.runtime.pourTimer as Phaser.Time.TimerEvent | undefined)?.remove());
  }
}

function butterflyFly(o: InteractiveObject, s: GardenScene): void {
  if (o.animationState === 'moving') return;
  const blooms = s.ofType('soil').filter((soil) => soil.persistentState.stage === 4);
  let to: Vec2;
  if (blooms.length && Math.random() < 0.75) {
    const t = s.bloomTop(blooms[Math.floor(Math.random() * blooms.length)]!);
    to = { x: t.x, y: t.y - 10 };
  } else {
    to = { x: Phaser.Math.Between(80, 1500), y: Phaser.Math.Between(300, 620) };
  }
  o.animationState = 'moving';
  o.setFacing(to.x >= o.x ? 1 : -1);
  s.sfx('flutter');
  s.fx.arc(o, to, 120, 1200, () => {
    if (!o.active) return;
    o.animationState = 'idle';
    s.refreshDepth(o);
    s.commit();
  });
}

function beeUpdate(o: InteractiveObject, s: GardenScene, dt: number): void {
  if (s.reducedMotion || o.animationState !== 'idle') return;
  let target = o.runtime.target as Vec2 | undefined;
  if (!target || Phaser.Math.Distance.Between(o.x, o.y, target.x, target.y) < 12) {
    const blooms = s.ofType('soil').filter((soil) => soil.persistentState.stage === 4);
    if (blooms.length && Math.random() < 0.5) {
      const t = s.bloomTop(blooms[Math.floor(Math.random() * blooms.length)]!);
      target = { x: t.x + Phaser.Math.Between(-30, 30), y: t.y - 20 };
    } else {
      target = { x: Phaser.Math.Clamp(o.x + Phaser.Math.Between(-260, 260), 60, 1540), y: Phaser.Math.Clamp(o.y + Phaser.Math.Between(-120, 120), 420, 820) };
    }
    o.runtime.target = target;
  }
  const a = Math.atan2(target.y - o.y, target.x - o.x);
  const v = 55 * (dt / 1000);
  o.x += Math.cos(a) * v;
  o.y += Math.sin(a) * v + Math.sin(s.time.now / 140) * 0.6;
  o.setFacing(Math.cos(a) >= 0 ? 1 : -1);
}

function swimUpdate(o: InteractiveObject, s: WorldScene, dt: number, speed: number): void {
  if (s.reducedMotion || o.animationState !== 'idle') return;
  const foot = { x: o.x, y: o.footY() - 10 };
  if (!inPond(foot)) return;
  const dir = (o.runtime.dir as number | undefined) ?? 1;
  const nx = o.x + (dir * speed * dt) / 1000;
  if (!inPond({ x: nx + dir * o.w * 0.4, y: foot.y }, -10)) {
    o.runtime.dir = -dir;
    return;
  }
  o.x = nx;
  o.setFacing(dir);
  o.art.y = -o.h / 2 + Math.sin(s.time.now / 400) * 2;
}

function nearestPad(o: InteractiveObject, s: WorldScene, exclude?: InteractiveObject): InteractiveObject | null {
  const pads = s.ofType('lily_pad').filter((p) => p !== exclude && inPond({ x: p.x, y: p.y }, 10));
  pads.sort((a, b) => Phaser.Math.Distance.Between(o.x, o.y, a.x, a.y) - Phaser.Math.Distance.Between(o.x, o.y, b.x, b.y));
  return pads[0] ?? null;
}

function frogJump(o: InteractiveObject, s: WorldScene): void {
  if (o.animationState === 'moving') return;
  s.sfx('ribbit', { pitch: Phaser.Math.FloatBetween(0.9, 1.15) });
  const pads = s.ofType('lily_pad').filter((p) => inPond({ x: p.x, y: p.y }, 10) && Phaser.Math.Distance.Between(o.x, o.y, p.x, p.y) > 40);
  if (pads.length === 0) {
    s.anim.hop(o, 50);
    return;
  }
  const pad = pads[Math.floor(Math.random() * pads.length)]!;
  const to = { x: pad.x, y: pad.y - 18 * pad.baseScale };
  o.animationState = 'moving';
  o.setFacing(to.x >= o.x ? 1 : -1);
  s.fx.arc(o, to, 110, 600, () => {
    if (!o.active) return;
    o.animationState = 'idle';
    s.refreshDepth(o);
    s.fx.ripple(pad.x, pad.y, 1);
    s.sfx('splash', { pitch: 1.8, volume: 0.4 });
    s.discover('garden.frog', pad.pos);
    s.commit();
  });
}

function curl(o: InteractiveObject, s: WorldScene): void {
  if (o.runtime.curled) return;
  o.runtime.curled = true;
  s.behaviorOf(o).apply?.(o, s);
  s.anim.squash(o, 0.8);
  s.sfx('squeak', { pitch: 0.9 });
  s.discover('garden.hedgehog', o.pos);
  s.time.delayedCall(2600, () => {
    if (!o.active) return;
    o.runtime.curled = false;
    s.behaviorOf(o).apply?.(o, s);
    s.anim.squash(o, 0.5);
  });
}
