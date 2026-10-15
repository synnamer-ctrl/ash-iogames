import Phaser from 'phaser';
import layoutJson from '../../data/world-layout.json';
import { assetSize } from '../../data/assets';
import type { ObjectDef, Vec2, WorldId } from '../../types/game';
import { InteractiveObject } from '../objects/InteractiveObject';
import { perchOn, WorldScene, type ActionFn, type BehaviorMap } from './WorldScene';

const T = layoutJson.town;
const ROAD = { top: T.road.y - 12, bottom: T.road.y + T.road.h + 14 };
const SPEEDS: Record<string, number> = { car_red: 150, car_teal: 135, bus: 100, ice_cream_van: 110, bike: 85 };
const TREATS = ['treat_croissant', 'treat_cupcake', 'treat_donut', 'treat_cookie'] as const;
const FLOWERS = ['flower_red', 'flower_yellow', 'flower_blue'] as const;
const NIGHT_TINT = 0xb3bbe0;

/** Keep a reference to each image's fitted scale so tweens can be relative to it. */
function baseSX(img: Phaser.GameObjects.Image): number {
  const k = img.getData('baseSX') as number | undefined;
  if (k !== undefined) return k;
  img.setData('baseSX', img.scaleX);
  return img.scaleX;
}

export class TownScene extends WorldScene {
  readonly worldId: WorldId = 'town';
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private stars: Phaser.GameObjects.Image[] = [];
  private treatIndex = 0;
  private flowerIndex = 0;

  constructor() {
    super({ key: 'TownScene' });
  }

  protected setupWorld(): void {
    this.groundTop = 560;
    this.zones = [{ name: 'road', contains: (p: Vec2) => p.y >= ROAD.top && p.y <= ROAD.bottom }];
    this.nightOverlay = this.add.rectangle(-300, -300, 2400, 1700, 0x2c3a6b, 0).setOrigin(0).setDepth(50);
    this.stars = [];
    for (let i = 0; i < 14; i++) {
      const s = this.add.image(Phaser.Math.Between(-150, 1750), Phaser.Math.Between(-80, 380), 'fx_star').setDepth(60).setAlpha(0);
      InteractiveObject.fitTexture(s, 'fx_star');
      s.setScale(s.scaleX * Phaser.Math.FloatBetween(0.35, 0.7));
      this.stars.push(s);
    }
  }

  protected spawnPoint(def: ObjectDef): Vec2 {
    const p = super.spawnPoint(def);
    if (def.layer === 'ground') {
      const foot = Phaser.Math.Clamp(p.y + 140, 720, 985);
      return { x: p.x, y: foot - assetSize(def.key).h / 2 };
    }
    return p;
  }

  get night(): boolean {
    return !!this.worldState.night;
  }

  protected applyWorldState(): void {
    const n = this.night;
    this.tweens.killTweensOf([this.nightOverlay, ...this.stars]);
    const ms = this.reducedMotion ? 1 : 900;
    this.tweens.add({ targets: this.nightOverlay, fillAlpha: n ? 0.42 : 0, duration: ms });
    this.stars.forEach((s, i) => this.tweens.add({ targets: s, alpha: n ? 0.9 : 0, duration: ms, delay: n ? i * 40 : 0 }));
    for (const o of this.objects.values()) this.applyNightTo(o);
  }

  /** Dim objects at night, but keep anything that glows bright. */
  applyNightTo(o: InteractiveObject): void {
    const glow = new Set(['lit', 'glow', 'red', 'amber', 'green']);
    const apply = (img: Phaser.GameObjects.Image, name?: string) => {
      if (this.night && !(name && glow.has(name))) img.setTint(NIGHT_TINT);
      else img.clearTint();
    };
    apply(o.main);
    for (const [name, img] of Object.entries(o.parts)) apply(img, name);
    this.behaviorOf(o).apply?.(o, this);
  }

  protected createObject(...args: Parameters<WorldScene['createObject']>): InteractiveObject {
    const o = super.createObject(...args);
    if (this.night) this.applyNightTo(o);
    return o;
  }

