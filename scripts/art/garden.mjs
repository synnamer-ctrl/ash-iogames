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
    const cx = w / 2 + s * 17;
    // upper wing: a scalloped outline, lighter toward the tip
    out += c.paint(c.blob(cx, h * 0.36, 15, 16, { n: 10, j: 0.05 }), wing, { sw: 2.4, shade: darken(wing, 0.12) });
    out += c.flat(c.blob(cx + s * 4, h * 0.26, 7, 5, { n: 7 }), '#FFFFFF', 0.55);
    // lower wing with a little scallop
    out += c.paint(c.blob(w / 2 + s * 14, h * 0.7, 11, 11, { n: 9, j: 0.05 }), darken(wing, 0.08), { sw: 2.2, texture: false });
    // veins and eyespot with a ring
    out += c.ink(`M${f(w / 2 + s * 4)} ${f(h * 0.4)} Q${f(cx)} ${f(h * 0.42)} ${f(cx + s * 9)} ${f(h * 0.2)} M${f(w / 2 + s * 4)} ${f(h * 0.4)} Q${f(cx + s * 2)} ${f(h * 0.52)} ${f(cx + s * 6)} ${f(h * 0.6)}`, { w: 1.2, color: darken(wing, 0.35), opacity: 0.55 });
    out += `<circle cx="${f(w / 2 + s * 18)}" cy="${f(h * 0.34)}" r="4.8" fill="${spot}" opacity=".95" stroke="${P.ink}" stroke-width="1.2"/><circle cx="${f(w / 2 + s * 18)}" cy="${f(h * 0.34)}" r="1.8" fill="#FFFFFF" opacity=".85"/>`;
    // dots along the outer wing edge
    out += `<circle cx="${f(w / 2 + s * 24)}" cy="${f(h * 0.22)}" r="1.4" fill="#FFFFFF" opacity=".8"/><circle cx="${f(w / 2 + s * 22)}" cy="${f(h * 0.48)}" r="1.3" fill="#FFFFFF" opacity=".8"/>`;
  }
  // body: a segmented abdomen with a highlight
  out += c.paint(c.rect(w / 2 - 4, h * 0.2, 8, h * 0.66, 4, 0.2), P.ink, { sw: 1.4, texture: false, highlight: false });
  out += c.flat(c.rect(w / 2 - 2, h * 0.3, 2, h * 0.4, 1), '#FFFFFF', 0.25);
  // curled antennae with little clubs
  out += c.ink(`M${w / 2 - 2} ${h * 0.2} q-4 -8 -9 -10 M${w / 2 + 2} ${h * 0.2} q4 -8 9 -10`, { w: 1.8 });
  out += `<circle cx="${f(w / 2 - 11)}" cy="${f(h * 0.2 - 10)}" r="1.8" fill="${P.ink}"/><circle cx="${f(w / 2 + 11)}" cy="${f(h * 0.2 - 10)}" r="1.8" fill="${P.ink}"/>`;
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
      // a mallard: green head, white collar, chestnut breast, grey-brown body
      const bodyCol = '#B9B3A6', bodyDeep = '#948E82', green = '#2F8F6B', breast = '#8A4E2E';
      let s = '';
      // water ripples behind and under the duck
      s += c.ink(c.line([[4, 80], [118, 82]], { j: 1.2 }), { w: 3, color: P.waterDeep, opacity: 0.7 });
      s += c.ink(c.blob(62, 80, 52, 6, { n: 12, j: 0.04 }).d, { w: 1.6, color: P.white, opacity: 0.8 });
      // tail: a little upturned curl
      s += c.paint(c.poly([[18, 48], [4, 30], [10, 26], [26, 42]], { r: 4 }), '#3F3A34', { sw: 2.2, texture: false });
      // body in two tones: grey-brown back, chestnut breast
      s += c.paint(c.blob(58, 60, 44, 22, { n: 12, j: 0.035 }), bodyCol, { shade: bodyDeep });
      s += c.paint(c.blob(88, 56, 16, 17, { n: 10, j: 0.04 }), breast, { sw: 2.2, texture: false, shade: '#6B3A20' });
      // blue speculum on the wing with white edge
      s += c.paint(c.poly([[40, 52], [64, 48], [70, 56], [46, 60]], { r: 4 }), '#4C7FB5', { sw: 2, texture: false, highlight: false });
      s += c.ink('M40 60 q14 -4 30 -6', { w: 1.6, color: P.white, opacity: 0.9 });
      // wing curves
      s += c.ink('M32 64 q16 6 34 -2 M36 70 q14 4 28 -4', { w: 1.6, color: bodyDeep, opacity: 0.7 });
      // white neck ring
      s += c.paint(c.blob(86, 42, 9, 6, { n: 9, j: 0.03 }), P.white, { sw: 2, texture: false, highlight: false });
      // green head with a shine
      s += c.paint(c.blob(94, 26, 19, 18, { n: 12, j: 0.035 }), green, { shade: '#21674E' });
      s += c.flat(c.blob(90, 20, 8, 4, { rot: -0.3 }), '#8ED3B2', 0.8);
      // orange-yellow bill with a nail
      s += c.paint(c.poly([[106, 26], [120, 30], [116, 35], [106, 34]], { r: 3 }), P.sunDeep, { sw: 2.2, texture: false, highlight: false });
      s += c.flat(c.poly([[116, 30], [120, 30], [116, 35]], { r: 1 }), '#FFE9A3', 0.9);
      // eye with a glint and a soft brow
      s += `<ellipse cx="98" cy="22" rx="3.4" ry="4" fill="${P.ink}"/><circle cx="99.2" cy="20.6" r="1.2" fill="#fff"/>`;
      s += c.ink('M92 16 q5 -3 10 0', { w: 1.5, color: '#21674E', opacity: 0.7 });
      // cheek blush
      s += `<ellipse cx="100" cy="34" rx="4" ry="2.5" fill="${P.coral}" opacity=".35"/>`;
      // floating-on-water: a soft shadow and a little splash line at the waterline
      s += c.ink('M28 80 q6 -3 12 0 M80 81 q6 -3 12 0', { w: 1.6, color: P.white, opacity: 0.9 });
      return s;
    },
  },
  {
    key: 'frog', dir: 'characters', w: 80, h: 62,
    draw: (c) => {
      const green = '#8FCB7E', deep = '#6FAE62';
      let s = '';
      // folded back legs with joints, behind the body
      s += c.paint(c.blob(16, 54, 11, 5, { rot: -0.3 }), green, { sw: 2.2, texture: false, shade: deep });
      s += c.paint(c.blob(64, 54, 11, 5, { rot: 0.3 }), green, { sw: 2.2, texture: false, shade: deep });
      s += c.ink('M18 52 l6 -4 M62 52 l-6 -4', { w: 1.2, color: deep, opacity: 0.6 });
      // body with a pale belly and spots on the back
      s += c.paint(c.blob(40, 40, 32, 20), green, { shade: deep });
      s += c.flat(c.blob(40, 46, 22, 8), '#E8F6D8', 0.8);
      for (const [x, y, r] of [[30, 36, 2.2], [44, 32, 2], [54, 40, 2.4], [36, 44, 1.6]]) s += c.flat(c.blob(x, y, r, r), deep, 0.8);
      // bulging eyes with glints
      for (const x of [26, 54]) {
        s += c.paint(c.blob(x, 18, 11, 11), green, { sw: 2.4, texture: false, shade: deep });
        s += `<circle cx="${x}" cy="18" r="5.8" fill="${P.white}" stroke="${P.ink}" stroke-width="1.8"/><circle cx="${x + 1}" cy="18.5" r="3.1" fill="${P.ink}"/><circle cx="${x + 2.2}" cy="16.8" r="1" fill="#fff"/>`;
      }
      // smile and rosy cheeks
      s += c.ink('M26 42 q14 10 28 0', { w: 2.4 });
      s += `<ellipse cx="20" cy="38" rx="5" ry="3" fill="${P.coral}" opacity=".45"/><ellipse cx="60" cy="38" rx="5" ry="3" fill="${P.coral}" opacity=".45"/>`;
      // front feet with toes
      for (const x of [16, 64]) {
        s += c.paint(c.blob(x, 56, 12, 5), green, { sw: 2.2, texture: false });
        s += c.ink(`M${x - 6} 58 l1 -2 M${x} 59 l0 -2 M${x + 6} 58 l-1 -2`, { w: 1, color: deep, opacity: 0.7 });
      }
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
      const fur = '#F4EEE4', deep = '#DCD2C2', inner = '#F8B9C4';
      let s = c.groundShadow(50, 118, 34, 6);
      // ears: shaded outside, pink inside, with a curve
      for (const x of [36, 64]) {
        s += c.paint(c.rect(x - 9, 4, 18, 50, 9), fur, { sw: 2.4, texture: false, shade: deep });
        s += c.flat(c.rect(x - 4, 12, 8, 34, 4, 0.3), inner, 0.95);
        s += c.ink(`M${x - 6} 12 q-2 14 0 30`, { w: 1.4, color: deep, opacity: 0.6 });
      }
      // body with a soft belly patch and a fluffy tail
      s += c.paint(c.blob(50, 92, 32, 26), fur, { shade: deep });
      s += c.flat(c.blob(50, 98, 16, 12), '#FFFFFF', 0.7);
      s += c.paint(c.blob(74, 102, 7, 6), '#FFFFFF', { sw: 1.8, texture: false, highlight: false });
      // head with a fluff highlight and cheek blush
      s += c.paint(c.blob(50, 58, 25, 22), fur, { shade: deep });
      s += c.flat(c.blob(44, 46, 10, 5), '#FFFFFF', 0.8);
      // big round eyes with glints
      for (const x of [41, 59]) {
        s += `<ellipse cx="${x}" cy="55" rx="3.4" ry="4.2" fill="${P.ink}"/><circle cx="${x + 1}" cy="53.6" r="1.2" fill="#fff"/>`;
      }
      s += `<ellipse cx="36" cy="63" rx="4.5" ry="2.8" fill="${P.coral}" opacity=".45"/><ellipse cx="64" cy="63" rx="4.5" ry="2.8" fill="${P.coral}" opacity=".45"/>`;
      // pink nose and a small mouth with two teeth
      s += `<path d="M47 62 L53 62 L50 66 Z" fill="${P.coral}" stroke="#A8534B" stroke-width="1.2"/>`;
      s += c.ink('M50 66 q-3 3 -6 1 M50 66 q3 3 6 1', { w: 1.4, color: P.ink, opacity: 0.8 });
      s += c.paint(c.rect(47, 67, 3, 3, 1), P.white, { sw: 0.8, texture: false, highlight: false }) + c.paint(c.rect(50, 67, 3, 3, 1), P.white, { sw: 0.8, texture: false, highlight: false });
      // whiskers
      s += c.ink('M30 64 l-14 -2 M30 68 l-14 2 M70 64 l14 -2 M70 68 l14 2', { w: 1.2, color: P.ink, opacity: 0.6 });
      // front paws with toes
      for (const x of [36, 64]) {
        s += c.paint(c.blob(x, 114, 10, 5), fur, { sw: 2, texture: false });
        s += c.ink(`M${x - 4} 115 v-2 M${x} 115 v-2 M${x + 4} 115 v-2`, { w: 1, color: deep, opacity: 0.8 });
      }
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
      const brown = '#8F6A4F', brownDeep = '#5E4330', tip = '#4A3426', cream = '#FBEBD3', pink = '#F4A7A0';
      let s = c.groundShadow(54, 68, 40, 5);
      // one body shape, head merged into it on the right
      s += c.paint(c.blob(56, 44, 36, 25, { n: 14, j: 0.025 }), brown, { shade: brownDeep });
      s += c.paint(c.blob(88, 40, 18, 17, { n: 12, j: 0.025 }), brown, { shade: brownDeep, highlight: false });
      // dense spikes: short tapered cones on the back, pointing up and back
      for (let i = 0; i < 16; i++) {
        const t = i / 15;
        const a = Math.PI * 1.08 + t * Math.PI * 0.52;
        const rx = 33 + (i % 2 ? 2 : -1), ry = 23 + (i % 2 ? 1 : -1);
        const bx = 58 + Math.cos(a) * rx, by = 44 + Math.sin(a) * ry;
        const len = 12 + (1 - Math.abs(t - 0.45)) * 6;
        const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
        const nx = -Math.sin(a) * 4, ny = Math.cos(a) * 4;
        s += c.paint(c.poly([[bx + nx, by + ny], [tx, ty], [bx - nx, by - ny]], { r: 1.5 }), brownDeep, { sw: 1.8, texture: false, highlight: false });
        s += c.ink(`M${f(tx)} ${f(ty)} l${f(-Math.cos(a) * 3)} ${f(-Math.sin(a) * 3)}`, { w: 2, color: tip, opacity: 0.9 });
      }
      // cream face patch and belly, blended into the body (no outline)
      s += c.flat(c.blob(82, 44, 13, 12, { n: 10, j: 0.03 }), cream, 0.95);
      s += c.flat(c.blob(60, 58, 18, 9, { n: 10, j: 0.04 }), cream, 0.8);
      // eye with glint, cheek, and a dark button nose
      s += `<ellipse cx="88" cy="36" rx="3" ry="3.6" fill="${P.ink}"/><circle cx="89" cy="34.8" r="1" fill="#fff"/>`;
      s += `<ellipse cx="82" cy="46" rx="3.6" ry="2.3" fill="${pink}" opacity=".6"/>`;
      s += `<ellipse cx="99" cy="42" rx="3.2" ry="2.8" fill="${P.ink}"/><ellipse cx="98.2" cy="41" rx="1" ry="0.7" fill="#fff"/>`;
      s += c.ink('M95 47 q2.5 2 5 -1', { w: 1.3, color: P.ink, opacity: 0.8 });
      // small front feet with toes
      for (const x of [70, 84]) {
        s += c.flat(c.blob(x, 66, 7, 4.5), cream, 1);
        s += c.ink(`M${x - 2} 67 v-2 M${x + 2} 67 v-2`, { w: 1, color: '#A87E62', opacity: 0.8 });
      }
      return s;
    },
  },
  {
    key: 'hedgehog_ball', dir: 'characters', w: 84, h: 74,
    draw: (c) => {
      let s = c.groundShadow(42, 68, 34, 5);
      const v = [];
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const r = i % 2 ? 36 : 28;
        v.push([42 + Math.cos(a) * r, 38 + Math.sin(a) * r]);
      }
      s += c.paint(c.poly(v, { r: 3, j: 0.5 }), P.woodDeep, { shade: P.woodDark });
      // lighter spine tips all around
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        s += c.ink(`M${f(42 + Math.cos(a) * 30)} ${f(38 + Math.sin(a) * 30)} l${f(Math.cos(a) * 5)} ${f(Math.sin(a) * 5)}`, { w: 2, color: '#E8C9A0', opacity: 0.7 });
      }
      // closed, happy eyes peeking out of the ball
      s += c.ink('M32 40 q4 3 8 0 M46 40 q4 3 8 0', { w: 2, color: P.cream });
      return s;
    },
  },
  {
    key: 'snail', dir: 'characters', w: 86, h: 60,
    draw: (c) => {
      let s = c.groundShadow(44, 54, 36, 5);
      // body with a lighter top and a shaded underside
      s += c.paint(c.poly([[6, 52], [70, 52], [82, 40], [78, 26], [70, 30], [66, 44]], { r: 8 }), '#EFE2C4', { shade: '#D2BE97' });
      s += c.flat(c.blob(40, 46, 26, 4), '#B9A27C', 0.5);
      // eye stalks with eyes
      s += c.ink('M74 30 l-2 -14 M80 32 l4 -12', { w: 2.2, color: P.ink, opacity: 0.9 });
      s += `<circle cx="72" cy="13" r="3.4" fill="${P.white}" stroke="${P.ink}" stroke-width="1.4"/><circle cx="72.8" cy="13.6" r="1.6" fill="${P.ink}"/>`;
      s += `<circle cx="84" cy="17" r="3.4" fill="${P.white}" stroke="${P.ink}" stroke-width="1.4"/><circle cx="84.8" cy="17.6" r="1.6" fill="${P.ink}"/>`;
      // shell: layered spiral with light and shade
      s += c.paint(c.blob(36, 30, 24, 22), P.coral, { shade: P.coralDeep });
      s += c.flat(c.blob(30, 22, 9, 5, { rot: -0.3 }), '#FFD0C8', 0.8);
      s += c.ink(`M36 30 m-3 0 a3 3 0 1 1 6 0 a8 8 0 1 1 -14 2 a14 14 0 1 1 24 -6`, { w: 2.4, opacity: 0.75 });
      s += c.ink(`M36 30 m-7 3 a5 5 0 0 0 7 5`, { w: 1.4, color: P.white, opacity: 0.45 });
      return s;
    },
  },
  {
    key: 'turtle', dir: 'characters', w: 110, h: 80,
    draw: (c) => {
      const shell = '#7FB89A', shellDeep = '#4F8A6E', skin = '#B9D98F';
      let s = c.groundShadow(55, 74, 46, 6);
      // legs and tail behind the shell
      for (const [x, y] of [[24, 60], [84, 60]]) s += c.paint(c.blob(x, y, 9, 8), skin, { sw: 2.2, texture: false });
      s += c.paint(c.poly([[92, 52], [106, 56], [92, 60]], { r: 3 }), skin, { sw: 2, texture: false });
      // head with a pale snout, eye and smile
      s += c.paint(c.blob(100, 44, 10, 9), skin, { shade: '#8DB06A' });
      s += `<circle cx="103" cy="41" r="2.6" fill="${P.ink}"/><circle cx="103.8" cy="40.2" r="0.9" fill="#fff"/>`;
      s += c.ink('M98 48 q4 3 8 0', { w: 1.6 });
      // shell: a dome with hexagonal scutes and a highlight
      s += c.paint(c.blob(52, 44, 40, 30, { n: 14, j: 0.03 }), shell, { shade: shellDeep });
      for (const [x, y] of [[52, 40], [40, 46], [64, 46], [46, 56], [58, 56], [52, 30]]) {
        s += c.ink(c.poly([[x - 6, y], [x - 3, y - 5], [x + 3, y - 5], [x + 6, y], [x + 3, y + 5], [x - 3, y + 5]], { r: 1 }).d, { w: 1.6, color: shellDeep, opacity: 0.8 });
      }
      s += c.ink('M26 30 q14 -10 30 -8', { w: 3, color: '#FFFFFF', opacity: 0.6 });
      return s;
    },
  },
  {
    key: 'fish', dir: 'characters', w: 100, h: 64,
    draw: (c) => {
      const scale = '#7CC6E6', deep = '#4E9FC6', belly = '#EAF8FF', fin = '#F58F83';
      let s = '';
      // tail fin with a lighter inner edge
      s += c.paint(c.poly([[78, 32], [98, 12], [94, 32], [98, 52]], { r: 5 }), fin, { sw: 2.4, texture: false, shade: '#D0655C' });
      // body: an oval with a pale belly and a shaded back
      s += c.paint(c.blob(44, 32, 36, 22, { n: 12, j: 0.03 }), scale, { shade: deep });
      s += c.flat(c.blob(42, 40, 26, 7), belly, 0.85);
      // scales as small arcs
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) s += c.ink(`M${f(26 + i * 8 + j * 4)} ${f(28 + j * 6)} q3 -3 6 0`, { w: 1.2, color: deep, opacity: 0.55 });
      // top fin and side fin
      s += c.paint(c.poly([[36, 12], [48, 6], [54, 12]], { r: 3 }), fin, { sw: 2, texture: false, highlight: false });
      s += c.paint(c.poly([[44, 40], [54, 50], [46, 46]], { r: 3 }), fin, { sw: 1.8, texture: false, highlight: false });
      // eye with glint and a smile
      s += `<circle cx="22" cy="28" r="4.6" fill="${P.white}" stroke="${P.ink}" stroke-width="1.6"/><circle cx="23" cy="28.6" r="2.6" fill="${P.ink}"/><circle cx="24" cy="27.4" r="0.9" fill="#fff"/>`;
      s += c.ink('M12 38 q6 3 10 -1', { w: 1.6, color: P.ink, opacity: 0.8 });
      // gill line
      s += c.ink('M32 22 q4 10 0 20', { w: 1.6, color: deep, opacity: 0.6 });
      // a soft highlight along the top
      s += c.ink('M26 18 q14 -6 30 -2', { w: 3, color: '#FFFFFF', opacity: 0.6 });
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
