import Phaser from 'phaser';
import layoutJson from '../../data/world-layout.json';
import { COMBINATIONS } from '../../data/combinations';
import type { ObjectDef, SavedObject, Vec2, WorldId } from '../../types/game';
import { findCombination } from '../systems/CombinationSystem';
import { InteractiveObject } from '../objects/InteractiveObject';
import { polygonCentroid } from '../../utils/geometry';
import { DIMS, WorldScene, type ActionFn, type BehaviorMap } from './WorldScene';

const FLOOR = layoutJson.build.floorY;
const MAX_BODIES = 70;
type Body = MatterJS.BodyType;

/**
 * Build & Play: real rigid-body physics (Matter.js via Phaser). Bodies sleep
 * when still, the body count is capped, and anything escaping the room is
 * returned, so the simulation stays light on the CPU.
 */
export class BuildScene extends WorldScene {
  readonly worldId: WorldId = 'build';
  private Body!: typeof MatterJS.Body;
  private Sleeping!: typeof MatterJS.Sleeping;
  private settleTimer: Phaser.Time.TimerEvent | null = null;
  private pairCooldown = new Map<string, number>();
  private fallenDominoes = new Map<string, number>();
  private checkTimer = 0;

  constructor() {
    super({
      key: 'BuildScene',
      physics: {
        default: 'matter',
        matter: { gravity: { x: 0, y: 1 }, enableSleeping: true, debug: false, positionIterations: 6, velocityIterations: 4 },
      },
    });
  }

