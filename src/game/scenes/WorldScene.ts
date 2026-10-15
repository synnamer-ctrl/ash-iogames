import Phaser from 'phaser';
import layoutJson from '../../data/world-layout.json';
import type { AssetKey } from '../../data/asset-manifest';
import { assetUrl, svgScaleFor, worldAssetKeys } from '../../data/assets';
import { COMBINATIONS, type ComboTrigger } from '../../data/combinations';
import { DEFAULT_LAYOUTS } from '../../data/layouts';
import { getDef, KNOWN_TYPES } from '../../data/objects';
import { worldInfo } from '../../data/worlds';
import {
  SNAPSHOT_VERSION, type LayoutItem, type ObjectDef, type ObjectState, type SavedObject, type SceneSnapshot, type Vec2, type WorldId, type WorldStateData,
} from '../../types/game';
import { clampToWorld, type WorldDims } from '../../utils/coordinates';
import { makeId } from '../../utils/rng';
import { validateSnapshot } from '../../utils/validation';
import { bridge } from '../GameBridge';
import { InteractiveObject } from '../objects/InteractiveObject';
import { AnimationSystem } from '../systems/AnimationSystem';
import { audio, type SoundId } from '../systems/AudioSystem';
import { CameraRig } from '../systems/CameraRig';
import { findCombination, type Combinable } from '../systems/CombinationSystem';
import { discoveryStore } from '../systems/DiscoveryStore';
import { EffectsSystem, FX_DEPTH } from '../systems/EffectsSystem';
import { InteractionSystem, type InteractionHost } from '../systems/InteractionSystem';
import { saveSystem } from '../systems/SaveSystem';
import { UndoStack } from '../systems/UndoStack';

export const DIMS: WorldDims = layoutJson.world;
export const MAX_OBJECTS = 120;
const HELD_DEPTH = 40000;

export interface TypeBehavior {
  create?(o: InteractiveObject, s: WorldScene): void;
  /** Sync visuals from persistent state (called after create and after state changes). */
  apply?(o: InteractiveObject, s: WorldScene): void;
  tap?(o: InteractiveObject, s: WorldScene, p: Vec2): void;
  longPress?(o: InteractiveObject, s: WorldScene): void;
  dragStart?(o: InteractiveObject, s: WorldScene): void;
  dragMove?(o: InteractiveObject, s: WorldScene): void;
  /** Return true when the drop was fully handled (skips combinations & settling). */
  drop?(o: InteractiveObject, s: WorldScene): boolean | void;
  /** Something was dropped near this object. */
  nearby?(o: InteractiveObject, other: InteractiveObject, s: WorldScene): void;
  update?(o: InteractiveObject, s: WorldScene, dt: number): void;
}
export type BehaviorMap = Record<string, TypeBehavior>;
/** Applies a combination result. Return false to fall back to a normal drop. */
export type ActionFn = (actor: InteractiveObject, target: InteractiveObject | null, s: WorldScene, zone: string | null) => boolean | void;

export interface Zone {
  name: string;
  contains(p: Vec2): boolean;
}

export interface WorldSceneData {
  snapshot?: SceneSnapshot;
}

interface CombinableObject extends Combinable {
  obj: InteractiveObject;
}

/**
 * Shared foundation for all four worlds: asset loading, camera, object
 * lifecycle, the interaction → behaviour → combination pipeline, undo/redo,
 * autosave and discoveries. Worlds supply behaviours, actions and zones.
 */
export abstract class WorldScene extends Phaser.Scene implements InteractionHost {
  abstract readonly worldId: WorldId;
  readonly objects = new Map<string, InteractiveObject>();
  rig!: CameraRig;
  fx!: EffectsSystem;
  anim!: AnimationSystem;
  interaction!: InteractionSystem;
  readonly history = new UndoStack<SceneSnapshot>(40);
  worldState: WorldStateData = {};
  zones: Zone[] = [];
  behaviors: BehaviorMap = {};
  actions: Record<string, ActionFn> = {};
  dpr = 1;
  reducedMotion = false;
  /** Objects resting on the ground slide down to this y when dropped in the sky. */
  groundTop: number | null = null;
  protected background!: Phaser.GameObjects.Image;
  private ready = false;
  private stackCounter = 0;
  private autosaveTimer: Phaser.Time.TimerEvent | null = null;
  private unsaved = false;
  private persistFailed = false;
  private shadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private hover = new Map<string, { key: string; since: number; fired: boolean }>();
  private initData: WorldSceneData = {};

