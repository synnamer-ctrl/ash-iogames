import type { Vec2 } from '../types/game';

export interface WorldDims {
  w: number;
  h: number;
  bleedX: number;
  bleedY: number;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * Camera zoom (device pixels per world pixel) that shows as much of the play
 * area as possible without ever revealing anything outside the painted bleed.
 * Wide or tall screens therefore pan instead of letterboxing.
 */
export function computeBaseZoom(viewW: number, viewH: number, d: WorldDims): number {
  if (viewW <= 0 || viewH <= 0) return 1;
  const fit = Math.min(viewW / d.w, viewH / d.h);
  const minForBleed = Math.max(viewW / (d.w + 2 * d.bleedX), viewH / (d.h + 2 * d.bleedY));
  return Math.max(fit, minForBleed);
}

/** Keep the camera centre such that the view stays inside the bleed rectangle. */
export function clampCenter(c: Vec2, viewW: number, viewH: number, zoom: number, d: WorldDims): Vec2 {
  const halfW = viewW / zoom / 2;
  const halfH = viewH / zoom / 2;
  const minX = -d.bleedX + halfW, maxX = d.w + d.bleedX - halfW;
  const minY = -d.bleedY + halfH, maxY = d.h + d.bleedY - halfH;
  return {
    x: minX > maxX ? d.w / 2 : clamp(c.x, minX, maxX),
    y: minY > maxY ? d.h / 2 : clamp(c.y, minY, maxY),
  };
}

/** Clamp a world position to the draggable region (inside the bleed, with a margin). */
export function clampToWorld(p: Vec2, d: WorldDims, margin = 30): Vec2 {
  return {
    x: clamp(p.x, -d.bleedX + margin, d.w + d.bleedX - margin),
    y: clamp(p.y, -d.bleedY + margin, d.h + d.bleedY - margin),
  };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInEllipse(p: Vec2, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (p.x - cx) / rx, dy = (p.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

export function pointInRect(p: Vec2, r: { x: number; y: number; w: number; h: number }): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