  setNight(on: boolean): void {
    this.worldState.night = on;
    for (const l of this.ofType('streetlight')) l.persistentState.on = on;
    for (const h of this.withTag('building')) h.persistentState.lights = on;
    this.applyWorldState();
  }

  // ------------------------------------------------------------------ behaviours
  protected worldBehaviors(): BehaviorMap {
    return {
      sun: {
        apply: (o, s) => {
          const night = (s as TownScene).night;
          o.setTextureKey(o.main, night ? 'moon' : 'sun_face');
          o.parts.rays?.setVisible(!night);
          if (!o.runtime.spin && !s.reducedMotion && o.parts.rays) {
            o.runtime.spin = s.tweens.add({ targets: o.parts.rays, angle: 360, duration: 60000, repeat: -1 });
          }
        },
        tap: (o, s) => {
          const t = s as TownScene;
          t.setNight(!t.night);
          s.anim.squash(o);
          s.sfx('magic', { pitch: t.night ? 0.8 : 1.1 });
          s.fx.sparkle(o.x, o.y, 8);
          if (t.night) s.discover('town.night', o.pos);
        },
      },
      house: {
        apply: (o, s) => applyHouse(o, s as TownScene),
        tap: (o, s) => {
          o.persistentState.open = !o.persistentState.open;
          applyHouse(o, s as TownScene, true);
          s.sfx('door', { pitch: o.persistentState.open ? 1 : 0.85 });
          if (o.persistentState.open) s.time.delayedCall(180, () => s.sfx('hello', { pitch: Phaser.Math.FloatBetween(0.9, 1.3) }));
        },
        longPress: (o, s) => {
          o.persistentState.lights = !o.persistentState.lights;
          applyHouse(o, s as TownScene, true);
          s.sfx('switch');
          s.anim.squash(o, 0.4);
        },
      },
      bakery: {
        apply: (o, s) => applyHouse(o, s as TownScene),
        tap: (o, s) => {
          const t = s as TownScene;
          shopPop(o, t, TREATS[t.treatIndex++ % TREATS.length]!);
        },
        longPress: (o, s) => {
          o.persistentState.lights = !o.persistentState.lights;
          applyHouse(o, s as TownScene, true);
          s.sfx('switch');
        },
      },
      florist: {
        apply: (o, s) => applyHouse(o, s as TownScene),
        tap: (o, s) => {
          const t = s as TownScene;
          shopPop(o, t, FLOWERS[t.flowerIndex++ % FLOWERS.length]!);
        },
        longPress: (o, s) => {
          o.persistentState.lights = !o.persistentState.lights;
          applyHouse(o, s as TownScene, true);
          s.sfx('switch');
        },
      },
      vehicle: {
        apply: (o) => o.setFacing(o.persistentState.dir as number),
        tap: (o, s) => {
          const t = o.def.type;
          s.anim.hop(o, 18);
          if (t === 'bike') s.sfx('ring');
          else if (t === 'ice_cream_van') {
            s.sfx('jingle');
            s.fx.floatUp('fx_note', o.x, o.y - o.h * 0.4, 5);
            s.discover('town.icecream', o.pos);
          } else s.sfx('honk', { pitch: t === 'bus' ? 0.8 : 1 });
          const onRoad = s.zonesAt({ x: o.x, y: o.footY() }).includes('road');
          if (onRoad) {
            o.persistentState.driving = !o.persistentState.driving;
            if (!o.persistentState.driving) s.sfx('squeak', { pitch: 0.7 });
          }
        },
        longPress: (o, s) => {
          o.persistentState.dir = -(o.persistentState.dir as number) || 1;
          s.anim.squash(o);
          s.sfx('swoosh');
          if (s.zonesAt({ x: o.x, y: o.footY() }).includes('road')) snapToLane(o, s, o.persistentState.dir as number);
          o.setFacing(o.persistentState.dir as number);
        },
        dragStart: (o) => {
          o.persistentState.driving = false;
          o.runtime.speed = 0;
        },
        update: (o, s, dt) => driveUpdate(o, s as TownScene, dt),
      },
      trafficLight: {
        apply: (o) => {
          const l = o.persistentState.light as string;
          o.parts.red?.setVisible(l === 'red');
          o.parts.amber?.setVisible(l === 'amber');
          o.parts.green?.setVisible(l === 'green');
        },
        tap: (o, s) => {
          const order = ['green', 'amber', 'red'];
          const i = order.indexOf(o.persistentState.light as string);
          s.setState(o, { light: order[(i + 1) % order.length]! });
          s.sfx('switch', { pitch: 0.9 + i * 0.15 });
          s.anim.squash(o, 0.4);
        },
      },
      mailbox: {
        apply: (o) => {
          const open = !!o.persistentState.open;
          o.setTextureKey(o.main, open ? 'mailbox_open' : 'mailbox');
          if (o.parts.flag) o.parts.flag.angle = open ? 0 : 90;
        },
        tap: (o, s) => {
          s.setState(o, { open: !o.persistentState.open });
          s.anim.squash(o, 0.6);
          s.sfx(o.persistentState.open ? 'pop' : 'door');
          if (o.persistentState.open) letterOut(o, s);
        },
      },
      streetlight: {
        apply: (o) => {
          const glow = o.parts.glow;
          if (glow) glow.setVisible(!!o.persistentState.on).setAlpha(0.95);
        },
        tap: (o, s) => {
          s.setState(o, { on: !o.persistentState.on });
          s.sfx('switch');
          s.anim.wiggle(o, 2);
        },
      },
      hydrant: {
        tap: (o, s) => {
          s.anim.squash(o);
          s.sfx('splash', { pitch: 1.3 });
          s.fx.burst('fx_drop', o.x, o.y - o.h * 0.4, { count: 10, spread: 110, life: 700, up: true, gravity: 70 });
        },
      },
      person: {
        create: (o, s) => {
          const blink = () => {
            if (!o.active) return;
            o.parts.blink?.setVisible(true);
            s.time.delayedCall(140, () => o.active && o.parts.blink?.setVisible(false));
          };
          const ev = s.time.addEvent({ delay: Phaser.Math.Between(2600, 4600), loop: true, callback: blink });
          o.once(Phaser.GameObjects.Events.DESTROY, () => ev.remove());
        },
        apply: (o) => o.setFacing(o.persistentState.dir as number),
        tap: (o, s) => wave(o, s),
        longPress: (o, s) => walk(o, s),
      },
      dog: {
        create: (o, s) => wagTail(o, s, 900),
        tap: (o, s) => {
          s.sfx('bark', { pitch: Phaser.Math.FloatBetween(0.95, 1.1) });
          s.anim.hop(o, 34);
          wagTail(o, s, 160, 1400);
        },
        longPress: (o, s) => {
          s.anim.spinOnce(o.art, 1, 650);
          s.fx.hearts(o.x, o.y - 30, 3);
          s.sfx('hello', { pitch: 1.4 });
        },
      },
      cat: {
        create: (o, s) => {
          const ev = s.time.addEvent({
            delay: 2600, loop: true,
            callback: () => {
              if (o.active && o.persistentState.sleeping && o.animationState === 'idle') s.fx.floatUp('fx_zzz', o.x + 30, o.y - 30, 1, o.depth + 1);
            },
          });
          o.once(Phaser.GameObjects.Events.DESTROY, () => ev.remove());
          wagTail(o, s, 1600, 0, 10);
        },
        apply: (o) => {
          const sleeping = !!o.persistentState.sleeping;
          o.setTextureKey(o.main, sleeping ? 'cat_sleep' : 'cat');
          o.parts.tail?.setVisible(!sleeping);
        },
        tap: (o, s) => {
          if (o.persistentState.sleeping) s.setState(o, { sleeping: false });
          s.sfx('meow', { pitch: Phaser.Math.FloatBetween(0.95, 1.15) });
          s.anim.squash(o);
        },
        longPress: (o, s) => {
          s.sfx('purr');
          s.fx.hearts(o.x, o.y - 30, 3);
        },
        dragStart: (o, s) => {
          if (o.persistentState.sleeping) s.setState(o, { sleeping: false });
        },
      },
      flower: {
        dragStart: (o) => {
          o.persistentState.planted = false;
        },
      },
    };
  }