  // ------------------------------------------------------------------ lifecycle
  init(data: WorldSceneData): void {
    this.initData = data ?? {};
    this.ready = false;
    this.objects.clear();
    this.zones = [];
    this.worldState = {};
    this.stackCounter = 0;
    this.unsaved = false;
    this.persistFailed = false;
    this.shadows.clear();
    this.hover.clear();
    this.dpr = (this.registry.get('dpr') as number | undefined) ?? 1;
    this.reducedMotion = !!this.registry.get('reducedMotion');
  }

  preload(): void {
    const scale = this.dpr;
    for (const key of worldAssetKeys(this.worldId)) {
      if (this.textures.exists(key)) continue;
      this.load.svg(key, assetUrl(key), { scale: svgScaleFor(key as AssetKey, scale) });
    }
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => bridge.emit('loadProgress', v));
  }

  create(): void {
    bridge.emit('loadProgress', 1);
    const bgKey = worldInfo(this.worldId).background;
    this.background = this.add.image(-DIMS.bleedX, -DIMS.bleedY, bgKey).setOrigin(0, 0).setDepth(-1000);
    this.background.setDisplaySize(DIMS.w + DIMS.bleedX * 2, DIMS.h + DIMS.bleedY * 2);
    this.rig = new CameraRig(this, DIMS);
    this.fx = new EffectsSystem(this);
    this.anim = new AnimationSystem(this);
    this.fx.reducedMotion = this.anim.reducedMotion = this.reducedMotion;
    this.interaction = new InteractionSystem(this, this);
    this.behaviors = { ...COMMON_BEHAVIORS, ...this.worldBehaviors() };
    this.actions = { ...this.worldActions() };
    this.setupWorld();

    const snap = this.initData.snapshot;
    const valid = snap ? validateSnapshot(snap, KNOWN_TYPES, this.worldId) : null;
    if (valid?.ok) this.applySnapshot(valid.snapshot);
    else this.applyLayout(DEFAULT_LAYOUTS[this.worldId]);
    this.history.reset(this.snapshot());
    this.emitHistory();
    this.ready = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
    this.cameras.main.fadeIn(this.reducedMotion ? 0 : 350, 255, 247, 232);
    bridge.emit('worldReady', { world: this.worldId });
  }

  update(_time: number, delta: number): void {
    if (!this.ready) return;
    const dt = Math.min(delta, 50);
    this.interaction.update(dt);
    for (const o of this.objects.values()) {
      const b = this.behaviorOf(o);
      if (b.update && o.active) b.update(o, this, dt);
    }
    this.worldUpdate(dt);
  }

  protected onShutdown(): void {
    this.ready = false;
    this.autosaveTimer?.remove();
    this.autosaveTimer = null;
    this.objects.clear();
  }

  // ------------------------------------------------------------------ world hooks
  protected abstract worldBehaviors(): BehaviorMap;
  protected abstract worldActions(): Record<string, ActionFn>;
  /** Zones, ambient layers, etc. Called once per create before objects. */
  protected setupWorld(): void {}
  protected worldUpdate(_dt: number): void {}
  /** Re-apply world-level state (night, paper colour, strokes…). */
  protected applyWorldState(): void {}
  /** Where library items appear. */
  protected spawnPoint(def: ObjectDef): Vec2 {
    const c = this.rig.viewCenter();
    const x = c.x + Phaser.Math.Between(-90, 90);
    if (def.layer === 'sky') return { x, y: Math.min(c.y, 220) };
    if (def.layer === 'air') return { x, y: c.y - 60 };
    return { x, y: c.y + Phaser.Math.Between(-30, 60) };
  }

  acceptingInput(): boolean {
    return this.ready;
  }

  behaviorOf(o: InteractiveObject): TypeBehavior {
    return this.behaviors[o.def.behavior ?? o.def.type] ?? this.behaviors[o.def.type] ?? COMMON_BEHAVIORS.wiggle!;
  }

  // ------------------------------------------------------------------ objects
  spawn(type: string, x: number, y: number, opts: { id?: string; state?: ObjectState; scale?: number; rotation?: number; depth?: number; animate?: boolean } = {}): InteractiveObject {
    const def = getDef(type);
    const saved: SavedObject = {
      id: opts.id ?? makeId(),
      type,
      x, y,
      rotation: opts.rotation ?? 0,
      scale: opts.scale ?? 1,
      depth: opts.depth ?? 0,
      state: { ...(def.state ?? {}), ...(opts.state ?? {}) },
    };
    return this.createObject(saved, opts.animate ?? false);
  }

  protected createObject(saved: SavedObject, animate: boolean): InteractiveObject {
    const def = getDef(saved.type);
    const o = new InteractiveObject(this, def, saved);
    this.add.existing(o);
    this.objects.set(o.id, o);
    if (def.layer === 'stack') {
      o.stackOrder = saved.depth > 5000 ? saved.depth - 5000 : ++this.stackCounter;
      this.stackCounter = Math.max(this.stackCounter, o.stackOrder);
    }
    if (def.layer === 'air' && saved.depth > 0 && saved.depth < 20000) o.runtime.depthOverride = saved.depth;
    const b = this.behaviorOf(o);
    b.create?.(o, this);
    b.apply?.(o, this);
    this.refreshDepth(o);
    this.anim.idle(o);
    if (animate) {
      this.anim.pop(o);
      this.fx.puff(o.x, o.footY() - 10, 4);
      this.sfx('pop');
    }
    return o;
  }

  removeObject(o: InteractiveObject, puff = false): void {
    if (!this.objects.has(o.id)) return;
    this.objects.delete(o.id);
    this.shadows.get(o.id)?.destroy();
    this.shadows.delete(o.id);
    if (puff) this.fx.puff(o.x, o.y, 5);
    this.tweens.killTweensOf([o, o.bouncer, o.art, o.main]);
    o.destroy();
  }

  /** Remove an object with a shrink animation. */
  vanish(o: InteractiveObject, ms = 350): void {
    this.objects.delete(o.id);
    o.disableInteractive();
    this.tweens.add({ targets: o, scale: 0.01, alpha: 0, duration: this.reducedMotion ? 1 : ms, ease: 'Back.easeIn', onComplete: () => o.destroy() });
  }

  countType(type: string): number {
    let n = 0;
    for (const o of this.objects.values()) if (o.def.type === type) n++;
    return n;
  }

  ofType(...types: string[]): InteractiveObject[] {
    return [...this.objects.values()].filter((o) => types.includes(o.def.type));
  }

  withTag(tag: string): InteractiveObject[] {
    return [...this.objects.values()].filter((o) => o.def.tags.includes(tag));
  }

  /** Spawn from the object library (respects limits). */
  spawnFromLibrary(type: string): boolean {
    const def = getDef(type);
    if (this.objects.size >= MAX_OBJECTS || (def.max !== undefined && this.countType(type) >= def.max)) {
      bridge.emit('limit', { type });
      this.sfx('tick');
      return false;
    }
    const p = this.spawnPoint(def);
    const o = this.spawn(type, p.x, p.y, { animate: true });
    if (def.layer === 'stack') this.bringToFront(o);
    this.commit();
    return true;
  }

  /** Spawn an extra object while keeping the per-type limit by recycling the oldest. */
  spawnRecycled(type: string, x: number, y: number, opts: Parameters<WorldScene['spawn']>[3] = {}): InteractiveObject {
    const def = getDef(type);
    const existing = this.ofType(type);
    const max = Math.min(def.max ?? 8, 10);
    if (existing.length >= max && existing[0]) this.removeObject(existing[0], true);
    if (this.objects.size >= MAX_OBJECTS) {
      const oldest = this.objects.values().next().value;
      if (oldest) this.removeObject(oldest, true);
    }
    return this.spawn(type, x, y, opts);
  }

  bringToFront(o: InteractiveObject): void {
    o.stackOrder = ++this.stackCounter;
    this.refreshDepth(o);
  }

  refreshDepth(o: InteractiveObject): void {
    if (o.animationState === 'held') return;
    const override = o.runtime.depthOverride;
    if (typeof override === 'number') {
      o.setDepth(override);
      return;
    }
    switch (o.def.layer) {
      case 'sky':
        o.setDepth(100 + o.y * 0.01);
        break;
      case 'back':
        o.setDepth(600 + o.y * 0.01);
        break;
      case 'ground':
        o.setDepth(1000 + o.footY());
        break;
      case 'air':
        o.setDepth(20000 + o.y * 0.01);
        break;
      case 'stack':
        o.setDepth(5000 + o.stackOrder);
        break;
    }
  }

  setState(o: InteractiveObject, patch: ObjectState): void {
    Object.assign(o.persistentState, patch);
    this.behaviorOf(o).apply?.(o, this);
  }

  // ------------------------------------------------------------------ snapshots
  snapshot(): SceneSnapshot {
    const objects = [...this.objects.values()].filter((o) => o.active).map((o) => o.serialize());
    return { version: SNAPSHOT_VERSION, worldId: this.worldId, objects, world: this.serializeWorld() };
  }

  protected serializeWorld(): WorldStateData {
    const w: WorldStateData = {};
    if (this.worldState.night !== undefined) w.night = this.worldState.night;
    if (this.worldState.paperColor !== undefined) w.paperColor = this.worldState.paperColor;
    if (this.worldState.strokes) w.strokes = [...this.worldState.strokes];
    return w;
  }

  protected clearObjects(): void {
    for (const o of [...this.objects.values()]) this.removeObject(o);
    for (const s of this.shadows.values()) s.destroy();
    this.shadows.clear();
    this.hover.clear();
    this.stackCounter = 0;
  }

  applySnapshot(s: SceneSnapshot): void {
    this.interaction?.cancelAll();
    this.clearObjects();
    this.worldState = { ...s.world, strokes: s.world.strokes ? [...s.world.strokes] : undefined };
    const sorted = [...s.objects].sort((a, b) => a.depth - b.depth);
    for (const o of sorted) {
      if (!KNOWN_TYPES.has(o.type)) continue;
      this.createObject({ ...o, state: { ...o.state } }, false);
    }
    this.applyWorldState();
  }

  protected applyLayout(items: readonly LayoutItem[]): void {
    this.interaction?.cancelAll();
    this.clearObjects();
    this.worldState = {};
    for (const it of items) this.spawn(it.type, it.x, it.y, { scale: it.scale, rotation: it.rotation, state: it.state });
    this.applyWorldState();
  }

  /** Record the current scene in history and schedule an autosave. */
  commit(): void {
    if (!this.ready) return;
    if (this.history.push(this.snapshot())) {
      this.unsaved = true;
      this.emitHistory();
      this.scheduleAutosave();
    }
  }

  protected emitHistory(): void {
    bridge.emit('history', { canUndo: this.history.canUndo, canRedo: this.history.canRedo });
    bridge.emit('objectCount', { count: this.objects.size });
  }

  undo(): void {
    const prev = this.history.undo();
    if (!prev) return;
    this.applySnapshot(prev);
    this.sfx('swoosh', { pitch: 0.8 });
    this.unsaved = true;
    this.emitHistory();
    this.scheduleAutosave();
  }

  redo(): void {
    const next = this.history.redo();
    if (!next) return;
    this.applySnapshot(next);
    this.sfx('swoosh', { pitch: 1.2 });
    this.unsaved = true;
    this.emitHistory();
    this.scheduleAutosave();
  }

  /** Start over with the world's default scene (undoable). */
  resetScene(): void {
    this.applyLayout(this.resetLayout());
    this.sfx('magic');
    this.fx.confetti(this.rig.viewCenter().x, this.rig.viewCenter().y, 10);
    this.commit();
  }

  protected resetLayout(): readonly LayoutItem[] {
    return DEFAULT_LAYOUTS[this.worldId];
  }

  loadSnapshot(s: SceneSnapshot): void {
    const v = validateSnapshot(s, KNOWN_TYPES, this.worldId);
    if (!v.ok) throw new Error(v.error);
    this.applySnapshot(v.snapshot);
    this.sfx('magic');
    this.commit();
  }

  private scheduleAutosave(): void {
    this.autosaveTimer?.remove();
    this.autosaveTimer = this.time.delayedCall(900, () => void this.flushAutosave());
  }

  async flushAutosave(): Promise<boolean> {
    this.autosaveTimer?.remove();
    this.autosaveTimer = null;
    if (!this.unsaved) return true;
    const snap = this.snapshot();
    try {
      await saveSystem.saveAutosave(this.worldId, snap);
      this.unsaved = false;
      this.persistFailed = false;
      bridge.emit('autosave', { ok: true });
      return true;
    } catch (e) {
      this.persistFailed = true;
      bridge.emit('autosave', { ok: false, kind: (e as { kind?: 'unavailable' | 'quota' | 'unknown' }).kind ?? 'unknown' });
      return false;
    }
  }

  /** True only when there are changes that could not be kept automatically. */
  hasUnsavedChanges(): boolean {
    return this.unsaved && this.persistFailed;
  }

  // ------------------------------------------------------------------ discoveries & feedback
  discover(id: string, at?: Vec2): void {
    if (!discoveryStore.add(id)) return;
    const p = at ?? this.rig.viewCenter();
    this.time.delayedCall(250, () => {
      this.sfx('discover');
      this.fx.burst('fx_star', p.x, p.y - 40, { count: 8, spread: 120, life: 900, up: true });
    });
    bridge.emit('discovery', { id });
  }

  sfx(id: SoundId | string, opts?: { pitch?: number; volume?: number }): void {
    audio.play(id as SoundId, opts);
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    this.fx.reducedMotion = this.anim.reducedMotion = on;
    for (const o of this.objects.values()) this.anim.idle(o);
  }

  // ------------------------------------------------------------------ interaction host
  onPress(o: InteractiveObject): void {
    o.animationState = 'pressed';
    this.anim.press(o);
  }

  onRelease(o: InteractiveObject): void {
    if (o.animationState === 'pressed') o.animationState = 'idle';
    this.anim.release(o);
  }

  private signature(): string {
    let s = `${this.objects.size}|`;
    for (const o of this.objects.values()) s += o.id + JSON.stringify(o.persistentState);
    return s;
  }

  onTap(o: InteractiveObject, world: Vec2): void {
    const before = this.signature();
    const b = this.behaviorOf(o);
    if (b.tap) b.tap(o, this, world);
    else {
      this.anim.wiggle(o);
      this.sfx('tap', { pitch: Phaser.Math.FloatBetween(0.9, 1.1) });
    }
    if (o.def.layer === 'stack') this.bringToFront(o);
    if (this.signature() !== before) this.commit();
  }

  onLongPress(o: InteractiveObject): void {
    const b = this.behaviorOf(o);
    const before = this.signature();
    if (b.longPress) b.longPress(o, this);
    else this.anim.squash(o);
    if (this.signature() !== before) this.commit();
  }

  onDragStart(o: InteractiveObject, _world: Vec2): void {
    o.animationState = 'held';
    o.stopIdle();
    o.setDepth(HELD_DEPTH);
    this.anim.lift(o);
    this.sfx('pickup', { pitch: Phaser.Math.FloatBetween(0.95, 1.08) });
    const sh = this.add.ellipse(o.x, o.footY() + 4, o.aw * 0.7 * o.baseScale, 22 * o.baseScale, 0x38454a, 0.16).setDepth(HELD_DEPTH - 1);
    this.shadows.set(o.id, sh);
    this.behaviorOf(o).dragStart?.(o, this);
  }

  onDragMove(o: InteractiveObject, target: Vec2, _world?: Vec2): void {
    const p = clampToWorld(target, DIMS, 30);
    o.setPosition(p.x, p.y);
    const sh = this.shadows.get(o.id);
    if (sh) sh.setPosition(o.x, o.footY() + 16);
    this.behaviorOf(o).dragMove?.(o, this);
    this.checkHover(o);
  }

  onDrop(o: InteractiveObject): void {
    this.shadows.get(o.id)?.destroy();
    this.shadows.delete(o.id);
    this.hover.delete(o.id);
    o.animationState = 'settling';
    this.sfx('drop', { pitch: Phaser.Math.FloatBetween(0.9, 1.1) });
    const b = this.behaviorOf(o);
    if (b.drop?.(o, this) === true) {
      this.afterDrop(o, false);
      return;
    }
    const combo = this.findCombo('drop', o);
    let handled = false;
    if (combo) {
      const act = this.actions[combo.rule.result];
      const res = act ? act(o, combo.target?.obj ?? null, this, combo.zone) : false;
      handled = res !== false;
      if (handled) this.comboFeedback(combo.rule, combo.target?.obj ?? o);
    }
    this.afterDrop(o, !handled);
  }

  /** Common tail of a drop: settle, fall to the ground, react, record. */
  protected afterDrop(o: InteractiveObject, settle: boolean): void {
    if (!o.active) {
      this.commit();
      return;
    }
    const finish = () => {
      if (!o.active) return;
      if (o.animationState === 'settling') o.animationState = 'idle';
      this.refreshDepth(o);
      this.anim.idle(o);
      this.commit();
    };
    if (o.def.layer === 'stack') this.bringToFront(o);
    if (settle && o.def.layer === 'ground' && this.groundTop !== null && o.footY() < this.groundTop) {
      const targetY = this.groundTop + Phaser.Math.Between(4, 30) - (o.h / 2) * o.baseScale;
      o.animationState = 'settling';
      this.refreshDepthFor(o, targetY);
      this.tweens.add({
        targets: o, y: targetY, duration: this.reducedMotion ? 1 : Math.min(700, 200 + (targetY - o.y) * 0.8), ease: 'Bounce.easeOut',
        onComplete: () => this.anim.settle(o, finish),
      });
    } else if (settle) {
      this.refreshDepth(o);
      this.anim.settle(o, finish);
    } else {
      this.anim.release(o);
      finish();
    }
    this.notifyNearby(o);
  }

  private refreshDepthFor(o: InteractiveObject, y: number): void {
    if (o.def.layer === 'ground') o.setDepth(1000 + y + (o.h / 2) * o.baseScale);
  }

  protected notifyNearby(o: InteractiveObject): void {
    for (const other of this.objects.values()) {
      if (other === o) continue;
      const b = this.behaviorOf(other);
      if (!b.nearby) continue;
      if (Phaser.Math.Distance.Between(o.x, o.footY(), other.x, other.footY()) < 170 * Math.max(1, other.baseScale)) b.nearby(other, o, this);
    }
  }

  comboFeedback(rule: { discovery?: string; sound?: string; effect?: string }, at: InteractiveObject): void {
    if (rule.sound) this.sfx(rule.sound);
    if (rule.effect === 'sparkle') this.fx.sparkle(at.x, at.y - 20);
    if (rule.effect === 'hearts') this.fx.hearts(at.x, at.y - at.h * 0.3);
    if (rule.discovery) this.discover(rule.discovery, { x: at.x, y: at.y });
  }

  // ------------------------------------------------------------------ combinations
  asCombinable(o: InteractiveObject): CombinableObject {
    return { id: o.id, type: o.def.type, tags: o.def.tags, state: o.persistentState, obj: o };
  }

  /** Objects the actor overlaps, nearest first. */
  candidatesFor(o: InteractiveObject): CombinableObject[] {
    const foot = { x: o.x, y: o.footY() };
    const out: { c: CombinableObject; d: number }[] = [];
    for (const other of this.objects.values()) {
      if (other === o || !other.active) continue;
      const r = other.worldBounds();
      Phaser.Geom.Rectangle.Inflate(r, 18, 18);
      if (r.contains(o.x, o.y) || r.contains(foot.x, foot.y)) {
        out.push({ c: this.asCombinable(other), d: Phaser.Math.Distance.Between(o.x, o.y, other.x, other.y) });
      }
    }
    return out.sort((a, b) => a.d - b.d).map((e) => e.c);
  }

  zonesAt(p: Vec2): string[] {
    return this.zones.filter((z) => z.contains(p)).map((z) => z.name);
  }

  findCombo(trigger: ComboTrigger, o: InteractiveObject) {
    const foot = { x: o.x, y: o.footY() };
    const zones = [...new Set([...this.zonesAt(foot), ...this.zonesAt(o.pos)])];
    const rules = COMBINATIONS.filter((r) => r.world === this.worldId);
    return findCombination(rules, trigger, this.asCombinable(o), this.candidatesFor(o), zones);
  }

  /** Hover combinations (e.g. watering a plant) fire after a short dwell. */
  private checkHover(o: InteractiveObject): void {
    const combo = this.findCombo('hover', o);
    if (!combo) {
      this.hover.delete(o.id);
      return;
    }
    const key = `${combo.rule.id}:${combo.target?.id ?? combo.zone}`;
    const h = this.hover.get(o.id);
    const now = this.time.now;
    if (!h || h.key !== key) {
      this.hover.set(o.id, { key, since: now, fired: false });
      return;
    }
    if (!h.fired && now - h.since > 650) {
      h.fired = true;
      const act = this.actions[combo.rule.result];
      if (act && act(o, combo.target?.obj ?? null, this, combo.zone) !== false) {
        this.comboFeedback(combo.rule, combo.target?.obj ?? o);
        // allow repeated growth while the can keeps hovering
        this.time.delayedCall(900, () => {
          const cur = this.hover.get(o.id);
          if (cur && cur.key === key) this.hover.set(o.id, { key: '', since: this.time.now, fired: false });
        });
      }
    }
  }

  // ------------------------------------------------------------------ background
  onBackgroundDown(_world: Vec2, _pointer: Phaser.Input.Pointer): boolean {
    return false;
  }
  onBackgroundMove(_world: Vec2, _pointer: Phaser.Input.Pointer): void {}
  onBackgroundUp(world: Vec2, _pointer: Phaser.Input.Pointer, wasTap: boolean): void {
    if (!wasTap) return;
    this.fx.burst('fx_sparkle', world.x, world.y, { count: 4, spread: 40, life: 450, scale: [0.4, 0.7], depth: FX_DEPTH });
    this.sfx('tick', { pitch: Phaser.Math.FloatBetween(0.9, 1.3) });
  }

  // ------------------------------------------------------------------ capture
  /** A small PNG thumbnail of the current view for the creations gallery. */
  thumbnail(): Promise<Blob | null> {
    return new Promise((resolve) => {
      try {
        this.game.renderer.snapshot((img) => {
          if (!(img instanceof HTMLImageElement)) return resolve(null);
          const canvas = document.createElement('canvas');
          const tw = 360, th = 240;
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          const s = Math.max(tw / img.width, th / img.height);
          const w = img.width * s, h = img.height * s;
          ctx.drawImage(img, (tw - w) / 2, (th - h) / 2, w, h);
          canvas.toBlob((b) => resolve(b), 'image/png');
        });
      } catch {
        resolve(null);
      }
    });
  }

  exportPicture(): Promise<Blob | null> {
    return this.thumbnail();
  }
}

