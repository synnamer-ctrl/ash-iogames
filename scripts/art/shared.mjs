import { P, LINE, darken, lighten, fmt as f } from './lib.mjs';

/** @typedef {{key:string, dir:string, w:number, h:number, draw:(c:any)=>string, defs?:(c:any)=>string}} AssetSpec */

export function cloud(c, w, h, puffs, { body = P.white, shade = '#DCE5F4', line = '#8796B3' } = {}) {
  const base = c.blob(w / 2, h * 0.7, w * 0.44, h * 0.2, { n: 12, j: 0.03 });
  const parts = [base];
  for (const [x, y, r] of puffs) parts.push(c.blob(x, y, r, r * 0.9, { n: 11, j: 0.035 }));
  const clip = c.uid('cl');
  // merged silhouette: wide outline under everything, fills on top
  let out = `<clipPath id="${clip}">${parts.map((p) => `<path d="${p.d}"/>`).join('')}</clipPath>`;
  for (const p of parts) out += c.ink(p, { w: 5.4, color: line, opacity: 0.6 });
  for (const p of parts) out += c.flat(p, shade);
  out += `<g clip-path="url(#${clip})">`;
  for (const p of parts) out += `<g transform="translate(-4 -6)">${c.flat(p, body)}</g>`;
  // shaded underside: the lower part of the cloud sits in a cooler tint
  out += c.flat(c.rect(0, h * 0.7, w, h * 0.4, 10, 2), shade, 0.55);
  out += c.pencil({ x: w * 0.12, y: h * 0.2, w: w * 0.76, h: h * 0.6 }, { color: P.skyDeep, opacity: 0.1, density: 0.7, angle: -20 });
  out += `</g>`;
  // one soft highlight on the largest puff, upper-left (the light source)
  const [hx, hy, hr] = puffs.reduce((a, b) => (b[2] > a[2] ? b : a));
  out += c.ink(`M${f(hx - hr * 0.62)} ${f(hy - hr * 0.12)} q${f(hr * 0.1)} ${f(-hr * 0.7)} ${f(hr * 0.72)} ${f(-hr * 0.46)}`, { w: Math.max(3, hr * 0.12), color: '#FFFFFF', opacity: 0.85 });
  return out;
}

export function treeRound(c, w, h, { leaf = P.leaf, fruit = null } = {}) {
  const cx = w / 2;
  let out = c.groundShadow(cx, h - 14, w * 0.3, 11);
  const trunk = c.poly([[cx - 18, h - 16], [cx - 12, h * 0.5], [cx + 12, h * 0.5], [cx + 20, h - 16]], { r: 8, j: 1 });
  out += c.paint(trunk, P.wood, { shade: P.woodDeep });
  out += c.ink(c.line([[cx - 4, h - 30], [cx - 2, h * 0.62]], { j: 1.2 }), { w: 1.6, opacity: 0.5 });
  out += c.ink(`M${cx + 6} ${h * 0.7} q8 -14 22 -18`, { w: 3, opacity: 0.85 });
  const R = w * 0.4;
  const blobs = [
    [cx, h * 0.34, R, R * 0.86],
    [cx - R * 0.55, h * 0.44, R * 0.58, R * 0.5],
    [cx + R * 0.58, h * 0.42, R * 0.56, R * 0.5],
    [cx, h * 0.18, R * 0.62, R * 0.5],
  ];
  const leafDeep = darken(leaf, 0.2);
  for (const [x, y, rx, ry] of blobs.slice(1)) out += c.paint(c.blob(x, y, rx, ry, { n: 12, j: 0.07 }), leaf, { shade: leafDeep });
  out += c.paint(c.blob(blobs[0][0], blobs[0][1], blobs[0][2], blobs[0][3], { n: 14, j: 0.06 }), leaf, { shade: leafDeep });
  // leafy scribbles
  for (let i = 0; i < 9; i++) {
    const x = cx + c.jit(R * 0.75), y = h * 0.32 + c.jit(R * 0.55);
    out += c.ink(`M${f(x)} ${f(y)} q6 -7 12 0`, { w: 2, color: leafDeep, opacity: 0.8 });
  }
  if (fruit) {
    const spots = [[-0.45, 0.3], [0.2, 0.18], [0.5, 0.42], [-0.1, 0.5], [-0.2, 0.05], [0.4, -0.05]];
    for (const [sx, sy] of spots) {
      const x = cx + sx * R, y = h * 0.34 + sy * R;
      out += c.paint(c.blob(x, y, 11, 11, { n: 8, j: 0.05 }), fruit, { sw: 2.2, texture: false });
      out += c.ink(`M${f(x)} ${f(y - 10)} l2 -5`, { w: 2 });
    }
  }
  return out;
}