  protected worldActions(): Record<string, ActionFn> {
    return {
      drive: (o, _t, s) => {
        const dir = snapToLane(o, s, null);
        o.persistentState.dir = dir;
        o.persistentState.driving = true;
        o.setFacing(dir);
        s.anim.settle(o);
        s.sfx(o.def.type === 'bike' ? 'ring' : 'honk', { pitch: 1.1 });
      },
      plantFlower: (flower, bed, s) => {
        if (!bed) return false;
        const half = (bed.aw / 2 - 26) * bed.baseScale;
        const x = Phaser.Math.Clamp(flower.x, bed.x - half, bed.x + half);
        const footY = bed.y - 4 * bed.baseScale;
        flower.setPosition(x, footY - (flower.h / 2) * flower.baseScale);
        flower.persistentState.planted = true;
        s.anim.pop(flower);
      },
      catNap: (cat, bench, s) => {
        if (!bench) return false;
        cat.setPosition(bench.x + Phaser.Math.Between(-40, 40) * bench.baseScale, bench.y - 30 * bench.baseScale - (cat.h / 2) * cat.baseScale + 10);
        s.setState(cat, { sleeping: true });
        cat.runtime.depthOverride = undefined;
        s.time.delayedCall(10, () => cat.active && cat.setDepth(bench.depth + 1));
        s.sfx('purr');
        s.fx.floatUp('fx_zzz', cat.x + 30, cat.y - 20, 2);
      },
      sitOnBench: (p, bench, s) => {
        if (!bench) return false;
        p.setPosition(bench.x + Phaser.Math.Between(-45, 45) * bench.baseScale, bench.y + 8 * bench.baseScale - (p.h / 2) * p.baseScale + 26);
        s.time.delayedCall(10, () => p.active && p.setDepth(bench.depth + 1));
        s.time.delayedCall(250, () => wave(p, s));
      },
      feedDog: (treat, dog, s) => {
        if (!dog) return false;
        s.vanish(treat);
        s.anim.hop(dog, 30);
        wagTail(dog, s, 140, 1600);
        s.time.delayedCall(200, () => s.sfx('bark', { pitch: 1.2 }));
      },
      postLetter: (p, box, s) => {
        if (!box) return false;
        s.setState(box, { open: true });
        const letter = s.add.image(p.x, p.y - 20, 'fx_letter').setDepth(box.depth + 2);
        InteractiveObject.fitTexture(letter, 'fx_letter');
        s.sfx('flutter');
        s.fx.arc(letter, { x: box.x, y: box.y - 30 }, 60, 600, () => {
          letter.destroy();
          s.sfx('pop');
          s.time.delayedCall(700, () => {
            if (!box.active) return;
            s.setState(box, { open: false });
            s.sfx('door');
            s.commit();
          });
        });
        wave(p, s);
      },
      perch: (bird, target, s) => {
        if (!target) return false;
        perchOn(bird, target, s, false);
      },
    };
  }

