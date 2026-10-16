import { P, LINE, darken, lighten, fmt as f } from './lib.mjs';

const SOIL = '#9B6B4C', SOIL_DEEP = '#7A5038';

function stem(c, x, y0, y1, bend = 0) {
  return c.ink(`M${f(x)} ${f(y0)} Q${f(x + bend)} ${f((y0 + y1) / 2)} ${f(x)} ${f(y1)}`, { w: 7, color: P.ink, opacity: 0.85 }) +
    c.ink(`M${f(x)} ${f(y0)} Q${f(x + bend)} ${f((y0 + y1) / 2)} ${f(x)} ${f(y1)}`, { w: 4.2, color: P.leafDeep, opacity: 1 });
}
function leafShape(c, x, y, dir, size = 1) {
  const s = size;
  return c.paint(c.poly([[x, y], [x + dir * 22 * s, y - 16 * s], [x + dir * 40 * s, y - 8 * s], [x + dir * 18 * s, y + 6 * s]], { r: 8 * s, j: 0.3 }), P.leaf, { sw: 2.2, texture: false, shade: P.leafDeep });
}

function petals(c, cx, cy, n, r, pw, ph, color, center, centerR) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out += c.paint(c.blob(cx + Math.cos(a) * r, cy + Math.sin(a) * r, pw, ph, { n: 9, rot: a, j: 0.05 }), color, { sw: 2, texture: false, highlight: false });
  }
  out += c.paint(c.blob(cx, cy, centerR, centerR, { n: 10, j: 0.04 }), center, { sw: 2.2 });
  return out;
}

function plant(c, w, h, stage, species) {
  const x = w / 2, base = h - 2;
  let out = '';
  if (stage === 'seed') {
    out += c.paint(c.blob(x, base - 8, 14, 9), '#B08060', { sw: 2.2, texture: false });
    out += c.ink(`M${x} ${base - 14} q2 -8 6 -10`, { w: 3, color: P.leafDeep, opacity: 1 });
    return out;
  }
  if (stage === 'sprout') {
    out += stem(c, x, base, base - 44, 4);
    out += leafShape(c, x, base - 40, 1, 0.8) + leafShape(c, x, base - 36, -1, 0.7);
    return out;
  }
  const top = stage === 'bud' ? base - h * 0.78 : base - h * 0.74;
  out += stem(c, x, base, top + 14, 8);
  out += leafShape(c, x + 2, base - h * 0.3, 1, 1.15) + leafShape(c, x, base - h * 0.42, -1, 1.05) + leafShape(c, x + 1, base - h * 0.2, -1, 0.85);
  if (stage === 'bud') {
    const col = species === 'tulip' ? P.coral : species === 'sun' ? P.sun : P.white;
    out += c.paint(c.poly([[x - 14, top + 10], [x, top - 18], [x + 14, top + 10], [x, top + 18]], { r: 9 }), col, { sw: 2.4 });
    out += c.paint(c.poly([[x - 12, top + 8], [x, top + 20], [x + 12, top + 8], [x, top + 24]], { r: 6 }), P.leaf, { sw: 2.2, texture: false });
    return out;
  }
  if (species === 'tulip') {
    out += c.paint(c.poly([[x - 32, top - 12], [x - 16, top + 2], [x, top - 26], [x + 16, top + 2], [x + 32, top - 12], [x + 26, top + 24], [x - 26, top + 24]], { r: 10, j: 0.5 }), P.coral, {});
    out += c.ink(`M${x - 10} ${top + 2} q10 16 20 0`, { w: 2, opacity: 0.5 });
  } else if (species === 'sun') {
    out += petals(c, x, top, 16, 36, 15, 9.5, P.sun, P.woodDeep, 25);
    for (let i = 0; i < 8; i++) out += `<circle cx="${f(x + c.jit(14))}" cy="${f(top + c.jit(14))}" r="2" fill="${P.woodDark}"/>`;
    out += c.face(x, top - 2, 0.9, {});
  } else {
    out += petals(c, x, top, 12, 26, 12, 8, P.white, P.sunDeep, 13);
  }
  return out;
}