// -------------------------------------------------------------------- common behaviours
const tapSound = (s: WorldScene, o: InteractiveObject) => s.sfx('tap', { pitch: Phaser.Math.Clamp(140 / Math.max(o.aw, o.h), 0.6, 1.5) });

export const COMMON_BEHAVIORS: BehaviorMap = {
  wiggle: {
    tap: (o, s) => {
      s.anim.wiggle(o);
      tapSound(s, o);
    },
  },
  tree: {
    tap: (o, s) => {
      s.anim.wiggle(o, 3);
      s.sfx('rustle');
      s.fx.burst('fx_leaf', o.x, o.y - o.h * 0.15, { count: 5, spread: 100, life: 1000, gravity: 80 });
    },
  },
  cloud: {
    apply: (o, s) => {
      o.setTextureKey(o.main, o.runtime.raining ? 'cloud_rain' : (o.def.key as AssetKey));
      void s;
    },
    tap: (o, s) => {
      if (o.runtime.raining) {
        s.anim.squash(o, 0.5);
        return;
      }
      o.runtime.raining = true;
      s.behaviorOf(o).apply?.(o, s);
      s.anim.squash(o);
      s.sfx('rain');
      const ground = s.groundTop !== null ? s.groundTop + 260 : o.y + 500;
      s.fx.rain(() => ({ x: o.x + o.art.x, y: o.y + o.h * 0.3, w: o.aw * 0.75 }), 2600, ground);
      s.time.delayedCall(2700, () => {
        if (!o.active) return;
        o.runtime.raining = false;
        s.behaviorOf(o).apply?.(o, s);
        (s as unknown as { onRainEnd?: (c: InteractiveObject) => void }).onRainEnd?.(o);
      });
      (s as unknown as { onRainStart?: (c: InteractiveObject) => void }).onRainStart?.(o);
    },
  },
  bird: {
    apply: (o) => {
      o.setFacing((o.persistentState.dir as number) ?? 1);
    },
    tap: (o, s) => birdFly(o, s),
    dragStart: (o, s) => {
      o.runtime.depthOverride = undefined;
      flap(o, s, true);
      s.sfx('flutter');
    },
    drop: (o, s) => {
      flap(o, s, false);
      const combo = s.findCombo('drop', o);
      if (combo && combo.target) {
        const act = s.actions[combo.rule.result];
        if (act && act(o, combo.target.obj, s, null) !== false) {
          s.comboFeedback(combo.rule, combo.target.obj);
          return true;
        }
      }
      // not on a perch: flutter down onto the nearest perch or the ground
      birdFly(o, s);
      return true;
    },
  },
};

