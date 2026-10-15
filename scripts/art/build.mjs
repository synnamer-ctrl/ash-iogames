import { P, darken, lighten, fmt as f } from './lib.mjs';

function woodGrain(c, x, y, w, h) {
  let s = '';
  const rows = Math.max(2, Math.floor(h / 14));
  for (let i = 1; i < rows; i++) {
    const yy = y + (i / rows) * h + c.jit(2);
    s += c.ink(c.line([[x + 6, yy], [x + w - 6, yy + c.jit(3)]], { j: 1.4 }), { w: 1.4, color: P.woodDark, opacity: 0.28 });
  }
  return s;
}

function block(c, w, h, color, { painted = true, pattern = null } = {}) {
  const s = c.rect(3, 3, w - 6, h - 6, Math.min(12, w * 0.15));
  let inner = woodGrain(c, 3, 3, w - 6, h - 6);
  if (pattern === 'dots') for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]]) inner += `<circle cx="${f(w * x)}" cy="${f(h * y)}" r="${f(Math.min(w, h) * 0.07)}" fill="${P.white}" opacity=".8"/>`;
  if (pattern === 'star') inner += c.paint(c.star(w / 2, h / 2 + 2, Math.min(w, h) * 0.28, Math.min(w, h) * 0.13), P.white, { sw: 2, texture: false, highlight: false, strokeOpacity: 0.4 });
  if (pattern === 'heart') inner += c.paint(c.heart(w / 2, h / 2, Math.min(w, h) * 0.26), P.white, { sw: 2, texture: false, highlight: false, strokeOpacity: 0.4 });
  if (pattern === 'moon') inner += c.flat(c.blob(w / 2, h / 2, w * 0.22, h * 0.22), P.white, 0.85) + c.flat(c.blob(w / 2 + w * 0.1, h / 2 - h * 0.06, w * 0.18, h * 0.18), color);
  return c.paint(s, painted ? color : P.wood, { shade: darken(painted ? color : P.wood, 0.2), inner });
}

function ball(c, s, base, stripes = null) {
  const r = s / 2;
  const b = c.blob(r, r, r - 3, r - 3, { n: 16, j: 0.012 });
  let inner = '';
  if (stripes) {
    stripes.forEach((col, i) => {
      const a0 = (i / stripes.length) * Math.PI * 2, a1 = ((i + 1) / stripes.length) * Math.PI * 2;
      inner += `<path d="M${r} ${r} L${f(r + Math.cos(a0) * r * 1.2)} ${f(r + Math.sin(a0) * r * 1.2)} A${r * 1.2} ${r * 1.2} 0 0 1 ${f(r + Math.cos(a1) * r * 1.2)} ${f(r + Math.sin(a1) * r * 1.2)} Z" fill="${col}"/>`;
    });
    inner += `<circle cx="${r}" cy="${r}" r="${r * 0.18}" fill="${P.white}" stroke="${P.ink}" stroke-width="2"/>`;
  } else {
    inner += c.ink(`M${f(r * 0.3)} ${f(r * 0.6)} Q${r} ${f(r * 1.1)} ${f(r * 1.7)} ${f(r * 0.6)}`, { w: 2.6, color: P.white, opacity: 0.85 });
    inner += c.ink(`M${f(r * 0.3)} ${f(r * 1.4)} Q${r} ${f(r * 0.9)} ${f(r * 1.7)} ${f(r * 1.4)}`, { w: 2.6, color: P.white, opacity: 0.85 });
  }
  return c.paint(b, base, { inner, hlOpacity: 0.4 });
}

function toyWheel(c, s) {
  const r = s / 2;
  return c.paint(c.blob(r, r, r - 2, r - 2, { n: 14, j: 0.01 }), '#4F5B66', { shade: '#3D4750', highlight: false, sw: 2.4 }) +
    c.paint(c.blob(r, r, r * 0.5, r * 0.5, { n: 10, j: 0.01 }), P.sun, { sw: 2, texture: false }) +
    `<circle cx="${r}" cy="${r}" r="${f(r * 0.16)}" fill="${P.coralDeep}" stroke="${P.ink}" stroke-width="1.6"/>` +
    c.ink(`M${f(r * 0.6)} ${r} h${f(r * 0.8)}`, { w: 1.6, color: P.woodDark, opacity: 0.6 });
}

