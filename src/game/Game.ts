import Phaser from 'phaser';
import { worldAssetKeys } from '../data/assets';
import { worldInfo } from '../data/worlds';
import type { SceneSnapshot, WorldId } from '../types/game';
import { bridge, type GameController, type ToolState } from './GameBridge';
import { createGameConfig } from './GameConfig';
import { audio } from './systems/AudioSystem';
import type { WorldScene } from './scenes/WorldScene';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Owns the single Phaser.Game instance and exposes it to React through the
 * GameController interface. The canvas is rendered at device resolution
 * (capped at 2×) and scaled down with CSS so illustrations stay crisp.
 */
export class GameHost implements GameController {
  readonly game: Phaser.Game;
  private world: WorldId | null = null;
  private resizeObs: ResizeObserver | null = null;
  private tool: ToolState = { tool: 'brush', color: '#E2706A', size: 18, stamp: 'star' };
  private reducedMotion = false;

  constructor(private readonly parent: HTMLElement) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { w, h } = this.size();
    this.game = new Phaser.Game(createGameConfig(parent, Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)), 1 / dpr));
    this.game.registry.set('dpr', dpr);
    this.game.registry.set('tool', this.tool);
    this.resizeObs = new ResizeObserver(() => this.fit());
    this.resizeObs.observe(parent);
    window.addEventListener('orientationchange', this.fit);
  }

  private size() {
    const r = this.parent.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

  private fit = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { w, h } = this.size();
    if (w < 2 || h < 2) return;
    this.game.registry.set('dpr', dpr);
    this.game.scale.setZoom(1 / dpr);
    this.game.scale.resize(Math.round(w * dpr), Math.round(h * dpr));
  };

  private active(): WorldScene | null {
    if (!this.world) return null;
    const s = this.game.scene.getScene(worldInfo(this.world).scene) as unknown as WorldScene | null;
    return s && s.sys.isActive() ? s : null;
  }

  currentWorld(): WorldId | null {
    return this.world;
  }

  async enterWorld(world: WorldId, snapshot?: SceneSnapshot): Promise<void> {
    const prev = this.world;
    if (prev) {
      const prevScene = this.active();
      if (prevScene) await prevScene.flushAutosave();
      this.game.scene.stop(worldInfo(prev).scene);
      await nextFrame();
    }
    this.game.loop.wake();
    this.fit();
    this.releaseTexturesExcept(world);
    this.world = world;
    this.game.registry.set('reducedMotion', this.reducedMotion);
    audio.setMusic(worldInfo(world).music);
    await new Promise<void>((resolve) => {
      const off = bridge.on('worldReady', (e) => {
        if (e.world === world) {
          off();
          resolve();
        }
      });
      this.game.scene.start(worldInfo(world).scene, { snapshot });
    });
  }

  /** Free GPU memory: drop textures the next world doesn't use. */
  private releaseTexturesExcept(world: WorldId): void {
    const keep = new Set<string>(worldAssetKeys(world));
    for (const key of this.game.textures.getTextureKeys()) {
      if (!keep.has(key)) this.game.textures.remove(key);
    }
  }

  leaveWorld(): void {
    const s = this.active();
    if (s) void s.flushAutosave();
    if (this.world) this.game.scene.stop(worldInfo(this.world).scene);
    this.world = null;
    audio.setMusic({ root: 67, scale: [0, 2, 4, 7, 9], bpm: 70 });
    // stop rendering while the home screen is showing
    window.setTimeout(() => {
      if (!this.world) this.game.loop.sleep();
    }, 400);
  }

  undo(): void {
    this.active()?.undo();
  }
  redo(): void {
    this.active()?.redo();
  }
  resetScene(): void {
    this.active()?.resetScene();
  }
  spawn(type: string): boolean {
    return this.active()?.spawnFromLibrary(type) ?? false;
  }
  snapshot(): SceneSnapshot | null {
    return this.active()?.snapshot() ?? null;
  }
  loadSnapshot(s: SceneSnapshot): void {
    this.active()?.loadSnapshot(s);
  }
  thumbnail(): Promise<Blob | null> {
    return this.active()?.thumbnail() ?? Promise.resolve(null);
  }
  exportPicture(): Promise<Blob | null> {
    return this.active()?.exportPicture() ?? Promise.resolve(null);
  }
  setTool(t: Partial<ToolState>): void {
    this.tool = { ...this.tool, ...t };
    this.game.registry.set('tool', this.tool);
  }
  getTool(): ToolState {
    return this.tool;
  }
  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    this.game.registry.set('reducedMotion', on);
    this.active()?.setReducedMotion(on);
  }
  flushAutosave(): Promise<boolean> {
    return this.active()?.flushAutosave() ?? Promise.resolve(true);
  }
  hasUnsavedChanges(): boolean {
    return this.active()?.hasUnsavedChanges() ?? false;
  }

  /** Test/debug helper: objects with their on-screen (CSS pixel) positions. */
  debugObjects(): { id: string; type: string; x: number; y: number; sx: number; sy: number; depth: number; state: Record<string, unknown> }[] {
    const scene = this.active();
    if (!scene) return [];
    const out = [];
    for (const o of scene.objects.values()) {
      const p = this.worldToScreen(o.x, o.y);
      out.push({ id: o.id, type: o.def.type, x: o.x, y: o.y, sx: p.x, sy: p.y, depth: o.depth, state: { ...o.persistentState } });
    }
    return out;
  }

  /** World coordinates to CSS pixels relative to the game element. */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const scene = this.active();
    if (!scene) return { x: 0, y: 0 };
    const cam = scene.cameras.main;
    const dpr = (this.game.registry.get('dpr') as number) || 1;
    const c = scene.rig.viewCenter();
    return { x: ((wx - c.x) * cam.zoom + cam.width / 2) / dpr, y: ((wy - c.y) * cam.zoom + cam.height / 2) / dpr };
  }

  destroy(): void {
    this.resizeObs?.disconnect();
    window.removeEventListener('orientationchange', this.fit);
    this.game.destroy(true);
  }
}