  /** Called by driving cars when they stop because of a red light. */
  noteRedLight(o: InteractiveObject): void {
    this.discover('town.redLight', o.pos);
  }
}

// ---------------------------------------------------------------------- helpers

function applyHouse(o: InteractiveObject, s: TownScene, animate = false): void {
  const open = !!o.persistentState.open;
  const door = o.parts.door;
  const peek = o.parts.peek;
  if (door) {
    const base = baseSX(door);
    const target = open ? base * 0.16 : base;
    s.tweens.killTweensOf(door);
    if (animate && !s.reducedMotion) s.tweens.add({ targets: door, scaleX: target, duration: 260, ease: open ? 'Back.easeOut' : 'Quad.easeIn' });
    else door.scaleX = target;
  }
  if (peek) {
    s.tweens.killTweensOf(peek);
    const py = peek.getData('baseY') as number | undefined ?? (peek.setData('baseY', peek.y), peek.y);
    if (open) {
      peek.setVisible(true);
      if (animate && !s.reducedMotion) {
        peek.y = py + 16;
        s.tweens.add({ targets: peek, y: py, duration: 300, delay: 120, ease: 'Back.easeOut' });
      } else peek.y = py;
    } else peek.setVisible(false);
  }
  const lit = o.parts.lit;
  if (lit) lit.setVisible(!!o.persistentState.lights || s.night);
}