  protected setupWorld(): void {
    const M = (Phaser.Physics.Matter as unknown as { Matter: { Body: typeof MatterJS.Body; Sleeping: typeof MatterJS.Sleeping } }).Matter;
    this.Body = M.Body;
    this.Sleeping = M.Sleeping;
    this.groundTop = null;
    this.pairCooldown.clear();
    this.fallenDominoes.clear();
    const W = DIMS.w, BX = DIMS.bleedX;
    this.matter.add.rectangle(W / 2, FLOOR + 150, W + BX * 2 + 600, 300, { isStatic: true, label: 'floor', friction: 0.9 });
    this.matter.add.rectangle(-BX - 60, 0, 120, 4000, { isStatic: true, label: 'wall' });
    this.matter.add.rectangle(W + BX + 60, 0, 120, 4000, { isStatic: true, label: 'wall' });
    this.matter.world.on('collisionstart', this.onCollision, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.matter.world.off('collisionstart', this.onCollision, this);
      this.settleTimer?.remove();
      this.settleTimer = null;
    });
  }

  protected spawnPoint(def: ObjectDef): Vec2 {
    const c = this.rig.viewCenter();
    const x = c.x + Phaser.Math.Between(-140, 140);
    if (def.physics?.kind === 'static' || def.physics?.kind === 'hinge' || !def.physics) return { x, y: Phaser.Math.Clamp(c.y, 250, FLOOR - 140) };
    return { x, y: Phaser.Math.Clamp(c.y - 220, 80, FLOOR - 200) };
  }

  bodyOf(o: InteractiveObject): Body | null {
    return (o.body as Body | null) ?? null;
  }

  // ------------------------------------------------------------------ bodies
  protected createObject(saved: SavedObject, animate: boolean): InteractiveObject {
    const o = super.createObject(saved, animate);
    if (o.def.physics) this.attachBody(o, saved);
    return o;
  }

  private attachBody(o: InteractiveObject, saved: { x: number; y: number; rotation: number }): void {
    const ph = o.def.physics!;
    const k = o.baseScale;
    const flip = o.persistentState.flip ? -1 : 1;
    const opts: Phaser.Types.Physics.Matter.MatterBodyConfig = {
      friction: ph.friction ?? 0.5,
      restitution: ph.restitution ?? 0.1,
      frictionAir: ph.frictionAir ?? 0.01,
      density: ph.density ?? 0.002,
      isStatic: ph.kind === 'static',
      label: o.def.type,
      sleepThreshold: 50,
    };
    if (ph.chamfer) opts.chamfer = { radius: ph.chamfer * k };
    let shape: Phaser.Types.Physics.Matter.MatterSetBodyConfig;
    o.bouncer.x = 0;
    if (ph.shape === 'circle') shape = { type: 'circle', radius: (ph.r ?? o.w / 2) * k };
    else if (ph.shape === 'verts' && ph.verts) {
      const pts = ph.verts.map(([x, y]) => [flip > 0 ? x : o.w - x, y] as [number, number]);
      const c = polygonCentroid(pts);
      // Matter centres the body on the centroid: shift the art to match
      o.bouncer.x = -(c.x - o.w / 2);
      o.bouncer.y = o.h / 2 - (c.y - o.h / 2);
      o.runtime.centroid = c;
      shape = { type: 'fromVerts', verts: pts.map(([x, y]) => ({ x: (x - c.x) * k, y: (y - c.y) * k })) };
    } else shape = { type: 'rectangle', width: (ph.w ?? o.w) * k, height: (ph.h ?? o.h) * k };
    this.matter.add.gameObject(o, { ...opts, shape } as Phaser.Types.Physics.Matter.MatterBodyConfig);
    const body = this.bodyOf(o)!;
    this.Body.setPosition(body, { x: saved.x, y: saved.y });
    this.Body.setAngle(body, saved.rotation);
    o.setFacing(flip);
    if (ph.kind === 'hinge') this.attachHinge(o);
  }

  private attachHinge(o: InteractiveObject): void {
    const body = this.bodyOf(o)!;
    const c = this.matter.add.worldConstraint(body, 0, 1, { pointA: { x: body.position.x, y: body.position.y }, pointB: { x: 0, y: 0 } });
    o.runtime.hinge = c;
    const key = o.def.type === 'seesaw' ? 'seesaw_base' : 'pinwheel_stick';
    const follower = this.add.image(0, 0, key).setDepth(o.depth - 0.5);
    InteractiveObject.fitTexture(follower, key);
    if (o.def.type === 'seesaw') follower.setOrigin(0.5, 0.08);
    else follower.setOrigin(0.5, 0.02);
    o.runtime.follower = follower;
    o.once(Phaser.GameObjects.Events.DESTROY, () => {
      follower.destroy();
      if (this.matter?.world) this.matter.world.removeConstraint(c);
    });
    this.syncFollower(o);
  }

  private syncFollower(o: InteractiveObject): void {
    const f = o.runtime.follower as Phaser.GameObjects.Image | undefined;
    const c = o.runtime.hinge as MatterJS.ConstraintType | undefined;
    if (!f || !c) return;
    f.setPosition(c.pointA.x, c.pointA.y + (o.def.type === 'seesaw' ? -2 : 0));
    f.setDepth(o.depth - 0.5);
  }

  /** Rebuild a body after a shape change (e.g. flipping a ramp). */
  private rebuildBody(o: InteractiveObject): void {
    const saved = { x: o.x, y: o.y, rotation: o.rotation };
    if (o.body) this.matter.world.remove(o.body as Body);
    (o as unknown as { body: Body | null }).body = null;
    this.attachBody(o, saved);
    this.wakeAll();
  }

  wakeAll(): void {
    for (const o of this.objects.values()) {
      const b = this.bodyOf(o);
      if (b && !b.isStatic) this.Sleeping.set(b, false);
    }
  }

  protected applyWorldState(): void {
    this.wakeAll();
  }

  protected serializeWorld() {
    return {};
  }

  // ------------------------------------------------------------------ dragging
  onDragStart(o: InteractiveObject, world: Vec2): void {
    const body = this.bodyOf(o);
    if (!body) return super.onDragStart(o, world);
    o.animationState = 'held';
    o.stopIdle();
    this.anim.lift(o);
    this.sfx('pickup', { pitch: Phaser.Math.FloatBetween(0.95, 1.08) });
    if (body.isStatic || o.runtime.hinge) {
      o.runtime.dragOffset = { x: world.x - body.position.x, y: world.y - body.position.y };
      return;
    }
    this.Sleeping.set(body, false);
    const dx = world.x - body.position.x, dy = world.y - body.position.y;
    const ca = Math.cos(-body.angle), sa = Math.sin(-body.angle);
    const c = this.matter.add.worldConstraint(body, 0, 0.2, { pointA: { x: world.x, y: world.y }, pointB: { x: dx * ca - dy * sa, y: dx * sa + dy * ca }, damping: 0.1 });
    o.runtime.dragC = c;
    o.runtime.air = body.frictionAir;
    body.frictionAir = 0.14;
  }

  onDragMove(o: InteractiveObject, target: Vec2, world: Vec2): void {
    const body = this.bodyOf(o);
    if (!body) return super.onDragMove(o, target, world);
    const c = o.runtime.dragC as MatterJS.ConstraintType | undefined;
    if (c) {
      c.pointA.x = Phaser.Math.Clamp(world.x, -DIMS.bleedX + 30, DIMS.w + DIMS.bleedX - 30);
      c.pointA.y = Phaser.Math.Clamp(world.y, -DIMS.bleedY + 30, FLOOR + 40);
      return;
    }
    const off = (o.runtime.dragOffset as Vec2 | undefined) ?? { x: 0, y: 0 };
    const p = { x: Phaser.Math.Clamp(world.x - off.x, -DIMS.bleedX + 40, DIMS.w + DIMS.bleedX - 40), y: Phaser.Math.Clamp(world.y - off.y, -DIMS.bleedY + 40, FLOOR + 10) };
    this.Body.setPosition(body, p);
    this.Body.setVelocity(body, { x: 0, y: 0 });
    const h = o.runtime.hinge as MatterJS.ConstraintType | undefined;
    if (h) {
      h.pointA.x = p.x;
      h.pointA.y = p.y;
      this.syncFollower(o);
    }
  }

  onDrop(o: InteractiveObject): void {
    const body = this.bodyOf(o);
    if (!body) return super.onDrop(o);
    const c = o.runtime.dragC as MatterJS.ConstraintType | undefined;
    if (c) {
      this.matter.world.removeConstraint(c);
      o.runtime.dragC = undefined;
      body.frictionAir = (o.runtime.air as number | undefined) ?? 0.01;
    }
    o.animationState = 'idle';
    this.anim.release(o);
    this.sfx('drop', { pitch: Phaser.Math.FloatBetween(0.9, 1.1) });
    this.wakeAll();
    this.refreshDepth(o);
    this.settleCommit();
  }

  onTap(o: InteractiveObject, world: Vec2): void {
    super.onTap(o, world);
    if (o.body) this.settleCommit();
  }

  /** Commit once the simulation has calmed down (or after a short timeout). */
  settleCommit(): void {
    this.settleTimer?.remove();
    const start = this.time.now;
    this.settleTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: () => {
        let moving = false;
        for (const o of this.objects.values()) {
          const b = this.bodyOf(o);
          if (b && !b.isStatic && !b.isSleeping && b.speed > 0.2) moving = true;
        }
        if (!moving || this.time.now - start > 2600) {
          this.settleTimer?.remove();
          this.settleTimer = null;
          this.commit();
        }
      },
    });
  }

  spawnFromLibrary(type: string): boolean {
    const bodies = [...this.objects.values()].filter((o) => o.body).length;
    if (bodies >= MAX_BODIES) {
      this.sfx('tick');
      return false;
    }
    const ok = super.spawnFromLibrary(type);
    if (ok) this.settleCommit();
    return ok;
  }

  // ------------------------------------------------------------------ per-frame checks
  protected worldUpdate(dt: number): void {
    for (const o of this.objects.values()) {
      if (o.runtime.hinge) this.syncFollower(o);
      const b = this.bodyOf(o);
      if (!b) continue;
      if (o.animationState !== 'held') o.setDepth(o.def.layer === 'ground' ? 1000 + o.y : o.depth);
      // anything that escapes the room comes back from the top
      if (b.position.y > FLOOR + 400 || b.position.y < -2000 || b.position.x < -DIMS.bleedX - 300 || b.position.x > DIMS.w + DIMS.bleedX + 300) {
        this.Body.setPosition(b, { x: DIMS.w / 2, y: 120 });
        this.Body.setVelocity(b, { x: 0, y: 0 });
      }
    }
    this.checkTimer += dt;
    if (this.checkTimer > 300) {
      this.checkTimer = 0;
      this.checkDiscoveries();
    }
  }

  private checkDiscoveries(): void {
    const now = this.time.now;
    for (const o of this.objects.values()) {
      const b = this.bodyOf(o);
      if (!b) continue;
      if (o.def.type === 'domino') {
        const fallen = Math.abs(Math.sin(b.angle)) > 0.8;
        if (fallen && !this.fallenDominoes.has(o.id)) this.fallenDominoes.set(o.id, now);
        if (!fallen) this.fallenDominoes.delete(o.id);
      }
      if (o.def.type === 'pinwheel' && Math.abs(b.angularVelocity) > 0.22) this.discover('build.pinwheel', o.pos);
      if (o.def.tags.includes('block') && b.isSleeping && b.position.y < FLOOR - 300 && this.restsOnBlocks(b, 0)) this.discover('build.tower', o.pos);
    }
    const recent = [...this.fallenDominoes.values()].filter((t) => now - t < 4000);
    if (recent.length >= 3) this.discover('build.dominoes');
  }

  /** True when a body is held up only by other blocks, all the way down to the floor. */
  private restsOnBlocks(b: Body, depth: number): boolean {
    if (depth > 12) return false;
    const all = this.matter.world.getAllBodies() as Body[];
    const probe = { x: b.position.x, y: b.bounds.max.y + 6 };
    const hits = (this.matter.query.point(all, probe) as Body[]).map((h) => h.parent ?? h).filter((h) => h !== b);
    if (hits.some((h) => h.label === 'floor')) return true;
    const block = hits.find((h) => (h.gameObject as InteractiveObject | null)?.def?.tags.includes('block'));
    return block ? this.restsOnBlocks(block, depth + 1) : false;
  }

  private onCollision(event: { pairs: { bodyA: Body; bodyB: Body }[] }): void {
    const now = this.time.now;
    for (const pair of event.pairs) {
      const a = pair.bodyA.parent ?? pair.bodyA, b = pair.bodyB.parent ?? pair.bodyB;
      const ga = a.gameObject as InteractiveObject | null, gb = b.gameObject as InteractiveObject | null;
      const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (rel > 2.2) {
        const ball = (ga?.def.tags.includes('ball') || gb?.def.tags.includes('ball'));
        this.sfx(ball ? 'tok' : 'tok', { pitch: ball ? 1.3 : Phaser.Math.FloatBetween(0.8, 1), volume: Math.min(1, rel / 10) });
      }
      if (!(ga instanceof InteractiveObject) || !(gb instanceof InteractiveObject)) continue;
      for (const [x, y] of [[ga, gb], [gb, ga]] as const) {
        const rules = COMBINATIONS.filter((r) => r.world === 'build');
        const m = findCombination(rules, 'contact', this.asCombinable(x), [this.asCombinable(y)], []);
        if (!m || !m.target) continue;
        const key = `${m.rule.id}:${x.id}:${y.id}`;
        if ((this.pairCooldown.get(key) ?? 0) > now) continue;
        this.pairCooldown.set(key, now + 600);
        const act = this.actions[m.rule.result];
        if (act && act(x, y, this, null) !== false) this.comboFeedback(m.rule, y);
      }
    }
    if (this.pairCooldown.size > 300) this.pairCooldown.clear();
  }

  // ------------------------------------------------------------------ behaviours
  protected worldBehaviors(): BehaviorMap {
    const nudge = (o: InteractiveObject, vx: number, vy: number, spin = 0) => {
      const b = this.bodyOf(o);
      if (!b || b.isStatic) return;
      this.Sleeping.set(b, false);
      this.Body.setVelocity(b, { x: b.velocity.x + vx, y: vy });
      if (spin) this.Body.setAngularVelocity(b, spin);
    };
    return {
      block: {
        tap: (o, s) => {
          nudge(o, Phaser.Math.FloatBetween(-2, 2), -8, Phaser.Math.FloatBetween(-0.12, 0.12));
          s.sfx('tok', { pitch: 1.2 });
        },
        longPress: (o, s) => {
          const b = this.bodyOf(o);
          if (!b) return;
          this.Sleeping.set(b, false);
          this.Body.setAngle(b, b.angle + Math.PI / 4);
          s.sfx('swoosh');
        },
      },
      ball: {
        tap: (o, s) => {
          nudge(o, Phaser.Math.FloatBetween(-7, 7), -13);
          s.sfx('boing', { pitch: 1 + 30 / o.w });
        },
      },
      toyCar: {
        apply: (o) => o.setFacing((o.persistentState.dir as number) || 1),
        tap: (o, s) => {
          o.runtime.driveUntil = s.time.now + 1600;
          const b = this.bodyOf(o);
          if (b) this.Sleeping.set(b, false);
          s.sfx('honk', { pitch: 1.3 });
        },
        longPress: (o, s) => {
          o.persistentState.dir = -((o.persistentState.dir as number) || 1);
          o.setFacing(o.persistentState.dir as number);
          s.sfx('swoosh');
        },
        update: (o, s) => {
          const b = this.bodyOf(o);
          if (!b) return;
          const dir = (o.persistentState.dir as number) || 1;
          if ((o.runtime.driveUntil as number | undefined ?? 0) > s.time.now && o.animationState !== 'held') {
            this.Body.setVelocity(b, { x: dir * 7, y: b.velocity.y });
          }
          const r = 20;
          const v = b.velocity.x;
          for (const w of [o.parts.wheelA, o.parts.wheelB]) if (w) w.angle += (v / r) * (180 / Math.PI) * dir;
        },
      },
      ramp: {
        tap: (o, s) => {
          s.anim.squash(o, 0.3);
          s.sfx('tok', { pitch: 0.7 });
        },
        longPress: (o, s) => {
          o.persistentState.flip = !o.persistentState.flip;
          this.rebuildBody(o);
          s.anim.squash(o);
          s.sfx('swoosh');
        },
      },
      staticToy: {
        tap: (o, s) => {
          s.anim.squash(o, 0.3);
          s.sfx('tok', { pitch: 0.6 });
        },
        longPress: (o, s) => {
          const b = this.bodyOf(o);
          if (!b) return;
          this.Body.setAngle(b, b.angle + Math.PI / 12);
          this.wakeAll();
          s.sfx('swoosh');
        },
      },
      hinge: {
        tap: (o, s) => {
          const b = this.bodyOf(o);
          if (!b) return;
          this.Sleeping.set(b, false);
          this.Body.setAngularVelocity(b, o.def.type === 'pinwheel' ? 0.32 : 0.06);
          s.sfx(o.def.type === 'pinwheel' ? 'swoosh' : 'tok');
        },
      },
      domino: {
        tap: (o, s) => {
          const b = this.bodyOf(o);
          if (!b) return;
          this.Sleeping.set(b, false);
          this.Body.setAngularVelocity(b, 0.07);
          this.Body.setVelocity(b, { x: 1.2, y: b.velocity.y });
          s.sfx('tok', { pitch: 1.4 });
        },
      },
      bell: {
        tap: (o, s) => ringBell(o, s),
      },
      spring: {
        tap: (o, s) => {
          squashMain(o, s);
          s.sfx('boing');
        },
      },
      chute: {
        tap: (o, s) => {
          const out = o.assetToWorld(70, 176);
          const ball = s.spawnRecycled('ball_red', out.x, out.y - 10, { animate: false });
          s.anim.pop(ball);
          const b = this.bodyOf(ball);
          if (b) this.Body.setVelocity(b, { x: 0, y: 3 });
          s.anim.squash(o, 0.5);
          s.sfx('pop', { pitch: 0.9 });
          this.settleCommit();
        },
      },
    };
  }

  protected worldActions(): Record<string, ActionFn> {
    return {
      whee: (mover, _ramp, s) => {
        const b = this.bodyOf(mover);
        if (!b || b.speed < 2.5) return false;
        s.sfx('whee', { pitch: Phaser.Math.FloatBetween(0.9, 1.2) });
      },
      seesawHit: (hitter) => {
        const b = this.bodyOf(hitter);
        if (!b || b.speed < 3) return false;
      },
      ringBell: (_hitter, bell, s) => {
        if (!bell) return false;
        ringBell(bell, s);
      },
      boing: (other, spring, s) => {
        if (!spring) return false;
        const b = this.bodyOf(other);
        if (!b || b.isStatic || b.position.y > spring.y - 10) return false;
        this.Body.setVelocity(b, { x: b.velocity.x, y: -17 });
        squashMain(spring, s);
        s.sfx('boing', { pitch: 1.2 });
      },
    };
  }
}

function ringBell(o: InteractiveObject, s: WorldScene): void {
  s.sfx('ding', { pitch: Phaser.Math.FloatBetween(0.98, 1.02) });
  s.fx.floatUp('fx_note', o.x, o.y - 50, 3);
  const m = o.main;
  s.tweens.killTweensOf(m);
  m.angle = 0;
  if (!s.reducedMotion) s.tweens.add({ targets: m, angle: { from: -10, to: 10 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => (m.angle = 0) });
}

function squashMain(o: InteractiveObject, s: WorldScene): void {
  s.tweens.killTweensOf(o.art);
  o.art.scaleY = 1;
  if (!s.reducedMotion) s.tweens.add({ targets: o.art, scaleY: 0.7, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
}
