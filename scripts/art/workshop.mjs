import { P, darken, lighten, fmt as f } from './lib.mjs';

/** Die-cut sticker: art with a thick white border and soft drop shadow. */
function sticker(c, w, h, artShape, fill, extra = '') {
  // thick white die-cut border = the same outline stroked wide in white
  const shadow = `<g transform="translate(3 5)" opacity=".18"><path d="${artShape.d}" fill="${P.ink}" stroke="${P.ink}" stroke-width="16" stroke-linejoin="round"/></g>`;
  const border = `<path d="${artShape.d}" fill="${P.white}" stroke="${P.white}" stroke-width="16" stroke-linejoin="round"/>` +
    `<path d="${artShape.d}" fill="none" stroke="#D9D0BE" stroke-width="17.5" stroke-linejoin="round" opacity=".55"/>` +
    `<path d="${artShape.d}" fill="none" stroke="${P.white}" stroke-width="15" stroke-linejoin="round"/>`;
  return shadow + border + c.paint(artShape, fill, { sw: 3 }) + extra;
}

function cutShape(c, s) {
  // white paper shapes that the game tints to any color
  return `<g transform="translate(2 4)" opacity=".16"><path d="${s.d}" fill="${P.ink}"/></g>` + c.paint(s, '#FFFFFF', { shade: '#E4E0D8', pencilColor: '#C9C2B4', pencilOpacity: 0.25 });
}