function flap(o: InteractiveObject, s: WorldScene, on: boolean): void {
  const ev = o.runtime.flapTimer as Phaser.Time.TimerEvent | undefined;
  ev?.remove();
  o.runtime.flapTimer = undefined;
  if (!on) {
    o.setTextureKey(o.main, 'bird_up');
    return;
  }
  let up = true;
  o.runtime.flapTimer = s.time.addEvent({
    delay: 110, loop: true,
    callback: () => {
      up = !up;
      if (o.active) o.setTextureKey(o.main, up ? 'bird_up' : 'bird_down');
    },
  });
}

/** Perch points on trees and other perch-tagged objects. */
export function perchPoint(target: InteractiveObject): Vec2 {
  if (target.def.type === 'streetlight') return target.assetToWorld(56, 14);
  const k = target.baseScale;
  return { x: target.x + Phaser.Math.Between(-target.aw * 0.18, target.aw * 0.18) * k, y: target.y - target.h * 0.34 * k };
}

export function perchOn(o: InteractiveObject, target: InteractiveObject, s: WorldScene, animate = true): void {
  const p = perchPoint(target);
  const done = () => {
    flap(o, s, false);
    o.persistentState.perched = true;
    o.runtime.depthOverride = target.depth + 0.5;
    s.refreshDepth(o);
    s.anim.squash(o, 0.6);
    s.sfx('squeak', { pitch: 1.2 });
  };
  const dir = p.x >= o.x ? 1 : -1;
  o.persistentState.dir = dir;
  o.setFacing(dir);
  if (!animate || s.reducedMotion) {
    o.setPosition(p.x, p.y);
    done();
    return;
  }
  flap(o, s, true);
  o.animationState = 'moving';
  o.runtime.depthOverride = 25000;
  s.refreshDepth(o);
  s.fx.arc(o, p, 80, 900, () => {
    if (!o.active) return;
    o.animationState = 'idle';
    done();
    s.commit();
  });
}

function birdFly(o: InteractiveObject, s: WorldScene): void {
  if (o.animationState === 'moving') return;
  const perches = s.withTag('perch').filter((t) => t.active);
  s.sfx('flutter');
  s.sfx('squeak');
  if (perches.length === 0) {
    s.anim.hop(o, 30);
    return;
  }
  // fly to a different perch than the nearest one so it visibly travels
  perches.sort((a, b) => Phaser.Math.Distance.Between(o.x, o.y, a.x, a.y) - Phaser.Math.Distance.Between(o.x, o.y, b.x, b.y));
  const pick = perches.length > 1 ? perches[1 + Math.floor(Math.random() * (perches.length - 1))]! : perches[0]!;
  perchOn(o, pick, s, true);
}
