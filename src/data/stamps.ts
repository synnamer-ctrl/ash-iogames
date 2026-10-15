import type { StampShape } from '../types/game';

const circle = (cx: number, cy: number, r: number) => `M${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} Z`;

function flower(): string {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    d += circle(+(50 + Math.cos(a) * 26).toFixed(1), +(50 + Math.sin(a) * 26).toFixed(1), 18);
  }
  return d + circle(50, 50, 16);
}

/** Stamp shapes as SVG path data in a 100×100 box centred on (50, 50). Used by both the canvas painter (Path2D) and the UI. */
export const STAMP_PATHS: Record<StampShape, string> = {
  star: 'M50 6 L61 37 L94 37 L67 57 L77 90 L50 70 L23 90 L33 57 L6 37 L39 37 Z',
  heart: 'M50 88 C20 66 6 50 6 32 C6 17 18 8 30 8 C40 8 46 14 50 22 C54 14 60 8 70 8 C82 8 94 17 94 32 C94 50 80 66 50 88 Z',
  flower: flower(),
  paw: 'M50 50 C68 50 80 66 78 78 C76 90 64 88 50 88 C36 88 24 90 22 78 C20 66 32 50 50 50 Z ' + ellipse(20, 46, 9, 12) + ellipse(38, 26, 9, 12) + ellipse(62, 26, 9, 12) + ellipse(80, 46, 9, 12),
  circle: circle(50, 50, 42),
  cloud: 'M24 76 C8 76 6 56 20 52 C16 36 36 28 44 38 C48 22 72 22 74 40 C90 36 98 54 86 62 C96 72 86 80 76 76 Z',
};

export const STAMP_SHAPES: readonly StampShape[] = ['star', 'heart', 'flower', 'paw', 'circle', 'cloud'];