function shopPop(o: InteractiveObject, s: TownScene, type: string): void {
  o.persistentState.open = true;
  applyHouse(o, s, true);
  s.sfx('door');
  s.anim.squash(o, 0.5);
  s.time.delayedCall(1400, () => {
    if (!o.active) return;
    o.persistentState.open = false;
    applyHouse(o, s, true);
  });
  const doorPos = o.assetToWorld(o.def.type === 'bakery' ? 255 : 235, 250);
  const item = s.spawnRecycled(type, doorPos.x, doorPos.y);
  item.setDepth(o.depth + 1);
  const landFoot = Phaser.Math.Between(735, 760);
  const to = { x: Phaser.Math.Clamp(doorPos.x + Phaser.Math.Between(-150, 150), -150, 1750), y: landFoot - item.h / 2 };
  item.animationState = 'moving';
  s.sfx('pop', { pitch: 1.1 });
  s.fx.arc(item, to, 110, 650, () => {
    if (!item.active) return;
    item.animationState = 'idle';
    s.refreshDepth(item);
    s.anim.settle(item);
    s.fx.sparkle(item.x, item.y, 4);
    s.commit();
  });
}

function letterOut(o: InteractiveObject, s: WorldScene): void {
  const img = s.add.image(o.x, o.y - 30, 'fx_letter').setDepth(o.depth + 1);
  InteractiveObject.fitTexture(img, 'fx_letter');
  s.sfx('flutter');
  s.fx.arc(img, { x: o.x + Phaser.Math.Between(60, 120), y: o.y - 160 }, 60, 700, () => {
    s.tweens.add({ targets: img, alpha: 0, angle: 30, duration: 400, onComplete: () => img.destroy() });
  });
}