export const assets = [
  // ---- stickers ----
  { key: 'sticker_star', dir: 'toys', w: 120, h: 120, draw: (c) => sticker(c, 120, 120, c.star(60, 63, 48, 22, 5), P.sun, c.face(60, 64, 0.9, {})) },
  { key: 'sticker_heart', dir: 'toys', w: 120, h: 112, draw: (c) => sticker(c, 120, 112, c.heart(60, 54, 46), P.coral, c.face(60, 52, 0.9, {})) },
  {
    key: 'sticker_rainbow', dir: 'toys', w: 140, h: 100,
    draw: (c) => {
      const outer = c.poly([[14, 84], [14, 60], [40, 20], [70, 12], [100, 20], [126, 60], [126, 84], [102, 84], [100, 62], [86, 42], [70, 38], [54, 42], [40, 62], [38, 84]], { r: 10, j: 0.5 });
      const bands = [P.coral, P.sun, P.leaf, P.sky].map((col, i) => `<path d="M${22 + i * 6} 84 A${48 - i * 6} ${50 - i * 6} 0 0 1 ${118 - i * 6} 84" fill="none" stroke="${col}" stroke-width="7"/>`).join('');
      const id = c.uid('rb');
      return sticker(c, 140, 100, outer, P.white, `<clipPath id="${id}"><path d="${outer.d}"/></clipPath><g clip-path="url(#${id})">${bands}</g>` + c.ink(outer, { w: 3 }));
    },
  },
  {
    key: 'sticker_cat', dir: 'toys', w: 120, h: 116,
    draw: (c) => {
      const s = c.poly([[18, 40], [22, 6], [46, 26], [74, 26], [98, 6], [102, 40], [104, 80], [60, 108], [16, 80]], { r: 12, rr: [12, 6, 10, 10, 6, 12, 22, 30, 22], j: 0.6 });
      return sticker(c, 120, 116, s, '#F9B97A', c.face(60, 62, 1.2, {}) + c.ink('M20 70 l18 2 M100 70 l-18 2', { w: 2 }));
    },
  },
  {
    key: 'sticker_sun', dir: 'toys', w: 124, h: 124,
    draw: (c) => {
      const v = [];
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; const r = i % 2 ? 40 : 52; v.push([62 + Math.cos(a) * r, 62 + Math.sin(a) * r]); }
      return sticker(c, 124, 124, c.poly(v, { r: 5, j: 0.3 }), P.sun, c.paint(c.blob(62, 62, 30, 30), '#FFE38F', { sw: 2.4 }) + c.face(62, 62, 1, { eyes: 'happy' }));
    },
  },
  {
    key: 'sticker_flower', dir: 'toys', w: 120, h: 120,
    draw: (c) => {
      const v = [];
      for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; const r = 38 + 12 * Math.cos(a * 6); v.push([60 + Math.cos(a) * r, 60 + Math.sin(a) * r]); }
      return sticker(c, 120, 120, c.poly(v, { r: 2, j: 0.2, step: 60 }), P.lavender, c.paint(c.blob(60, 60, 16, 16), P.sun, { sw: 2.4 }));
    },
  },
  {
    key: 'sticker_rocket', dir: 'toys', w: 100, h: 140,
    draw: (c) => {
      const s = c.poly([[50, 6], [74, 40], [76, 96], [92, 118], [64, 112], [36, 112], [8, 118], [24, 96], [26, 40]], { r: 10, rr: [14, 12, 6, 6, 6, 6, 6, 6, 12], j: 0.5 });
      return sticker(c, 100, 140, s, P.white, c.paint(c.blob(50, 56, 13, 13), P.sky, { sw: 2.6 }) + c.paint(c.poly([[34, 112], [66, 112], [50, 134]], { r: 6 }), P.orange, { sw: 2.4, texture: false }) + c.ink('M30 86 h40', { w: 2.4, color: P.coral }));
    },
  },
  {
    key: 'sticker_whale', dir: 'toys', w: 150, h: 104,
    draw: (c) => {
      const s = c.poly([[10, 60], [30, 26], [80, 18], [120, 34], [128, 50], [146, 30], [144, 76], [126, 66], [112, 86], [60, 92], [22, 82]], { r: 14, rr: [20, 26, 30, 18, 6, 8, 8, 6, 18, 22, 18], j: 0.6 });
      return sticker(c, 150, 104, s, P.skyDeep, c.paint(c.blob(60, 70, 34, 14), P.skyLight, { stroke: false, texture: false, highlight: false }) + `<ellipse cx="44" cy="48" rx="3.6" ry="4.4" fill="${P.ink}"/>` + `<ellipse cx="48" cy="58" rx="5" ry="3" fill="${P.coral}" opacity=".5"/>` + c.ink('M70 16 q-4 -10 -12 -12 M70 16 q4 -10 12 -12', { w: 2.6, color: P.skyDeep }));
    },
  },
  {
    key: 'sticker_googly', dir: 'toys', w: 130, h: 80, anchors: { pupilA: [38, 44], pupilB: [92, 44] },
    draw: (c) => {
      const s = c.poly([[10, 40], [20, 12], [65, 8], [110, 12], [120, 40], [110, 70], [65, 74], [20, 70]], { r: 24, j: 0.4 });
      return sticker(c, 130, 80, s, P.white, c.ink(c.blob(38, 40, 25, 25, { n: 14, j: 0.01 }), { w: 3 }) + c.ink(c.blob(92, 40, 25, 25, { n: 14, j: 0.01 }), { w: 3 }));
    },
  },
  { key: 'googly_pupil', dir: 'toys', w: 24, h: 24, draw: () => `<circle cx="12" cy="12" r="10.5" fill="${P.ink}"/><circle cx="15.5" cy="8.5" r="3" fill="#fff"/>` },
  // ---- cut paper shapes (white; tinted in game) ----
  { key: 'shape_circle', dir: 'toys', w: 116, h: 116, draw: (c) => cutShape(c, c.blob(56, 56, 50, 50, { n: 14, j: 0.02 })) },
  { key: 'shape_triangle', dir: 'toys', w: 124, h: 112, draw: (c) => cutShape(c, c.poly([[8, 102], [60, 6], [114, 102]], { r: 10 })) },
  { key: 'shape_square', dir: 'toys', w: 112, h: 112, draw: (c) => cutShape(c, c.rect(6, 6, 98, 98, 10)) },
  { key: 'shape_moon', dir: 'toys', w: 104, h: 116, draw: (c) => cutShape(c, c.poly([[60, 6], [26, 22], [10, 58], [28, 96], [64, 110], [96, 98], [62, 86], [42, 58], [50, 28], [84, 12]], { r: 12, rr: [8, 20, 26, 20, 10, 8, 14, 18, 14, 8], j: 0.4 })) },
  {
    key: 'tape', dir: 'toys', w: 96, h: 36,
    draw: (c) => {
      const s = c.poly([[4, 6], [92, 2], [94, 30], [6, 34]], { r: 3, j: 1.2, step: 10 });
      return c.paint(s, '#F7D9E3', { stroke: false, shade: '#EFC6D3', highlight: false, pencilOpacity: 0.35 }) + `<g opacity=".5">${[14, 34, 54, 74].map((x) => c.ink(`M${x} 8 l6 22`, { w: 3, color: P.white })).join('')}</g>`;
    },
  },
  {
    key: 'jar_brushes', dir: 'toys', w: 150, h: 220,
    draw: (c) => {
      let s = c.groundShadow(75, 212, 52, 6);
      const tools = [
        [44, P.coral, -12, 'brush'], [62, P.sun, -4, 'pencil'], [80, P.lavDeep, 6, 'brush'], [98, P.leafDeep, 14, 'pencil'], [72, P.skyDeep, 0, 'crayon'],
      ];
      for (const [x, col, rot, kind] of tools) {
        let t = c.paint(c.rect(-6, 0, 12, 130, 5, 0.3), col, { sw: 2.4, texture: false });
        if (kind === 'brush') t += c.paint(c.rect(-6, -10, 12, 14, 3, 0.3), '#C9CFD6', { sw: 2.2, texture: false }) + c.paint(c.poly([[-7, -10], [7, -10], [2, -38], [-2, -38]], { r: 5 }), P.woodDark, { sw: 2.2, texture: false });
        else if (kind === 'pencil') t += c.paint(c.poly([[-6, 0], [6, 0], [0, -24]], { r: 2 }), P.wood, { sw: 2.2, texture: false }) + c.flat(c.poly([[-2, -14], [2, -14], [0, -24]], { r: 1 }), col);
        else t += c.paint(c.rect(-7, -20, 14, 24, 6, 0.3), col, { sw: 2.2, texture: false });
        s += `<g transform="translate(${x} 70) rotate(${rot})">${t}</g>`;
      }
      s += c.paint(c.poly([[22, 96], [128, 96], [122, 206], [28, 206]], { r: 14 }), '#D6F0F5', { shade: '#B4DCE6', strokeOpacity: 0.8 });
      s += `<g opacity=".55">${c.paint(c.rect(28, 140, 94, 30, 6), P.pink, { stroke: false, texture: false })}</g>`;
      s += c.ink('M36 110 q-4 40 2 84', { w: 4, color: P.white, opacity: 0.8 });
      return s;
    },
  },
  {
    key: 'palette', dir: 'toys', w: 180, h: 124,
    draw: (c) => {
      let s = c.groundShadow(90, 116, 76, 7);
      const pal = c.poly([[10, 62], [30, 16], [96, 6], [160, 26], [172, 72], [140, 112], [70, 112], [86, 86], [60, 76], [24, 96]], { r: 18, rr: [18, 26, 30, 26, 24, 22, 18, 12, 12, 16], j: 0.8 });
      s += c.paint(pal, P.wood, { shade: P.woodDeep });
      for (const [x, y, col] of [[48, 40, P.coral], [86, 28, P.sun], [124, 38, P.leaf], [146, 70, P.sky], [118, 92, P.lavender]]) s += c.paint(c.blob(x, y, 13, 11, { j: 0.1 }), col, { sw: 2.2 });
      return s;
    },
  },
];

export { lighten, darken, f };