export function treePine(c, w, h) {
  const cx = w / 2;
  let out = c.groundShadow(cx, h - 12, w * 0.32, 10);
  out += c.paint(c.rect(cx - 13, h * 0.72, 26, h * 0.26, 6), P.wood, { shade: P.woodDeep });
  const tiers = [
    [h * 0.78, w * 0.48, h * 0.3],
    [h * 0.56, w * 0.4, h * 0.28],
    [h * 0.34, w * 0.31, h * 0.26],
  ];
  for (const [base, half, th] of tiers) {
    const tri = c.poly([[cx - half, base], [cx, base - th - 30], [cx + half, base]], { r: 18, j: 1.4, rr: [22, 12, 22] });
    out += c.paint(tri, P.leafDeep, { shade: P.leafDark });
    out += c.ink(`M${f(cx - half * 0.6)} ${f(base - 10)} q${f(half * 0.3)} 8 ${f(half * 0.6)} 0 q${f(half * 0.3)} 8 ${f(half * 0.6)} 0`, { w: 2, color: P.leafDark, opacity: 0.7 });
  }
  return out;
}

export function bush(c, w, h, { flowers = P.pink } = {}) {
  let out = c.groundShadow(w / 2, h - 8, w * 0.42, 8);
  const b = [
    [w * 0.3, h * 0.6, w * 0.24, h * 0.36],
    [w * 0.7, h * 0.6, w * 0.25, h * 0.36],
    [w * 0.5, h * 0.45, w * 0.3, h * 0.38],
  ];
  for (const [x, y, rx, ry] of b) out += c.paint(c.blob(x, y, rx, ry, { n: 11, j: 0.07 }), P.leaf, { shade: P.leafDeep });
  if (flowers) {
    for (const [x, y] of [[0.28, 0.5], [0.5, 0.3], [0.7, 0.55], [0.42, 0.66], [0.62, 0.38]]) {
      out += c.paint(c.blob(w * x, h * y, 6, 6, { n: 6, j: 0.1 }), flowers, { sw: 1.8, texture: false, highlight: false });
      out += `<circle cx="${f(w * x)}" cy="${f(h * y)}" r="2" fill="${P.sun}"/>`;
    }
  }
  return out;
}

