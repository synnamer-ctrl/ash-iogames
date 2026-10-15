import type { Vec2 } from '../types/game';

/** Area-weighted centroid of a simple polygon (Matter re-centres bodies on it). */
export function polygonCentroid(pts: readonly (readonly [number, number])[]): Vec2 {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]!, [x1, y1] = pts[(i + 1) % pts.length]!;
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a *= 0.5;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}