function packet(c, w, h, species) {
  const col = species === 'tulip' ? P.pink : species === 'sun' ? '#FFE9A8' : P.mint;
  let out = c.groundShadow(w / 2, h - 4, w * 0.4, 5);
  out += c.paint(c.rect(4, 12, w - 8, h - 18, 6), col, {});
  out += c.paint(c.poly([[4, 18], [w / 2, 4], [w - 4, 18]], { r: 4 }), darken(col, 0.08), { sw: 2.4, texture: false });
  out += c.paint(c.rect(12, 26, w - 24, h - 44, 8), P.cream, { sw: 2.2, texture: false });
  const s = species;
  const cx = w / 2, cy = h * 0.52;
  out += c.ink(`M${cx} ${cy + 18} v-16`, { w: 3, color: P.leafDeep, opacity: 1 });
  if (s === 'tulip') out += c.paint(c.poly([[cx - 12, cy - 12], [cx - 5, cy - 6], [cx, cy - 16], [cx + 5, cy - 6], [cx + 12, cy - 12], [cx + 10, cy + 4], [cx - 10, cy + 4]], { r: 4 }), P.coral, { sw: 2, texture: false });
  else if (s === 'sun') out += petals(c, cx, cy - 4, 10, 11, 6, 3.6, P.sun, P.woodDeep, 7);
  else out += petals(c, cx, cy - 4, 8, 9, 5.5, 3.4, P.white, P.sunDeep, 5);
  for (let i = 0; i < 3; i++) out += `<ellipse cx="${f(w * 0.3 + i * w * 0.2)}" cy="${h - 14}" rx="3" ry="2" fill="${SOIL_DEEP}"/>`;
  return out;
}

function butterfly(c, w, h, wing, spot) {
  let out = '';
  for (const s of [-1, 1]) {
    out += c.paint(c.blob(w / 2 + s * 17, h * 0.36, 15, 16, { n: 10, j: 0.05 }), wing, { sw: 2.4 });
    out += c.paint(c.blob(w / 2 + s * 14, h * 0.7, 11, 11, { n: 9, j: 0.05 }), darken(wing, 0.08), { sw: 2.2, texture: false });
    out += `<circle cx="${f(w / 2 + s * 18)}" cy="${f(h * 0.34)}" r="4.5" fill="${spot}" opacity=".9"/>`;
  }
  out += c.paint(c.rect(w / 2 - 4, h * 0.2, 8, h * 0.66, 4, 0.2), P.ink, { sw: 1.4, texture: false, highlight: false });
  out += c.ink(`M${w / 2 - 2} ${h * 0.2} q-4 -8 -9 -10 M${w / 2 + 2} ${h * 0.2} q4 -8 9 -10`, { w: 1.8 });
  return out;
}