export function bird(c, w, h, wingUp, body = '#8EC9F0') {
  let out = '';
  const bodyS = c.blob(w * 0.48, h * 0.56, w * 0.3, h * 0.3, { n: 12, j: 0.03 });
  // tail with feather lines
  out += c.paint(c.poly([[w * 0.2, h * 0.5], [w * 0.04, h * 0.34], [w * 0.1, h * 0.64]], { r: 4 }), darken(body, 0.15), { sw: 2.4, texture: false });
  out += c.ink(`M${f(w * 0.16)} ${f(h * 0.5)} l-8 -4 M${f(w * 0.14)} ${f(h * 0.54)} l-7 2`, { w: 1.4, color: P.ink, opacity: 0.5 });
  // legs (for the perched and standing pose)
  out += c.ink(`M${f(w * 0.46)} ${f(h * 0.8)} l-1 ${f(h * 0.12)} M${f(w * 0.56)} ${f(h * 0.8)} l1 ${f(h * 0.12)}`, { w: 2.2, color: P.orange, opacity: 1 });
  // body and a lighter belly
  out += c.paint(bodyS, body, { sw: 2.8 });
  out += c.flat(c.blob(w * 0.52, h * 0.7, w * 0.19, h * 0.12, { n: 10, j: 0.04 }), P.cream, 0.95);
  // beak with a shaded lower half
  out += c.paint(c.poly([[w * 0.74, h * 0.46], [w * 0.92, h * 0.53], [w * 0.74, h * 0.6]], { r: 3, j: 0.3 }), P.orange, { sw: 2.2, texture: false, highlight: false });
  out += c.ink(`M${f(w * 0.75)} ${f(h * 0.54)} L${f(w * 0.9)} ${f(h * 0.53)}`, { w: 1.2, color: P.woodDeep, opacity: 0.6 });
  // eye with a glint and a soft brow
  out += `<ellipse cx="${f(w * 0.63)}" cy="${f(h * 0.46)}" rx="3.6" ry="4.4" fill="${P.ink}"/><circle cx="${f(w * 0.645)}" cy="${f(h * 0.44)}" r="1.3" fill="#fff"/>`;
  out += c.ink(`M${f(w * 0.58)} ${f(h * 0.39)} q${f(w * 0.04)} ${f(-h * 0.04)} ${f(w * 0.09)} ${f(-h * 0.01)}`, { w: 1.6, color: P.ink, opacity: 0.7 });
  out += `<ellipse cx="${f(w * 0.6)}" cy="${f(h * 0.58)}" rx="4" ry="2.6" fill="${P.coral}" opacity=".5"/>`;
  // wing with feather tips
  const wing = wingUp
    ? c.poly([[w * 0.3, h * 0.5], [w * 0.36, h * 0.06], [w * 0.56, h * 0.48]], { r: 8, rr: [6, 10, 6] })
    : c.poly([[w * 0.28, h * 0.52], [w * 0.5, h * 0.94], [w * 0.58, h * 0.56]], { r: 8, rr: [6, 10, 6] });
  out += c.paint(wing, darken(body, 0.12), { sw: 2.4, texture: false });
  if (wingUp) out += c.ink(`M${f(w * 0.36)} ${f(h * 0.36)} q${f(w * 0.08)} ${f(-h * 0.08)} ${f(w * 0.16)} ${f(-h * 0.02)} M${f(w * 0.4)} ${f(h * 0.44)} q${f(w * 0.08)} ${f(-h * 0.06)} ${f(w * 0.14)} ${f(-h * 0.04)}`, { w: 1.4, color: P.ink, opacity: 0.55 });
  else out += c.ink(`M${f(w * 0.36)} ${f(h * 0.7)} q${f(w * 0.06)} ${f(h * 0.1)} ${f(w * 0.12)} ${f(h * 0.2)} M${f(w * 0.44)} ${f(h * 0.68)} q${f(w * 0.06)} ${f(h * 0.1)} ${f(w * 0.12)} ${f(h * 0.2)}`, { w: 1.4, color: P.ink, opacity: 0.55 });
  out += c.ink(`M${f(w * 0.42)} ${f(h * 0.82)} l-2 8 M${f(w * 0.52)} ${f(h * 0.82)} l2 8`, { w: 2.2 });
  return out;
}

export function rock(c, w, h, color = P.stone) {
  let out = c.groundShadow(w / 2, h - 6, w * 0.44, 6);
  out += c.paint(c.poly([[w * 0.06, h * 0.86], [w * 0.18, h * 0.3], [w * 0.5, h * 0.1], [w * 0.84, h * 0.28], [w * 0.95, h * 0.86]], { r: 16, j: 1.4 }), color, { shade: darken(color, 0.2) });
  out += c.ink(`M${f(w * 0.36)} ${f(h * 0.5)} q8 -4 14 2`, { w: 1.8, opacity: 0.5 });
  return out;
}