function wave(o: InteractiveObject, s: WorldScene): void {
  const arm = o.parts.arm;
  s.sfx('hello', { pitch: o.def.type === 'nana' ? 0.85 : 1.25 });
  if (!arm) return;
  s.tweens.killTweensOf(arm);
  if (s.reducedMotion) {
    arm.angle = -150;
    s.time.delayedCall(700, () => (arm.angle = 0));
    return;
  }
  s.tweens.chain({
    targets: arm,
    tweens: [
      { angle: -150, duration: 160, ease: 'Quad.easeOut' },
      { angle: -120, duration: 140, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' },
      { angle: 0, duration: 220, ease: 'Quad.easeIn' },
    ],
  });
}

function walk(o: InteractiveObject, s: WorldScene): void {
  if (o.animationState === 'moving') return;
  let dir = (o.persistentState.dir as number) || 1;
  if ((dir > 0 && o.x > 1650) || (dir < 0 && o.x < -50)) dir = -dir;
  o.persistentState.dir = dir;
  o.setFacing(dir);
  const tx = o.x + dir * 160;
  o.animationState = 'moving';
  const steps = s.time.addEvent({ delay: 180, repeat: 5, callback: () => s.sfx('tick', { pitch: 0.6, volume: 0.6 }) });
  if (!s.reducedMotion) s.tweens.add({ targets: o.bouncer, y: o.h / 2 - 6, duration: 90, yoyo: true, repeat: 5 });
  s.tweens.add({
    targets: o, x: tx, duration: s.reducedMotion ? 1 : 1100, ease: 'Sine.easeInOut',
    onComplete: () => {
      steps.remove();
      o.animationState = 'idle';
      s.refreshDepth(o);
      s.commit();
    },
  });
}

function wagTail(o: InteractiveObject, s: WorldScene, period: number, burstMs = 0, amp = 18): void {
  const tail = o.parts.tail;
  if (!tail) return;
  const prev = o.runtime.wag as Phaser.Tweens.Tween | undefined;
  prev?.remove();
  tail.angle = 0;
  if (s.reducedMotion && !burstMs) return;
  const tw = s.tweens.add({ targets: tail, angle: { from: -amp, to: amp }, duration: period / 2, yoyo: true, repeat: burstMs ? Math.ceil(burstMs / period) : -1, ease: 'Sine.easeInOut' });
  o.runtime.wag = tw;
  if (burstMs) s.time.delayedCall(burstMs + 50, () => o.active && wagTail(o, s, o.def.type === 'dog' ? 900 : 1600, 0, amp));
}

/** Snap a vehicle into a lane; returns the travel direction for that lane. */
function snapToLane(o: InteractiveObject, s: WorldScene, forceDir: number | null): number {
  const foot = o.footY();
  let lane = Math.abs(foot - (T.lanes[0]! + 22)) < Math.abs(foot - (T.lanes[1]! + 22)) ? 0 : 1;
  if (forceDir !== null) lane = forceDir > 0 ? 1 : 0;
  const dir = lane === 0 ? -1 : 1;
  const targetY = T.lanes[lane]! + 22 - (o.h / 2) * o.baseScale;
  s.tweens.add({ targets: o, y: targetY, duration: s.reducedMotion ? 1 : 180, ease: 'Quad.easeOut', onComplete: () => s.refreshDepth(o) });
  return dir;
}

function driveUpdate(o: InteractiveObject, s: TownScene, dt: number): void {
  const wheels = [o.parts.wheelA, o.parts.wheelB];
  const speed = (o.runtime.speed as number | undefined) ?? 0;
  if (!o.persistentState.driving || o.animationState === 'held') {
    if (speed !== 0) o.runtime.speed = 0;
    return;
  }
  const dir = (o.persistentState.dir as number) || 1;
  const max = (SPEEDS[o.def.type] ?? 120) * o.baseScale;
  let target = max;
  const front = o.x + (dir * o.aw * o.baseScale) / 2;
  // traffic lights
  for (const l of s.ofType('traffic_light')) {
    const state = l.persistentState.light;
    if (state === 'green') continue;
    if (l.footY() < 680 || l.footY() > 820) continue;
    const stopX = dir > 0 ? l.x - 165 : l.x - 15;
    const ahead = dir > 0 ? stopX - front : front - stopX;
    if (ahead > -6 && ahead < 140) {
      target = 0;
      if (speed < 5 && !o.runtime.redNoted) {
        o.runtime.redNoted = true;
        s.noteRedLight(o);
      }
    }
  }
  if (target > 0) o.runtime.redNoted = false;
  // keep a gap to the vehicle ahead in the same lane
  for (const other of s.withTag('vehicle')) {
    if (other === o || Math.abs(other.footY() - o.footY()) > 20) continue;
    const gap = (other.x - o.x) * dir - ((o.aw * o.baseScale + other.aw * other.baseScale) / 2);
    if (gap > -20 && gap < 40) target = 0;
  }
  const accel = target > speed ? 160 : 420;
  const ns = speed + Math.sign(target - speed) * Math.min(Math.abs(target - speed), (accel * dt) / 1000);
  o.runtime.speed = ns;
  if (ns <= 0.01) return;
  o.x += (dir * ns * dt) / 1000;
  const r = (wheels[0]?.displayWidth ?? 44) / 2;
  for (const w of wheels) if (w) w.angle += ((ns * dt) / 1000 / r) * (180 / Math.PI);
  if (!s.reducedMotion) o.bouncer.y = o.h / 2 + Math.sin(s.time.now / 60) * 0.8;
  if (o.x > 1600 + 200 + o.aw / 2) o.x = -200 - o.aw / 2;
  if (o.x < -200 - o.aw / 2) o.x = 1600 + 200 + o.aw / 2;
}
