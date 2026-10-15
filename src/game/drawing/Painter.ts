import type { LineStroke, StampStroke, Stroke } from '../../types/game';
import { STAMP_PATHS } from '../../data/stamps';
import { mulberry32 } from '../../utils/rng';

/**
 * Renders workshop strokes onto a 2D canvas. Strokes are stored as vector
 * data so they can be replayed exactly for undo/redo, reloads and exports.
 * All coordinates are paper-space world pixels; `res` scales to the canvas.
 */

const stampCache = new Map<string, Path2D>();
function stampPath(shape: StampStroke['shape']): Path2D | null {
  if (typeof Path2D === 'undefined') return null;
  let p = stampCache.get(shape);
  if (!p) {
    p = new Path2D(STAMP_PATHS[shape]);
    stampCache.set(shape, p);
  }
  return p;
}

export function drawStamp(ctx: CanvasRenderingContext2D, s: StampStroke, res: number): void {
  const p = stampPath(s.shape);
  if (!p) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(s.x * res, s.y * res);
  ctx.rotate(s.rot);
  const k = (s.size * res) / 100;
  ctx.scale(k, k);
  ctx.translate(-50, -50);
  ctx.fillStyle = s.color;
  ctx.globalAlpha = 0.92;
  ctx.fill(p);
  // a lighter inner print gives the rubber-stamp texture
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.translate(50, 50);
  ctx.scale(0.62, 0.62);
  ctx.translate(-50, -50);
  ctx.fill(p);
  ctx.restore();
}

/** Draw part of a line stroke, from point index `from` (inclusive) to the end. */
export function drawLine(ctx: CanvasRenderingContext2D, s: LineStroke, res: number, from = 0): void {
  const pts = s.points;
  const n = pts.length / 2;
  if (n === 0) return;
  const start = Math.max(0, from - 1);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
  }
  const w = s.size * res;
  const X = (i: number) => pts[i * 2]! * res;
  const Y = (i: number) => pts[i * 2 + 1]! * res;
  if (s.tool === 'crayon') {
    // Waxy crayon: each segment is drawn separately with a few thin, jittered
    // passes (seeded per point) so live drawing and replays look identical.
    ctx.globalAlpha = 0.4;
    const first = Math.max(1, from);
    if (n === 1 && from === 0) {
      ctx.beginPath();
      ctx.arc(X(0), Y(0), w * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = first; i < n; i++) {
      for (let pass = 0; pass < 3; pass++) {
        const r = mulberry32(s.seed + i * 7 + pass * 1013);
        const j = w * 0.3;
        ctx.lineWidth = w * (0.42 + pass * 0.08);
        ctx.beginPath();
        ctx.moveTo(X(i - 1) + (r() - 0.5) * j, Y(i - 1) + (r() - 0.5) * j);
        ctx.lineTo(X(i) + (r() - 0.5) * j, Y(i) + (r() - 0.5) * j);
        ctx.stroke();
      }
    }
    // speckles of paper showing through
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.4;
    for (let i = first; i < n; i++) {
      const r = mulberry32(s.seed * 3 + i);
      for (let k = 0; k < 2; k++) ctx.fillRect(X(i) + (r() - 0.5) * w, Y(i) + (r() - 0.5) * w, 1.6 * res, 1.6 * res);
    }
  } else {
    ctx.globalAlpha = 1;
    ctx.lineWidth = w;
    if (n === 1) {
      ctx.beginPath();
      ctx.arc(X(0), Y(0), w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(X(start), Y(start));
      for (let i = start + 1; i < n; i++) ctx.lineTo(X(i), Y(i));
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, res: number): void {
  if (s.tool === 'stamp') drawStamp(ctx, s, res);
  else drawLine(ctx, s, res);
}

export function renderAll(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], res: number): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const s of strokes) drawStroke(ctx, s, res);
}

/** Append a point if it moved far enough; returns true if added. */
export function addPoint(s: LineStroke, x: number, y: number, minDist = 2.5): boolean {
  const n = s.points.length;
  if (n >= 2) {
    const dx = x - s.points[n - 2]!, dy = y - s.points[n - 1]!;
    if (dx * dx + dy * dy < minDist * minDist) return false;
  }
  s.points.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  return true;
}

export function countPoints(strokes: readonly Stroke[]): number {
  let n = 0;
  for (const s of strokes) n += s.tool === 'stamp' ? 1 : s.points.length / 2;
  return n;
}