/** @type {AssetSpec[]} */
export const shared = [
  { key: 'cloud_a', dir: 'nature', w: 270, h: 150, draw: (c) => cloud(c, 270, 150, [[88, 82, 46], [148, 68, 56], [204, 88, 40]]) },
  { key: 'cloud_b', dir: 'nature', w: 210, h: 120, draw: (c) => cloud(c, 210, 120, [[76, 66, 36], [128, 58, 42]]) },
  {
    key: 'cloud_rain', dir: 'nature', w: 270, h: 150,
    draw: (c) => {
      // the same cloud, a little bluer, used while raining
      let s = cloud(c, 270, 150, [[88, 82, 46], [148, 68, 56], [204, 88, 40]], { body: '#E3E8F4', shade: '#B8C3DC', line: '#6F7FA3' });
      s += c.face(140, 96, 1.2, { eyes: 'closed', mouth: 'o' });
      return s;
    },
  },
  {
    key: 'sun_rays', dir: 'nature', w: 260, h: 260,
    draw: (c) => {
      let out = '';
      const cx = 130, cy = 130;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r0 = 80, r1 = i % 2 ? 112 : 124, wd = 0.17;
        const pts = [
          [cx + Math.cos(a - wd) * r0, cy + Math.sin(a - wd) * r0],
          [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
          [cx + Math.cos(a + wd) * r0, cy + Math.sin(a + wd) * r0],
        ];
        out += c.paint(c.poly(pts, { r: 7, j: 0.4, rr: [4, 9, 4] }), i % 2 ? P.sun : P.sunDeep, { sw: 2.6, texture: false });
      }
      return out;
    },
  },
  {
    key: 'sun_face', dir: 'nature', w: 170, h: 170,
    draw: (c) => c.paint(c.blob(85, 85, 74, 74, { n: 14, j: 0.02 }), P.sun, { shade: P.sunDeep }) + c.face(85, 86, 2.1, {}),
  },
  {
    key: 'sun_face_happy', dir: 'nature', w: 170, h: 170,
    draw: (c) => c.paint(c.blob(85, 85, 74, 74, { n: 14, j: 0.02 }), P.sun, { shade: P.sunDeep }) + c.face(85, 86, 2.1, { eyes: 'happy', mouth: 'grin' }),
  },
  {
    key: 'moon', dir: 'nature', w: 170, h: 170,
    draw: (c) => {
      const m = c.blob(85, 85, 70, 70, { n: 14, j: 0.02 });
      let s = c.paint(m, '#FFF2C2', { shade: '#EAD596' });
      for (const [x, y, r] of [[60, 60, 10], [110, 112, 13], [118, 64, 7]]) s += c.flat(c.blob(x, y, r, r), '#EAD596', 0.8);
      s += c.face(85, 92, 1.9, { eyes: 'closed' });
      return s;
    },
  },
  { key: 'tree_round', dir: 'nature', w: 250, h: 340, draw: (c) => treeRound(c, 250, 340) },
  { key: 'tree_apple', dir: 'nature', w: 300, h: 380, draw: (c) => treeRound(c, 300, 380, { leaf: '#A6D58E', fruit: '#F0736B' }) },
  { key: 'tree_pine', dir: 'nature', w: 180, h: 330, draw: (c) => treePine(c, 180, 330) },
  { key: 'bush', dir: 'nature', w: 170, h: 100, draw: (c) => bush(c, 170, 100) },
  { key: 'bush_plain', dir: 'nature', w: 150, h: 90, draw: (c) => bush(c, 150, 90, { flowers: P.sun }) },
  { key: 'bird_up', dir: 'characters', w: 90, h: 72, draw: (c) => bird(c, 90, 72, true) },
  { key: 'bird_down', dir: 'characters', w: 90, h: 72, draw: (c) => bird(c, 90, 72, false) },
  { key: 'rock', dir: 'nature', w: 96, h: 64, draw: (c) => rock(c, 96, 64) },
  { key: 'pebble', dir: 'nature', w: 54, h: 38, draw: (c) => rock(c, 54, 38, '#BEB6C9') },
  // ---- effects (small, mostly white so they can be tinted) ----
  // Effect sprites: same paint language as the main art (shade, highlight, pencil texture)
  { key: 'fx_sparkle', dir: 'effects', w: 40, h: 40, draw: (c) => { let o = ''; for (const [x, y, k] of [[20, 2, 1], [38, 20, 1], [20, 38, 1], [2, 20, 1]]) o += c.pen(c.penPath([[20, 20], [x, y]], { steps: 8 }), { w: 6.5, color: '#E9B949', taper: 1, wobble: 0.3 }); for (const [x, y] of [[8, 8], [32, 8], [32, 32], [8, 32]]) o += c.pen(c.penPath([[20, 20], [x, y]], { steps: 8 }), { w: 2.2, color: '#F4D27A', taper: 1, wobble: 0.2 }); return o + c.flat(c.blob(20, 20, 4.2, 4.2, { n: 8, j: 0.1 }), P.white); } },
  { key: 'fx_star', dir: 'effects', w: 44, h: 44, draw: (c) => { const st = c.star(22, 23, 19, 9, 5); return c.paint(st, P.sun, { shade: P.sunDeep, sw: 0, stroke: false }) + c.pen(c.penPath(st.pts, { closed: true, steps: 3 }), { w: 3, color: P.ink, taper: 0.55, wobble: 0.5, opacity: 0.9 }) + c.face(22, 24, 0.45, { cheeks: false, mouth: 'smile' }); } },
  { key: 'fx_heart', dir: 'effects', w: 40, h: 38, draw: (c) => { const h = c.heart(20, 18, 17); return c.paint(h, P.coral, { shade: P.coralDeep, sw: 0, stroke: false }) + c.pen(c.penPath(h.pts, { closed: true, steps: 3 }), { w: 2.8, color: P.ink, taper: 0.55, wobble: 0.5, opacity: 0.9 }); } },
  { key: 'fx_drop', dir: 'effects', w: 22, h: 30, draw: (c) => c.paint(c.poly([[11, 2], [19, 18], [11, 28], [3, 18]], { r: 7, rr: [2, 8, 8, 8] }), P.water, { shade: P.waterDeep, sw: 1.9 }) + c.ink('M7 16 q1 -4 4 -6', { w: 1.6, color: P.white, opacity: 0.9 }) },
  { key: 'fx_leaf', dir: 'effects', w: 30, h: 22, draw: (c) => c.paint(c.poly([[2, 12], [15, 2], [28, 10], [15, 20]], { r: 6 }), P.leaf, { shade: P.leafDeep, sw: 2 }) + c.ink('M5 12 Q14 10 25 10', { w: 1.4, color: P.leafDeep, opacity: 0.8 }) },
  { key: 'fx_note', dir: 'effects', w: 34, h: 40, draw: (c) => c.ink('M18 30 L18 6 Q26 8 30 15', { w: 3.4, color: P.lavDeep }) + c.paint(c.blob(11, 31, 8, 6), P.lavDeep, { shade: P.lavDeep, sw: 2 }) },
  { key: 'fx_zzz', dir: 'effects', w: 40, h: 40, draw: (c) => c.pen([[6, 9], [22, 9], [7, 25], [24, 25]], { w: 3.6, color: P.lavDeep, taper: 0.5, wobble: 0.6, overshoot: 0.05 }) + c.pen([[25, 22], [34, 22], [26, 33], [35, 33]], { w: 2.8, color: P.lavDeep, taper: 0.5, wobble: 0.5, overshoot: 0.05, opacity: 0.85 }) },
  { key: 'fx_dot', dir: 'effects', w: 18, h: 18, draw: (c) => c.paint(c.blob(9, 9, 7, 7, { n: 7 }), P.white, { shade: '#E9E0CC', sw: 1.6, texture: false, highlight: false, strokeColor: '#cfc6b4' }) },
  { key: 'fx_puff', dir: 'effects', w: 64, h: 44, draw: (c) => c.paint(c.blob(32, 24, 26, 16, { n: 9, j: 0.12 }), P.white, { shade: '#E8E1D2', sw: 2, texture: false, strokeColor: '#c9c1b2' }) },
  {
    key: 'fx_ring', dir: 'effects', w: 140, h: 56,
    draw: (c) => c.ink(c.blob(70, 28, 64, 22, { n: 14, j: 0.02 }), { w: 3.2, color: P.white, opacity: 0.95 }) + c.ink(c.blob(70, 28, 46, 14, { n: 12, j: 0.03 }), { w: 2, color: P.white, opacity: 0.6 }),
  },
  { key: 'fx_letter', dir: 'effects', w: 54, h: 38, draw: (c) => c.paint(c.rect(3, 3, 48, 32, 4), P.white, { sw: 2.2 }) + c.ink('M5 6 L27 22 L49 6', { w: 2 }) + c.paint(c.heart(27, 24, 6), P.coral, { sw: 1, texture: false, highlight: false }) },
  { key: 'fx_glow', dir: 'effects', w: 180, h: 180, draw: () => `<defs><radialGradient id="g"><stop offset="0" stop-color="#FFE9A3" stop-opacity=".85"/><stop offset=".45" stop-color="#FFD66B" stop-opacity=".35"/><stop offset="1" stop-color="#FFD66B" stop-opacity="0"/></radialGradient></defs><circle cx="90" cy="90" r="90" fill="url(#g)"/>` },
];

export { lighten, LINE };