export const assets = [
  { key: 'block_red', dir: 'toys', w: 80, h: 80, draw: (c) => block(c, 80, 80, P.coral, { pattern: 'star' }) },
  { key: 'block_blue', dir: 'toys', w: 80, h: 80, draw: (c) => block(c, 80, 80, P.sky, { pattern: 'dots' }) },
  { key: 'block_yellow', dir: 'toys', w: 80, h: 80, draw: (c) => block(c, 80, 80, P.sun, { pattern: 'heart' }) },
  { key: 'block_green', dir: 'toys', w: 80, h: 80, draw: (c) => block(c, 80, 80, P.leaf, { pattern: 'moon' }) },
  { key: 'block_long', dir: 'toys', w: 240, h: 40, draw: (c) => block(c, 240, 40, P.wood, { painted: false }) },
  { key: 'block_pillar', dir: 'toys', w: 44, h: 140, draw: (c) => block(c, 44, 140, P.lavender, {}) },
  {
    key: 'block_tri', dir: 'toys', w: 104, h: 92,
    draw: (c) => c.paint(c.poly([[4, 88], [52, 4], [100, 88]], { r: 9 }), P.teal, { shade: P.tealDeep, inner: woodGrain(c, 20, 40, 64, 46) }),
  },
  { key: 'ball_red', dir: 'toys', w: 64, h: 64, draw: (c) => ball(c, 64, P.coral) },
  { key: 'ball_beach', dir: 'toys', w: 96, h: 96, draw: (c) => ball(c, 96, P.white, [P.coral, P.white, P.sun, P.white, P.sky, P.white]) },
  { key: 'ball_marble', dir: 'toys', w: 40, h: 40, draw: (c) => ball(c, 40, P.lavender) },
  {
    key: 'ramp', dir: 'toys', w: 300, h: 150,
    draw: (c) => {
      const s = c.poly([[4, 146], [4, 6], [296, 146]], { r: 8, rr: [6, 10, 6], j: 0.8 });
      let inner = woodGrain(c, 4, 40, 200, 106);
      inner += c.ink('M14 24 L270 140', { w: 6, color: P.white, opacity: 0.5 });
      return c.paint(s, P.sun, { shade: P.sunDeep, inner });
    },
  },
  {
    key: 'platform', dir: 'toys', w: 280, h: 36,
    draw: (c) => c.paint(c.rect(3, 3, 274, 30, 10), P.woodDeep, { shade: P.woodDark, inner: woodGrain(c, 3, 3, 274, 30) }) + `<circle cx="20" cy="18" r="4" fill="${P.stone}" stroke="${P.ink}" stroke-width="1.6"/><circle cx="260" cy="18" r="4" fill="${P.stone}" stroke="${P.ink}" stroke-width="1.6"/>`,
  },
  {
    key: 'toy_car', dir: 'toys', w: 160, h: 84, anchors: { wheelA: [40, 66], wheelB: [122, 66] },
    draw: (c) => {
      let s = c.paint(c.poly([[42, 36], [56, 8], [110, 8], [124, 36]], { r: 10 }), P.lavender, { shade: P.lavDeep });
      s += c.paint(c.poly([[56, 34], [64, 16], [80, 16], [80, 34]], { r: 4 }), '#CFEFFA', { sw: 2.2, texture: false });
      s += c.paint(c.poly([[88, 34], [88, 16], [104, 16], [112, 34]], { r: 4 }), '#CFEFFA', { sw: 2.2, texture: false });
      s += c.paint(c.rect(6, 32, 148, 38, 16), P.coral, { shade: P.coralDeep });
      s += c.paint(c.blob(146, 46, 6, 5), P.sun, { sw: 2, texture: false });
      s += c.face(84, 50, 0.8, {});
      return s;
    },
  },
  { key: 'wheel_toy', dir: 'toys', w: 40, h: 40, draw: (c) => toyWheel(c, 40) },
  { key: 'wheel_big', dir: 'toys', w: 72, h: 72, draw: (c) => toyWheel(c, 72) },
  {
    key: 'seesaw_plank', dir: 'toys', w: 380, h: 28,
    draw: (c) => c.paint(c.rect(3, 3, 374, 22, 9), P.coral, { shade: P.coralDeep, inner: woodGrain(c, 3, 3, 374, 22) }) + `<circle cx="190" cy="14" r="6" fill="${P.sun}" stroke="${P.ink}" stroke-width="2"/>`,
  },
  {
    key: 'seesaw_base', dir: 'toys', w: 96, h: 76,
    draw: (c) => c.groundShadow(48, 70, 40, 5) + c.paint(c.poly([[8, 70], [48, 6], [88, 70]], { r: 10 }), P.sky, { shade: P.skyDeep }),
  },
  {
    key: 'pinwheel', dir: 'toys', w: 150, h: 150,
    draw: (c) => {
      let s = '';
      const cols = [P.coral, P.sun, P.sky, P.leaf];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const p = (r, da) => [75 + Math.cos(a + da) * r, 75 + Math.sin(a + da) * r];
        s += c.paint(c.poly([p(6, 0), p(70, -0.15), p(52, 0.55)], { r: 6, j: 0.4 }), cols[i], { sw: 2.6 });
      }
      s += `<circle cx="75" cy="75" r="9" fill="${P.white}" stroke="${P.ink}" stroke-width="2.4"/>`;
      return s;
    },
  },
  {
    key: 'pinwheel_stick', dir: 'toys', w: 20, h: 200,
    draw: (c) => c.paint(c.rect(5, 4, 10, 192, 5, 0.3), P.wood, { shade: P.woodDeep, sw: 2.4, texture: false }),
  },
  {
    key: 'domino', dir: 'toys', w: 28, h: 96,
    draw: (c) => {
      let s = c.paint(c.rect(2, 2, 24, 92, 6), P.cream, { shade: P.paperDeep });
      s += c.ink('M6 48 h16', { w: 2 });
      for (const [x, y] of [[14, 20], [9, 30], [19, 30], [14, 68], [9, 78], [19, 60]]) s += `<circle cx="${x}" cy="${y}" r="2.8" fill="${P.ink}"/>`;
      return s;
    },
  },
  {
    key: 'bell', dir: 'toys', w: 100, h: 120,
    draw: (c) => {
      let s = c.groundShadow(50, 114, 40, 5);
      s += c.paint(c.rect(10, 100, 80, 14, 6), P.woodDeep, { sw: 2.4, texture: false });
      s += c.ink('M18 102 L18 20 Q50 0 82 20 L82 102', { w: 7, color: P.ink, opacity: 0.9 }) + c.ink('M18 102 L18 20 Q50 0 82 20 L82 102', { w: 4, color: P.wood, opacity: 1 });
      s += c.paint(c.poly([[26, 76], [32, 36], [50, 22], [68, 36], [74, 76]], { r: 12, rr: [4, 16, 18, 16, 4] }), P.sun, { shade: P.sunDeep });
      s += c.paint(c.rect(22, 72, 56, 10, 5, 0.3), P.sunDeep, { sw: 2.2, texture: false });
      s += `<circle cx="50" cy="88" r="6" fill="${P.coralDeep}" stroke="${P.ink}" stroke-width="2"/>`;
      return s;
    },
  },
  {
    key: 'spring_pad', dir: 'toys', w: 130, h: 64,
    draw: (c) => {
      let s = c.groundShadow(65, 58, 56, 5);
      s += c.paint(c.rect(10, 48, 110, 12, 5), P.inkSoft, { sw: 2.2, texture: false });
      s += c.ink('M30 48 l70 -8 l-70 -8 l70 -8 l-70 -8', { w: 3.4, color: P.stoneDeep, opacity: 1 });
      s += c.paint(c.rect(6, 6, 118, 16, 8), P.coral, { shade: P.coralDeep });
      return s;
    },
  },
  {
    key: 'chute', dir: 'toys', w: 140, h: 180,
    draw: (c) => {
      let s = c.paint(c.poly([[6, 8], [134, 8], [92, 80], [92, 168], [48, 168], [48, 80]], { r: 12, rr: [8, 8, 18, 6, 6, 18] }), P.lavender, { shade: P.lavDeep });
      s += c.paint(c.blob(70, 16, 58, 9, { n: 14, j: 0.02 }), P.lavDeep, { sw: 2.4, texture: false, highlight: false });
      s += c.paint(c.rect(42, 150, 56, 20, 8), P.sun, { sw: 2.4, texture: false });
      s += c.face(70, 100, 0.9, {});
      return s;
    },
  },
];

export { lighten };