export const assets = [
  {
    key: 'soil', dir: 'nature', w: 150, h: 56,
    draw: (c) => {
      let s = c.groundShadow(75, 48, 68, 7, 0.1);
      s += c.paint(c.blob(75, 34, 66, 18, { n: 14, j: 0.05 }), SOIL, { shade: SOIL_DEEP });
      for (let i = 0; i < 10; i++) s += c.flat(c.blob(30 + c.r() * 90, 26 + c.r() * 16, 3, 2, { n: 6 }), SOIL_DEEP, 0.8);
      return s;
    },
  },
  { key: 'plant_seed', dir: 'nature', w: 44, h: 32, draw: (c) => plant(c, 44, 32, 'seed') },
  { key: 'plant_sprout', dir: 'nature', w: 80, h: 70, draw: (c) => plant(c, 80, 70, 'sprout') },
  { key: 'plant_bud_tulip', dir: 'nature', w: 90, h: 130, draw: (c) => plant(c, 90, 130, 'bud', 'tulip') },
  { key: 'plant_bud_sun', dir: 'nature', w: 90, h: 150, draw: (c) => plant(c, 90, 150, 'bud', 'sun') },
  { key: 'plant_bud_daisy', dir: 'nature', w: 90, h: 130, draw: (c) => plant(c, 90, 130, 'bud', 'daisy') },
  { key: 'plant_bloom_tulip', dir: 'nature', w: 100, h: 170, draw: (c) => plant(c, 100, 170, 'bloom', 'tulip') },
  { key: 'plant_bloom_sun', dir: 'nature', w: 130, h: 230, draw: (c) => plant(c, 130, 230, 'bloom', 'sun') },
  { key: 'plant_bloom_daisy', dir: 'nature', w: 110, h: 170, draw: (c) => plant(c, 110, 170, 'bloom', 'daisy') },
  { key: 'packet_tulip', dir: 'toys', w: 72, h: 96, draw: (c) => packet(c, 72, 96, 'tulip') },
  { key: 'packet_sun', dir: 'toys', w: 72, h: 96, draw: (c) => packet(c, 72, 96, 'sun') },
  { key: 'packet_daisy', dir: 'toys', w: 72, h: 96, draw: (c) => packet(c, 72, 96, 'daisy') },
  { key: 'fx_seed', dir: 'effects', w: 16, h: 12, draw: (c) => c.paint(c.blob(8, 6, 6, 4, { n: 7 }), '#B08060', { sw: 1.4, texture: false, highlight: false }) },
  {
    key: 'watering_can', dir: 'toys', w: 150, h: 110, anchors: { spout: [144, 22] },
    draw: (c) => {
      let s = c.groundShadow(62, 104, 50, 6);
      s += c.ink('M30 40 Q56 -4 92 34', { w: 10, color: P.ink, opacity: 0.9 }) + c.ink('M30 40 Q56 -4 92 34', { w: 6, color: P.tealDeep, opacity: 1 });
      s += c.paint(c.poly([[96, 70], [140, 18], [148, 26], [110, 86]], { r: 5 }), P.tealDeep, { sw: 2.6 });
      s += c.paint(c.blob(144, 20, 9, 7, { rot: -0.8 }), P.teal, { sw: 2.2, texture: false });
      s += c.paint(c.rect(18, 38, 92, 64, 14), P.teal, { shade: P.tealDeep });
      s += c.paint(c.heart(62, 70, 14), P.coral, { sw: 2, texture: false });
      return s;
    },
  },
  {
    key: 'shovel', dir: 'toys', w: 64, h: 160,
    draw: (c) => {
      let s = c.paint(c.rect(26, 8, 12, 92, 5, 0.4), P.wood, { sw: 2.4, texture: false, shade: P.woodDeep });
      s += c.paint(c.rect(16, 4, 32, 14, 6, 0.4), P.coral, { sw: 2.4, texture: false });
      s += c.paint(c.poly([[10, 96], [54, 96], [50, 136], [32, 156], [14, 136]], { r: 10, rr: [4, 4, 12, 10, 12] }), '#B9C5CF', { shade: '#95A3AF' });
      return s;
    },
  },
  { key: 'butterfly_pink', dir: 'characters', w: 72, h: 60, draw: (c) => butterfly(c, 72, 60, P.pink, P.lavender) },
  { key: 'butterfly_blue', dir: 'characters', w: 72, h: 60, draw: (c) => butterfly(c, 72, 60, P.sky, P.sun) },
  {
    key: 'bee', dir: 'characters', w: 60, h: 52,
    draw: (c) => {
      let s = '';
      // wings: translucent with veins
      for (const [x, y, rot] of [[22, 13, -0.4], [38, 11, 0.4]]) {
        s += c.paint(c.blob(x, y, 11, 10, { rot }), '#EAF6FC', { sw: 2, texture: false, strokeOpacity: 0.65 });
        s += c.ink(`M${x - 6} ${y + 2} q6 -4 11 -6 M${x - 4} ${y + 5} q4 -1 8 -4`, { w: 1, color: '#7FB4CC', opacity: 0.7 });
      }
      // fuzzy body with shaded stripes and a stinger
      s += c.ink('M8 32 l-5 1', { w: 2.4 });
      s += c.ink('M54 30 l4 3 l-4 2', { w: 2, color: P.ink, opacity: 0.85 });
      const body = c.blob(30, 32, 22, 15);
      s += c.paint(body, P.sun, { shade: P.sunDeep, inner: `<rect x="19" y="10" width="7" height="44" fill="${P.ink}" opacity=".85"/><rect x="32" y="10" width="7" height="44" fill="${P.ink}" opacity=".85"/><rect x="14" y="10" width="2.5" height="44" fill="${P.ink}" opacity=".35"/>` });
      s += c.flat(c.blob(26, 24, 8, 4, { rot: -0.2 }), '#FFF3C8', 0.7);
      // little antennae with dots
      s += c.ink('M42 22 q4 -8 8 -9 M46 20 q3 -6 7 -4', { w: 1.6, color: P.ink, opacity: 0.9 });
      s += `<circle cx="50" cy="13" r="1.8" fill="${P.ink}"/><circle cx="53" cy="16" r="1.6" fill="${P.ink}"/>`;
      // face: eye with glint and a rosy cheek
      s += `<ellipse cx="44" cy="29" rx="2.8" ry="3.4" fill="${P.ink}"/><circle cx="44.9" cy="27.8" r="1" fill="#fff"/>`;
      s += `<ellipse cx="45" cy="36" rx="3.4" ry="2.2" fill="${P.coral}" opacity=".5"/>`;
      // legs
      s += c.ink('M22 46 l-2 5 M30 47 l0 5 M38 46 l2 5', { w: 1.6, color: P.ink, opacity: 0.8 });
      return s;
    },
  },
  {
    key: 'duck', dir: 'characters', w: 124, h: 92,
    draw: (c) => {
      let s = c.paint(c.blob(56, 60, 48, 24), P.white, { shade: '#E6E1D3' });
      s += c.paint(c.poly([[14, 52], [4, 34], [26, 46]], { r: 4 }), P.white, { sw: 2.4, texture: false, shade: '#E6E1D3' });
      s += c.paint(c.blob(92, 30, 22, 21), P.white, { shade: '#E6E1D3' });
      s += c.paint(c.poly([[108, 30], [122, 34], [108, 40]], { r: 4 }), P.orange, { sw: 2.2, texture: false });
      s += `<ellipse cx="98" cy="25" rx="3.4" ry="4.2" fill="${P.ink}"/><circle cx="99" cy="23.4" r="1.2" fill="#fff"/><ellipse cx="100" cy="36" rx="4" ry="2.6" fill="${P.coral}" opacity=".5"/>`;
      s += c.ink('M40 58 q14 10 30 0', { w: 2.4, opacity: 0.6 });
      s += c.ink(c.line([[6, 78], [110, 80]], { j: 1.4 }), { w: 3, color: P.waterDeep, opacity: 0.8 });
      return s;
    },
  },
  {
    key: 'frog', dir: 'characters', w: 80, h: 62,
    draw: (c) => {
      let s = c.paint(c.blob(40, 40, 32, 20), '#8FCB7E', { shade: '#6FAE62' });
      for (const x of [26, 54]) {
        s += c.paint(c.blob(x, 18, 11, 11), '#8FCB7E', { sw: 2.4, texture: false, shade: '#6FAE62' });
        s += `<circle cx="${x}" cy="18" r="5.6" fill="${P.white}" stroke="${P.ink}" stroke-width="1.8"/><circle cx="${x + 1}" cy="18" r="3" fill="${P.ink}"/>`;
      }
      s += c.ink('M28 42 q12 9 24 0', { w: 2.4 });
      s += `<ellipse cx="20" cy="38" rx="5" ry="3" fill="${P.coral}" opacity=".45"/><ellipse cx="60" cy="38" rx="5" ry="3" fill="${P.coral}" opacity=".45"/>`;
      s += c.paint(c.blob(16, 56, 12, 5), '#8FCB7E', { sw: 2.2, texture: false }) + c.paint(c.blob(64, 56, 12, 5), '#8FCB7E', { sw: 2.2, texture: false });
      return s;
    },
  },
  {
    key: 'lily_pad', dir: 'nature', w: 110, h: 46,
    draw: (c) => {
      const pad = c.poly([[55, 23], [104, 16], [100, 34], [55, 44], [8, 32], [10, 12], [55, 2], [80, 6]], { r: 14, j: 0.6 });
      return c.paint(pad, P.leaf, { shade: P.leafDeep, sw: 2.6 }) + c.ink('M55 23 L30 14 M55 23 L32 36 M55 23 L80 36', { w: 1.6, color: P.leafDark, opacity: 0.6 }) + c.paint(c.blob(30, 18, 8, 6), P.pink, { sw: 1.8, texture: false });
    },
  },
  {
    key: 'mushroom_red', dir: 'nature', w: 78, h: 88,
    draw: (c) => {
      let s = c.groundShadow(39, 82, 26, 5);
      s += c.paint(c.rect(26, 38, 26, 44, 10), P.cream, { shade: P.paperDeep });
      s += c.paint(c.poly([[4, 46], [14, 14], [39, 4], [64, 14], [74, 46]], { r: 16, rr: [8, 18, 22, 18, 8] }), P.coralDeep, {});
      for (const [x, y, r] of [[24, 24, 6], [46, 16, 5], [56, 34, 5], [34, 38, 4]]) s += c.flat(c.blob(x, y, r, r * 0.9), P.white, 0.95);
      s += c.face(39, 62, 0.65, { cheeks: true });
      return s;
    },
  },
  {
    key: 'mushroom_lav', dir: 'nature', w: 64, h: 74,
    draw: (c) => {
      let s = c.groundShadow(32, 68, 20, 4);
      s += c.paint(c.rect(23, 32, 18, 36, 8), P.cream, { shade: P.paperDeep });
      s += c.paint(c.blob(32, 30, 28, 18, { n: 12, j: 0.04 }), P.lavender, { shade: P.lavDeep });
      for (const [x, y] of [[22, 24], [40, 20], [34, 34]]) s += c.flat(c.blob(x, y, 3.6, 3.2), P.white, 0.9);
      return s;
    },
  },
  {
    key: 'apple', dir: 'nature', w: 44, h: 48,
    draw: (c) => c.paint(c.blob(22, 28, 18, 17, { n: 10, j: 0.03 }), '#F0736B', { shade: P.coralDeep }) + c.ink('M22 12 q0 -6 3 -9', { w: 2.6 }) + c.paint(c.poly([[25, 9], [38, 2], [33, 12]], { r: 3 }), P.leaf, { sw: 1.8, texture: false }),
  },
  {
    key: 'rabbit', dir: 'characters', w: 100, h: 124,
    draw: (c) => {
      const fur = '#F4EEE4', deep = '#DCD2C2';
      let s = c.groundShadow(50, 118, 34, 6);
      for (const x of [36, 64]) {
        s += c.paint(c.rect(x - 9, 4, 18, 50, 9), fur, { sw: 2.4, texture: false, shade: deep });
        s += c.flat(c.rect(x - 4, 12, 8, 34, 4, 0.3), P.pink, 0.9);
      }
      s += c.paint(c.blob(50, 92, 32, 26), fur, { shade: deep });
      s += c.paint(c.blob(50, 58, 25, 22), fur, { shade: deep });
      s += c.face(50, 58, 0.9, {});
      s += `<ellipse cx="50" cy="64" rx="3" ry="2.2" fill="${P.coral}"/>`;
      s += c.paint(c.blob(36, 114, 10, 5), fur, { sw: 2, texture: false }) + c.paint(c.blob(64, 114, 10, 5), fur, { sw: 2, texture: false });
      return s;
    },
  },
  {
    key: 'carrot', dir: 'toys', w: 44, h: 86,
    draw: (c) => {
      let s = '';
      for (const [dx, h2] of [[-8, 22], [0, 28], [8, 22]]) s += c.paint(c.poly([[22 + dx - 4, 28], [22 + dx, 28 - h2], [22 + dx + 4, 28]], { r: 3 }), P.leaf, { sw: 2, texture: false });
      s += c.paint(c.poly([[8, 28], [36, 28], [24, 84], [20, 84]], { r: 8, rr: [8, 8, 4, 4] }), P.orange, { shade: '#E08A3C' });
      s += c.ink('M14 42 h8 M22 56 h8 M16 66 h6', { w: 1.8, opacity: 0.5 });
      return s;
    },
  },
  {
    key: 'hedgehog', dir: 'characters', w: 110, h: 74,
    draw: (c) => {
      let s = c.groundShadow(55, 68, 44, 5);
      const v = [];
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI + (i / 14) * Math.PI;
        const r = i % 2 ? 46 : 36;
        v.push([50 + Math.cos(a) * r, 54 + Math.sin(a) * r * 0.9]);
      }
      s += c.paint(c.poly(v, { r: 4, j: 0.6 }), P.woodDeep, { shade: P.woodDark });
      s += c.paint(c.blob(84, 50, 22, 16, { rot: 0.2 }), P.peach, { shade: '#E8AE85' });
      s += `<ellipse cx="104" cy="52" rx="4.4" ry="3.6" fill="${P.ink}"/><ellipse cx="88" cy="45" rx="3" ry="3.8" fill="${P.ink}"/><circle cx="89" cy="43.8" r="1.1" fill="#fff"/><ellipse cx="90" cy="55" rx="4" ry="2.4" fill="${P.coral}" opacity=".5"/>`;
      s += c.paint(c.blob(40, 66, 9, 5), P.peach, { sw: 2, texture: false }) + c.paint(c.blob(74, 66, 9, 5), P.peach, { sw: 2, texture: false });
      return s;
    },
  },
  {
    key: 'hedgehog_ball', dir: 'characters', w: 84, h: 74,
    draw: (c) => {
      let s = c.groundShadow(42, 68, 34, 5);
      const v = [];
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const r = i % 2 ? 36 : 28;
        v.push([42 + Math.cos(a) * r, 38 + Math.sin(a) * r]);
      }
      s += c.paint(c.poly(v, { r: 3, j: 0.5 }), P.woodDeep, { shade: P.woodDark });
      s += c.ink('M32 40 q4 3 8 0 M46 40 q4 3 8 0', { w: 2, color: P.cream });
      return s;
    },
  },
  {
    key: 'snail', dir: 'characters', w: 86, h: 60,
    draw: (c) => {
      let s = c.groundShadow(44, 54, 36, 5);
      s += c.paint(c.poly([[6, 52], [70, 52], [82, 40], [78, 26], [70, 30], [66, 44]], { r: 8 }), '#E8D7B5', { shade: '#D2BE97' });
      s += c.ink('M74 28 l-2 -14 M80 30 l4 -12', { w: 2 }) + `<circle cx="72" cy="13" r="3" fill="${P.ink}"/><circle cx="84" cy="17" r="3" fill="${P.ink}"/>`;
      s += c.paint(c.blob(36, 30, 24, 22), P.coral, { shade: P.coralDeep });
      s += c.ink(`M36 30 m-3 0 a3 3 0 1 1 6 0 a8 8 0 1 1 -14 2 a14 14 0 1 1 24 -6`, { w: 2.4, opacity: 0.7 });
      return s;
    },
  },
  {
    key: 'rainbow', dir: 'effects', w: 900, h: 470,
    draw: (c) => {
      const cols = [P.coral, P.orange, P.sun, P.leaf, P.sky, P.lavender];
      let s = '';
      const cx = 450, cy = 460, band = 30;
      cols.forEach((col, i) => {
        const r = 420 - i * band;
        s += `<path d="M${cx - r} ${cy} A${r} ${r * 0.98} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="${col}" stroke-width="${band + 1}" opacity=".85"/>`;
      });
      s += c.pencil({ x: 30, y: 40, w: 840, h: 400 }, { color: '#fff', opacity: 0.12, density: 0.25 });
      s += `<path d="M${cx - 435} ${cy} A435 426 0 0 1 ${cx + 435} ${cy}" fill="none" stroke="${P.ink}" stroke-width="2.4" opacity=".35"/>`;
      s += `<path d="M${cx - 255} ${cy} A255 250 0 0 1 ${cx + 255} ${cy}" fill="none" stroke="${P.ink}" stroke-width="2.4" opacity=".35"/>`;
      return s;
    },
  },
];

export { LINE, lighten };
