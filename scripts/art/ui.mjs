import { P, darken, fmt as f } from './lib.mjs';

const S = 72;
const icon = (key, draw) => ({ key: `icon_${key}`, dir: 'ui', w: S, h: S, draw });
const arrowHead = (c, x, y, dir) => c.ink(`M${x} ${y} l${dir * 10} -10 M${x} ${y} l${dir * 10} 10`, { w: 5 });

export const assets = [
  icon('home', (c) => c.paint(c.rect(18, 34, 36, 28, 5), P.sun, { sw: 3.4 }) + c.paint(c.poly([[10, 38], [36, 12], [62, 38]], { r: 6 }), P.coral, { sw: 3.4 }) + c.paint(c.rect(31, 44, 11, 18, 4, 0.3), P.woodDeep, { sw: 2.6, texture: false })),
  icon('toybox', (c) => c.paint(c.rect(12, 32, 48, 30, 7), P.coral, { sw: 3.4 }) + c.paint(c.blob(26, 26, 9, 9), P.sun, { sw: 2.8, texture: false }) + c.paint(c.star(44, 24, 11, 5), P.sky, { sw: 2.8, texture: false }) + c.paint(c.rect(8, 30, 56, 10, 5, 0.3), darken(P.coral, 0.1), { sw: 3, texture: false }) + c.ink('M30 50 h12', { w: 3.4 })),
  icon('undo', (c) => c.ink('M22 30 H44 Q58 30 58 44 Q58 58 44 58 H30', { w: 6, color: P.ink }) + c.ink('M22 30 H44 Q58 30 58 44 Q58 58 44 58 H30', { w: 3, color: P.sky, opacity: 1 }) + arrowHead(c, 18, 30, 1)),
  icon('redo', (c) => c.ink('M50 30 H28 Q14 30 14 44 Q14 58 28 58 H42', { w: 6, color: P.ink }) + c.ink('M50 30 H28 Q14 30 14 44 Q14 58 28 58 H42', { w: 3, color: P.sky, opacity: 1 }) + arrowHead(c, 54, 30, -1)),
  icon('save', (c) => c.paint(c.rect(12, 14, 48, 46, 8), P.lavender, { sw: 3.4 }) + c.paint(c.heart(36, 37, 14), P.coral, { sw: 2.8, texture: false }) + c.ink('M20 14 v46', { w: 2.4, opacity: 0.5 })),
  icon('clear', (c) => c.paint(c.poly([[18, 52], [44, 20], [58, 32], [32, 62]], { r: 6 }), P.pink, { sw: 3.4 }) + c.paint(c.poly([[18, 52], [30, 38], [44, 50], [32, 62]], { r: 5 }), P.white, { sw: 3, texture: false }) + c.sparkle(56, 56, 6, P.sunDeep) + c.sparkle(16, 22, 5, P.sunDeep)),
  icon('sound', (c) => c.paint(c.poly([[12, 28], [24, 28], [38, 14], [38, 58], [24, 44], [12, 44]], { r: 4 }), P.sun, { sw: 3.4 }) + c.ink('M46 26 q8 10 0 20 M52 18 q14 18 0 36', { w: 4 })),
  icon('sound_off', (c) => c.paint(c.poly([[12, 28], [24, 28], [38, 14], [38, 58], [24, 44], [12, 44]], { r: 4 }), P.stone, { sw: 3.4 }) + c.ink('M46 28 l14 16 M60 28 l-14 16', { w: 4.4 })),
  icon('music', (c) => c.paint(c.blob(22, 52, 9, 7), P.lavDeep, { sw: 3, texture: false }) + c.paint(c.blob(48, 46, 9, 7), P.lavDeep, { sw: 3, texture: false }) + c.ink('M30 50 V18 L56 12 V44', { w: 4.4 }) + c.ink('M30 26 L56 20', { w: 4.4 })),
  icon('settings', (c) => {
    const v = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 22 : 28; v.push([36 + Math.cos(a) * r, 36 + Math.sin(a) * r]); }
    return c.paint(c.poly(v, { r: 3, j: 0.2 }), P.teal, { sw: 3.2 }) + c.paint(c.blob(36, 36, 9, 9), P.cream, { sw: 3, texture: false });
  }),
  icon('star', (c) => c.paint(c.star(36, 38, 28, 13), P.sun, { sw: 3.4 }) + c.face(36, 38, 0.6, { cheeks: false })),
  icon('star_empty', (c) => c.paint(c.star(36, 38, 28, 13), '#EDE5D3', { sw: 3, strokeOpacity: 0.5, texture: false })),
  icon('export', (c) => c.paint(c.rect(10, 14, 52, 42, 7), P.white, { sw: 3.4 }) + c.paint(c.poly([[16, 50], [30, 32], [40, 44], [46, 38], [56, 50]], { r: 3 }), P.leaf, { sw: 2.6, texture: false }) + c.paint(c.blob(48, 24, 5, 5), P.sun, { sw: 2.4, texture: false }) + c.ink('M36 46 v20 M28 58 l8 8 8 -8', { w: 4.4, color: P.coralDeep })),
  icon('check', (c) => c.ink('M14 38 L30 54 L60 18', { w: 9, color: P.ink }) + c.ink('M14 38 L30 54 L60 18', { w: 5, color: P.leaf, opacity: 1 })),
  icon('cross', (c) => c.ink('M18 18 L54 54 M54 18 L18 54', { w: 9, color: P.ink }) + c.ink('M18 18 L54 54 M54 18 L18 54', { w: 5, color: P.coral, opacity: 1 })),
  icon('pencil', (c) => c.paint(c.poly([[16, 56], [20, 44], [50, 14], [58, 22], [28, 52]], { r: 3 }), P.sun, { sw: 3.2 }) + c.ink('M16 56 l12 -4', { w: 3 })),
  icon('trash', (c) => c.paint(c.poly([[18, 24], [54, 24], [50, 62], [22, 62]], { r: 5 }), P.stone, { sw: 3.4 }) + c.paint(c.rect(12, 16, 48, 10, 4), darken(P.stone, 0.1), { sw: 3, texture: false }) + c.ink('M30 34 v20 M42 34 v20', { w: 3 })),
  icon('open', (c) => c.paint(c.poly([[10, 22], [28, 22], [34, 28], [62, 28], [62, 58], [10, 58]], { r: 5 }), P.sun, { sw: 3.4 }) + c.ink('M36 50 V36 M29 43 l7 -7 7 7', { w: 4, color: P.woodDark })),
  icon('plus', (c) => c.ink('M36 14 V58 M14 36 H58', { w: 9, color: P.ink }) + c.ink('M36 14 V58 M14 36 H58', { w: 5, color: P.leaf, opacity: 1 })),
  icon('brush', (c) => c.paint(c.poly([[44, 12], [56, 24], [34, 46], [26, 38]], { r: 4 }), P.woodDeep, { sw: 3 }) + c.paint(c.poly([[26, 38], [34, 46], [24, 58], [10, 62], [14, 48]], { r: 5 }), P.coral, { sw: 3 })),
  icon('crayon', (c) => c.paint(c.poly([[18, 58], [14, 46], [44, 16], [56, 28], [26, 58]], { r: 4 }), P.sky, { sw: 3 }) + c.paint(c.poly([[44, 16], [52, 8], [62, 18], [56, 28]], { r: 3 }), darken(P.sky, 0.15), { sw: 3, texture: false }) + c.ink('M24 40 l10 10', { w: 2.6, color: P.white })),
  icon('eraser', (c) => c.paint(c.poly([[10, 46], [36, 18], [62, 38], [36, 60]], { r: 6 }), P.pink, { sw: 3.2 }) + c.paint(c.poly([[10, 46], [22, 34], [46, 52], [36, 60]], { r: 5 }), P.white, { sw: 3, texture: false })),
  icon('stamp', (c) => c.paint(c.rect(28, 10, 16, 24, 6), P.woodDeep, { sw: 3 }) + c.paint(c.rect(14, 32, 44, 14, 5), P.lavender, { sw: 3 }) + c.paint(c.star(36, 58, 12, 5), P.coral, { sw: 2.6, texture: false })),
  icon('hand', (c) => c.paint(c.poly([[22, 60], [14, 38], [22, 34], [26, 42], [26, 16], [34, 16], [34, 36], [36, 12], [44, 12], [44, 36], [46, 16], [54, 18], [54, 46], [46, 62]], { r: 4, j: 0.3 }), P.peach, { sw: 3 })),
  icon('bucket', (c) => c.paint(c.poly([[14, 26], [58, 26], [52, 62], [20, 62]], { r: 6 }), P.sky, { sw: 3.2 }) + c.paint(c.blob(36, 26, 22, 6), P.coral, { sw: 3, texture: false }) + c.ink('M14 26 Q36 0 58 26', { w: 3 })),
  icon('sticker', (c) => c.paint(c.poly([[12, 12], [60, 12], [60, 44], [44, 60], [12, 60]], { r: 6 }), P.sun, { sw: 3.2 }) + c.paint(c.poly([[60, 44], [44, 44], [44, 60]], { r: 3 }), P.white, { sw: 3, texture: false }) + c.face(34, 34, 0.7, {})),
  icon('motion', (c) => c.paint(c.blob(32, 40, 18, 16), P.coral, { sw: 3 }) + c.ink('M32 40 m-3 0 a3 3 0 1 1 6 0 a8 8 0 1 1 -14 2', { w: 2.4 }) + c.paint(c.poly([[10, 56], [56, 56], [64, 46], [58, 40], [52, 50]], { r: 4 }), '#E8D7B5', { sw: 3, texture: false })),
  icon('back', (c) => c.ink('M48 14 L24 36 L48 58', { w: 9, color: P.ink }) + c.ink('M48 14 L24 36 L48 58', { w: 5, color: P.sky, opacity: 1 })),
  {
    key: 'app_icon', dir: 'ui', w: 512, h: 512,
    draw: (c) => {
      let s = `<rect width="512" height="512" rx="110" fill="${P.sky}"/>`;
      s += c.flat(c.blob(256, 470, 360, 150), P.grass);
      const rays = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        rays.push(c.paint(c.poly([[256 + Math.cos(a - 0.16) * 120, 230 + Math.sin(a - 0.16) * 120], [256 + Math.cos(a) * 196, 230 + Math.sin(a) * 196], [256 + Math.cos(a + 0.16) * 120, 230 + Math.sin(a + 0.16) * 120]], { r: 10 }), i % 2 ? P.sun : P.sunDeep, { sw: 6, texture: false }));
      }
      s += rays.join('');
      s += c.paint(c.blob(256, 230, 124, 124, { n: 16, j: 0.02 }), P.sun, { shade: P.sunDeep, sw: 7 });
      s += c.face(256, 236, 3.4, {});
      return s;
    },
  },
];

export { f };
