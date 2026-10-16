import { P, LINE, darken, lighten, fmt as f } from './lib.mjs';

const GLASS = '#CFEFFA';
const LIT = '#FFE07A';
const INTERIOR = '#FFE3A3';

function windowPane(c, x, y, w, h, { round = false, cross = true, lit = false } = {}) {
  const fill = lit ? LIT : GLASS;
  const s = round ? c.blob(x + w / 2, y + h / 2, w / 2, h / 2, { n: 12, j: 0.02 }) : c.rect(x, y, w, h, 6, 0.6);
  let out = c.paint(s, fill, { sw: LINE.detail + 0.4, shade: lit ? '#F6C65A' : '#A9DCEB', hlOpacity: lit ? 0.45 : 0.5 });
  if (cross) out += c.ink(`M${f(x + w / 2)} ${f(y + 3)}L${f(x + w / 2)} ${f(y + h - 3)}M${f(x + 3)} ${f(y + h / 2)}L${f(x + w - 3)} ${f(y + h / 2)}`, { w: 2.4 });
  return out;
}

function doorHole(c, x, y, w, h) {
  const hole = c.poly([[x, y + h], [x, y + w * 0.5], [x + w / 2, y], [x + w, y + w * 0.5], [x + w, y + h]], { r: w * 0.45, rr: [2, w * 0.5, w * 0.5, w * 0.5, 2], j: 0.4 });
  return c.paint(hole, INTERIOR, { shade: '#F2C77A', sw: LINE.detail + 0.4, texture: false, highlight: false }) +
    c.flat(c.rect(x + 3, y + h - 12, w - 6, 10, 3, 0.3), '#E9B66A', 0.7);
}

function roofShingles(c, x0, x1, y, rows, step, color) {
  let out = '';
  for (let r = 0; r < rows; r++) {
    const yy = y + r * step;
    let d = `M${f(x0 + (r % 2) * 10)} ${f(yy)}`;
    for (let x = x0 + (r % 2) * 10; x < x1 - 18; x += 22) d += ` q11 9 22 0`;
    out += c.ink(d, { w: 1.8, color, opacity: 0.55 });
  }
  return out;
}

function house(c, cfg) {
  const { w, h, wall, roof, kind, lit } = cfg;
  let out = c.groundShadow(w / 2, h - 8, w * 0.46, 9);
  if (kind === 'a') {
    out += c.paint(c.rect(192, 40, 34, 70, 5), P.brick, { shade: darken(P.brick, 0.2) });
    out += c.paint(c.rect(186, 32, 46, 16, 5), darken(P.brick, 0.1), { sw: 2.6 });
    out += c.paint(c.rect(30, 122, 220, 172, 8), wall, {});
    out += c.paint(c.poly([[8, 140], [140, 28], [272, 140]], { r: 12, rr: [10, 18, 10], j: 1.3 }), roof, {});
    out += roofShingles(c, 70, 220, 92, 3, 15, darken(roof, 0.35));
    out += windowPane(c, 46, 168, 54, 54, { round: true, lit });
    out += windowPane(c, 180, 166, 54, 50, { lit });
    out += c.paint(c.rect(174, 214, 66, 18, 5), P.woodDeep, { sw: 2.4 });
    for (const [x, col] of [[184, P.pink], [200, P.sun], [216, P.coral], [230, P.lavender]]) out += c.paint(c.blob(x, 210, 7, 7, { n: 7, j: 0.1 }), col, { sw: 1.8, texture: false, highlight: false });
    out += doorHole(c, 112, 198, 56, 96);
    out += c.paint(c.rect(104, 288, 72, 10, 4, 0.4), P.stone, { sw: 2.2, texture: false });
  } else if (kind === 'b') {
    out += c.paint(c.rect(26, 118, 208, 166, 8), wall, {});
    out += c.paint(c.poly([[6, 136], [130, 10], [254, 136]], { r: 12, rr: [10, 14, 10], j: 1.2 }), roof, {});
    out += windowPane(c, 106, 62, 48, 48, { round: true, cross: false, lit });
    out += c.ink('M130 70 L130 102 M114 86 L146 86', { w: 2, opacity: 0.7 });
    for (const x of [44, 132]) {
      out += windowPane(c, x, 146, 56, 54, { lit });
      out += c.paint(c.rect(x - 16, 144, 14, 58, 4, 0.4), P.coral, { sw: 2.2, texture: false });
      out += c.paint(c.rect(x + 58, 144, 14, 58, 4, 0.4), P.coral, { sw: 2.2, texture: false });
    }
    out += doorHole(c, 102, 192, 56, 92);
    out += c.paint(c.rect(94, 278, 72, 10, 4, 0.4), P.stone, { sw: 2.2, texture: false });
    out += c.ink(c.line([[40, 240], [70, 236]]), { w: 1.6, opacity: 0.4 });
  } else if (kind === 'c') {
    out += c.paint(c.rect(26, 74, 168, 270, 8), wall, {});
    out += c.paint(c.poly([[12, 92], [40, 20], [180, 20], [208, 92]], { r: 12, j: 1.2 }), roof, {});
    out += windowPane(c, 88, 34, 44, 40, { round: true, cross: false, lit });
    for (const yy of [106, 176]) for (const x of [46, 128]) out += windowPane(c, x, yy, 46, 50, { lit });
    out += c.paint(c.rect(36, 226, 148, 10, 4, 0.5), lighten(roof, 0.2), { sw: 2, texture: false });
    out += doorHole(c, 82, 250, 56, 94);
    out += c.paint(c.rect(74, 338, 72, 10, 4, 0.4), P.stone, { sw: 2.2, texture: false });
  }
  return out;
}

function shop(c, cfg) {
  const { w, h, wall, stripeA, stripeB, kind, lit } = cfg;
  let out = c.groundShadow(w / 2, h - 8, w * 0.46, 9);
  out += c.paint(c.rect(18, 76, w - 36, h - 84, 8), wall, {});
  out += c.paint(c.rect(10, 60, w - 20, 26, 6), darken(wall, 0.12), { sw: 2.8 });
  out += c.paint(c.rect(18, h - 40, w - 36, 32, 6), P.brick, { shade: darken(P.brick, 0.18), sw: 2.6 });
  for (let x = 30; x < w - 40; x += 34) out += c.ink(`M${x} ${h - 26} h20`, { w: 1.6, opacity: 0.4 });
  // sign board with a picture instead of words
  out += c.paint(c.rect(w / 2 - 62, 8, 124, 50, 14), P.cream, { shade: P.paperDeep });
  if (kind === 'bakery') {
    out += c.paint(c.poly([[w / 2 - 34, 40], [w / 2 - 10, 18], [w / 2 + 10, 18], [w / 2 + 34, 40], [w / 2, 46]], { r: 10 }), P.sunDeep, { sw: 2.4, texture: false });
    out += c.ink(`M${w / 2 - 12} 22 q4 10 0 20 M${w / 2 + 12} 22 q-4 10 0 20`, { w: 2, opacity: 0.6 });
  } else {
    for (const [dx, col] of [[-22, P.coral], [0, P.lavender], [22, P.sun]]) {
      out += c.ink(`M${w / 2 + dx} 50 L${w / 2 + dx} 32`, { w: 2.4, color: P.leafDark });
      out += c.paint(c.blob(w / 2 + dx, 28, 9, 9, { n: 7, j: 0.1 }), col, { sw: 2, texture: false });
    }
  }
  // striped scalloped awning
  const ax0 = 8, ax1 = w - 8, ay = 96, ah = 46;
  const n = 8, sw = (ax1 - ax0) / n;
  for (let i = 0; i < n; i++) {
    const x = ax0 + i * sw;
    const s = c.poly([[x, ay], [x + sw, ay], [x + sw, ay + ah], [x + sw / 2, ay + ah + 10], [x, ay + ah]], { r: 5, rr: [2, 2, 8, 10, 8], j: 0.4 });
    out += c.paint(s, i % 2 ? stripeB : stripeA, { sw: 2.6, texture: i % 2 === 0 });
  }
  // display window
  const wx = 34, wy = 162, ww = kind === 'bakery' ? 160 : 140, wh = 92;
  out += c.paint(c.rect(wx - 6, wy - 6, ww + 12, wh + 12, 8), P.woodDeep, { sw: 2.6 });
  out += c.paint(c.rect(wx, wy, ww, wh, 6), lit ? LIT : GLASS, { shade: lit ? '#F6C65A' : '#A9DCEB', sw: 2.4, hlOpacity: 0.5 });
  if (kind === 'bakery') {
    out += c.ink(`M${wx + 6} ${wy + 62} h${ww - 12}`, { w: 2.4 });
    out += c.paint(c.blob(wx + 34, wy + 48, 22, 14), P.pink, { sw: 2.2 });
    out += c.paint(c.rect(wx + 12, wy + 48, 44, 14, 4), P.cream, { sw: 2.2 });
    out += `<circle cx="${wx + 34}" cy="${wy + 32}" r="5" fill="${P.coralDeep}"/>`;
    out += c.paint(c.poly([[wx + 74, wy + 60], [wx + 86, wy + 40], [wx + 110, wy + 40], [wx + 122, wy + 60]], { r: 8 }), P.sunDeep, { sw: 2.2 });
    out += c.paint(c.blob(wx + 142, wy + 50, 12, 11), P.wood, { sw: 2.2 });
    out += c.ink(`M${wx + 6} ${wy + 30} h${ww - 12}`, { w: 2, opacity: 0.4 });
  } else {
    for (const [x, col] of [[wx + 26, P.coral], [wx + 70, P.lavender], [wx + 112, P.sun]]) {
      out += c.paint(c.poly([[x - 16, wy + 60], [x + 16, wy + 60], [x + 11, wy + 88], [x - 11, wy + 88]], { r: 4 }), P.brick, { sw: 2.2 });
      out += c.paint(c.blob(x, wy + 46, 18, 16, { n: 9, j: 0.1 }), P.leaf, { sw: 2.2 });
      out += c.paint(c.blob(x, wy + 36, 8, 8, { n: 7, j: 0.1 }), col, { sw: 1.8, texture: false });
    }
  }
  const dx = kind === 'bakery' ? 226 : 206;
  out += doorHole(c, dx, h - 132, 58, 98);
  if (kind === 'florist') {
    for (const [x, col] of [[w - 20, P.pink], [w - 46, P.sun]]) {
      out += c.paint(c.poly([[x - 14, h - 40], [x + 14, h - 40], [x + 10, h - 8], [x - 10, h - 8]], { r: 4 }), P.tealDeep, { sw: 2.2 });
      for (const k of [-8, 0, 8]) out += c.paint(c.blob(x + k, h - 50 - Math.abs(k), 7, 7, { n: 7 }), col, { sw: 1.8, texture: false });
    }
  }
  return out;
}

function door(c, w, h, color, glass = false) {
  let out = c.paint(c.poly([[2, h - 2], [2, w * 0.5], [w / 2, 2], [w - 2, w * 0.5], [w - 2, h - 2]], { r: w * 0.45, rr: [2, w * 0.5, w * 0.5, w * 0.5, 2], j: 0.4 }), color, { sw: LINE.detail + 0.4 });
  if (glass) out += c.paint(c.rect(12, 22, w - 24, 36, 8, 0.4), GLASS, { sw: 2, shade: '#A9DCEB', hlOpacity: 0.5 });
  else out += c.paint(c.blob(w / 2, 30, 10, 10, { n: 10, j: 0.02 }), GLASS, { sw: 2, shade: '#A9DCEB' });
  out += c.ink(`M10 ${h - 30} h${w - 20} M10 ${h - 56} h${w - 20}`, { w: 1.6, opacity: 0.35 });
  out += `<circle cx="${w - 12}" cy="${h * 0.58}" r="4" fill="${P.sun}" stroke="${P.ink}" stroke-width="1.6"/>`;
  return out;
}

function peek(c, w, h, kind) {
  let out = '';
  if (kind === 'kid') {
    out += c.paint(c.blob(w / 2, h * 0.58, w * 0.4, h * 0.38), P.skin2, { sw: 2.6 });
    out += c.paint(c.blob(w / 2, h * 0.28, w * 0.4, h * 0.2, { n: 10, j: 0.12 }), P.woodDark, { sw: 2.4, texture: false });
    out += c.face(w / 2, h * 0.6, 0.9, { mouth: 'grin' });
  } else if (kind === 'baker') {
    out += c.paint(c.blob(w / 2, h * 0.62, w * 0.38, h * 0.34), P.skin1, { sw: 2.6 });
    out += c.paint(c.blob(w / 2, h * 0.2, w * 0.42, h * 0.2, { n: 10, j: 0.1 }), P.white, { sw: 2.4 });
    out += c.paint(c.rect(w * 0.18, h * 0.28, w * 0.64, h * 0.12, 3), P.white, { sw: 2.2, texture: false });
    out += c.face(w / 2, h * 0.64, 0.85, {});
    out += c.ink(`M${w / 2 - 8} ${h * 0.82} q4 -4 8 0 q4 -4 8 0`, { w: 2.2, color: P.woodDark });
  } else if (kind === 'cat') {
    out += c.paint(c.poly([[w * 0.14, h * 0.3], [w * 0.28, h * 0.02], [w * 0.44, h * 0.26]], { r: 4 }), '#B9B5CB', { sw: 2.2, texture: false });
    out += c.paint(c.poly([[w * 0.56, h * 0.26], [w * 0.72, h * 0.02], [w * 0.86, h * 0.3]], { r: 4 }), '#B9B5CB', { sw: 2.2, texture: false });
    out += c.paint(c.blob(w / 2, h * 0.58, w * 0.42, h * 0.36), '#C8C4D8', { sw: 2.6 });
    out += c.face(w / 2, h * 0.56, 0.85, { cheeks: true });
    out += c.ink(`M${w * 0.1} ${h * 0.62} l10 2 M${w * 0.9} ${h * 0.62} l-10 2`, { w: 1.6 });
  }
  return out;
}

function vehicleWheel(c, s, { spokes = false } = {}) {
  const r = s / 2;
  let out = c.paint(c.blob(r, r, r - 2, r - 2, { n: 14, j: 0.015 }), '#4F5B66', { shade: '#3D4750', highlight: false, sw: 2.4 });
  if (spokes) {
    out += c.ink(c.blob(r, r, r - 7, r - 7, { n: 12, j: 0.01 }), { w: 1.8, color: P.stone });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out += c.ink(`M${r} ${r} L${f(r + Math.cos(a) * (r - 7))} ${f(r + Math.sin(a) * (r - 7))}`, { w: 1.6, color: P.stone });
    }
    out += `<circle cx="${r}" cy="${r}" r="4" fill="${P.sun}" stroke="${P.ink}" stroke-width="1.5"/>`;
  } else {
    out += c.paint(c.blob(r, r, r * 0.48, r * 0.48, { n: 10, j: 0.02 }), P.cream, { sw: 2, texture: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      out += `<circle cx="${f(r + Math.cos(a) * r * 0.27)}" cy="${f(r + Math.sin(a) * r * 0.27)}" r="2.2" fill="${P.stoneDeep}"/>`;
    }
  }
  return out;
}

function car(c, w, h, color) {
  let out = '';
  // wheel arches sit behind the body
  for (const x of [48, w - 48]) out += c.flat(c.blob(x, 80, 28, 19), '#7A3F38', 0.45);
  // body: roof + bonnet + boot, one silhouette
  out += c.paint(c.poly([[44, 48], [60, 12], [130, 12], [148, 48]], { r: 13, j: 0.6 }), color, {});
  out += c.paint(c.rect(6, 40, w - 12, 44, 18), color, { shade: darken(color, 0.22) });
  // glass: two window panes with frames and reflections
  out += c.paint(c.poly([[57, 44], [68, 19], [94, 19], [94, 44]], { r: 6, j: 0.4 }), GLASS, { sw: 2.6, shade: '#7CC6E6', hlOpacity: 0.6 });
  out += c.paint(c.poly([[102, 44], [102, 19], [124, 19], [138, 44]], { r: 6, j: 0.4 }), GLASS, { sw: 2.6, shade: '#7CC6E6', hlOpacity: 0.6 });
  out += c.ink('M70 26 L82 26 M108 26 L120 26', { w: 2.4, color: '#FFFFFF', opacity: 0.9 });
  // driver
  out += c.paint(c.blob(114, 34, 10, 10), P.skin2, { sw: 2, texture: false });
  out += c.flat(c.blob(114, 26, 10, 5), P.woodDark);
  out += `<circle cx="117" cy="33" r="1.8" fill="${P.ink}"/>`;
  // door line, side stripe, roof shine
  out += c.ink('M96 48 v30', { w: 2.2, opacity: 0.6 });
  out += c.flat(c.rect(14, 62, w - 28, 6, 3, 0.3), lighten(color, 0.4), 0.85);
  out += c.ink('M60 16 Q92 8 126 14', { w: 3, color: '#FFFFFF', opacity: 0.8 });
  // bumper, grille, lamps
  out += c.paint(c.rect(10, 74, w - 20, 10, 5, 0.3), P.inkSoft, { sw: 2, texture: false, highlight: false });
  out += c.paint(c.blob(w - 15, 54, 8, 7), '#FFE49A', { sw: 2.2, texture: false });
  out += c.paint(c.blob(12, 56, 5.5, 6.5), P.coralDeep, { sw: 2, texture: false });
  for (const x of [48, w - 48]) out += c.flat(c.blob(x, 80, 24, 16), '#3A434B', 0.95);
  return out;
}

function bus(c, w, h) {
  let out = '';
  // wheel arches
  for (const x of [76, w - 76]) out += c.flat(c.blob(x, 120, 36, 24), '#7A5A18', 0.45);
  out += c.paint(c.rect(6, 10, w - 14, 112, 20), P.sun, { shade: P.sunDeep });
  // roof rim and destination board
  out += c.flat(c.rect(12, 14, w - 26, 8, 4, 0.2), lighten(P.sun, 0.45), 0.9);
  out += c.paint(c.rect(w / 2 - 36, 16, 72, 8, 3), P.ink, { sw: 1.6, texture: false, highlight: false, strokeOpacity: 0.6 });
  // coral stripe with a lighter top edge
  out += c.flat(c.rect(10, 80, w - 22, 12, 4, 0.4), P.coral, 0.95);
  out += c.flat(c.rect(12, 80, w - 26, 3, 2), lighten(P.coral, 0.4), 0.8);
  const kids = [[P.skin1, P.woodDark], [P.skin3, P.ink], [P.skin2, P.sunDeep], [P.skin1, P.coralDeep]];
  for (let i = 0; i < 4; i++) {
    const x = 22 + i * 54;
    out += c.paint(c.rect(x, 24, 44, 42, 8, 0.4), GLASS, { sw: 2.6, shade: '#7CC6E6', hlOpacity: 0.6 });
    out += c.ink(`M${x + 14} 26 L${x + 14} 64 M${x + 30} 26 L${x + 30} 64`, { w: 1.6, color: P.inkSoft, opacity: 0.35 });
    const [sk, hair] = kids[i];
    out += c.paint(c.blob(x + 22, 52, 11, 11), sk, { sw: 1.8, texture: false });
    out += c.flat(c.blob(x + 22, 43, 11, 6, { j: 0.12 }), hair);
    out += `<circle cx="${x + 18}" cy="${52}" r="1.7" fill="${P.ink}"/><circle cx="${x + 26}" cy="${52}" r="1.7" fill="${P.ink}"/>`;
  }
  // windscreen and door
  out += c.paint(c.poly([[w - 70, 24], [w - 24, 24], [w - 12, 66], [w - 70, 66]], { r: 8, j: 0.4 }), GLASS, { sw: 2.6, shade: '#7CC6E6', hlOpacity: 0.6 });
  out += c.ink(`M${w - 62} 30 L${w - 40} 30`, { w: 2, color: '#FFFFFF', opacity: 0.9 });
  out += c.paint(c.blob(w - 14, 104, 8, 7), '#FFE49A', { sw: 2.2, texture: false });
  out += c.paint(c.rect(4, 108, w - 10, 14, 6, 0.4), P.inkSoft, { sw: 2.2, texture: false });
  for (const x of [76, w - 76]) out += c.flat(c.blob(x, 122, 32, 20), '#3A434B', 0.95);
  return out;
}
function iceCreamVan(c, w, h) {
  let out = '';
  // cone on the roof
  out += c.paint(c.poly([[94, 30], [118, 30], [106, 58]], { r: 4 }), P.wood, { sw: 2.2 });
  out += c.paint(c.blob(106, 22, 15, 13, { n: 9, j: 0.08 }), P.pink, { sw: 2.2 });
  out += c.paint(c.rect(8, 50, w - 20, 74, 18), '#F9C6D2', { shade: '#EBA3B6' });
  out += c.paint(c.rect(w - 64, 34, 52, 50, 14), '#F9C6D2', { shade: '#EBA3B6' });
  out += c.paint(c.rect(w - 56, 42, 38, 30, 8, 0.4), GLASS, { sw: 2.4, shade: '#A9DCEB' });
  out += c.paint(c.rect(26, 62, 110, 40, 8, 0.4), LIT, { sw: 2.4, shade: '#F6C65A' });
  out += c.paint(c.blob(80, 84, 12, 12), P.skin1, { sw: 2, texture: false });
  out += c.flat(c.rect(68, 70, 24, 6, 3), P.white);
  out += `<circle cx="76" cy="84" r="1.7" fill="${P.ink}"/><circle cx="84" cy="84" r="1.7" fill="${P.ink}"/>`;
  out += c.ink(`M20 62 q60 -10 128 0`, { w: 2, color: P.white, opacity: 0.8 });
  for (let x = 26; x < 136; x += 18) out += c.paint(c.blob(x + 9, 104, 9, 6, { n: 8 }), x % 36 ? P.mint : P.cream, { sw: 1.8, texture: false, highlight: false });
  out += c.paint(c.blob(w - 16, 108, 7, 6), P.sun, { sw: 2, texture: false });
  for (const x of [60, w - 58]) out += c.flat(c.blob(x, 124, 26, 18), '#3A434B', 0.9);
  return out;
}

function bike(c, w, h) {
  let out = '';
  const teal = P.tealDeep;
  const frame = `M30 96 L68 96 L56 56 Z M56 56 L98 56 L68 96 M98 56 L110 96 M98 56 L95 40`;
  out += c.ink(frame, { w: 6.4, color: P.ink, opacity: 0.9 });
  out += c.ink(frame, { w: 3.6, color: teal, opacity: 1 });
  out += c.ink('M86 40 Q96 36 104 42', { w: 4, color: P.ink, opacity: 1 });
  out += c.paint(c.rect(44, 44, 22, 8, 4, 0.3), P.inkSoft, { sw: 2, texture: false });
  out += `<circle cx="68" cy="96" r="6" fill="${P.stone}" stroke="${P.ink}" stroke-width="2"/>`;
  // rider
  out += c.ink('M56 44 L76 64 L70 92', { w: 8, color: P.ink, opacity: 0.9 });
  out += c.ink('M56 44 L76 64 L70 92', { w: 5.4, color: '#6C86C9', opacity: 1 });
  out += c.paint(c.rect(64, 88, 16, 8, 4, 0.3), P.coralDeep, { sw: 2, texture: false });
  out += c.paint(c.poly([[50, 48], [58, 16], [76, 18], [68, 50]], { r: 8 }), P.coral, { sw: 2.6 });
  out += c.ink('M70 24 L94 40', { w: 8, color: P.ink, opacity: 0.9 });
  out += c.ink('M70 24 L94 40', { w: 5.4, color: P.coral, opacity: 1 });
  out += c.paint(c.blob(96, 41, 4.5, 4.5), P.skin1, { sw: 1.8, texture: false, highlight: false });
  out += c.paint(c.blob(74, 4, 14, 13), P.skin1, { sw: 2.4, texture: false });
  out += c.paint(c.poly([[58, 0], [72, -12], [90, -6], [90, 0], [60, 4]], { r: 6 }), P.lavender, { sw: 2.2, texture: false });
  out += `<circle cx="81" cy="4" r="1.8" fill="${P.ink}"/>`;
  out += c.ink('M80 10 q3 2 6 -1', { w: 1.6 });
  out += `<ellipse cx="78" cy="9" rx="3" ry="2" fill="${P.coral}" opacity=".5"/>`;
  return `<g transform="translate(0 12)">${out}</g>`;
}

function person(c, w, h, cfg) {
  const { skin, hair, coat, legs, kind } = cfg;
  let out = c.groundShadow(w / 2, h - 6, 30, 6);
  // legs & boots
  out += c.paint(c.rect(w / 2 - 18, h - 50, 14, 40, 6, 0.4), legs, { sw: 2.4, texture: false });
  out += c.paint(c.rect(w / 2 + 4, h - 50, 14, 40, 6, 0.4), legs, { sw: 2.4, texture: false });
  const boot = kind === 'kid' ? P.coralDeep : P.woodDark;
  // rounded shoes with a toe, a sole line and a little shine
  for (const x of [w / 2 - 22, w / 2 + 2]) {
    out += c.paint(c.poly([[x, h - 24], [x + 22, h - 24], [x + 24, h - 9], [x - 2, h - 5], [x - 3, h - 15]], { r: 6, j: 0.3 }), boot, { sw: 2.4 });
    out += c.ink(`M${f(x + 2)} ${f(h - 8)} h${f(20)}`, { w: 1.6, color: P.ink, opacity: 0.5 });
    out += c.ink(`M${f(x + 3)} ${f(h - 20)} q4 -3 9 -2`, { w: 1.8, color: '#FFFFFF', opacity: 0.6 });
  }
  // left arm (static)
  out += c.paint(c.rect(w / 2 - 38, 96, 16, 52, 8, 0.4), coat, { sw: 2.4, texture: false });
  // mitten-shaped hand with a thumb
  out += c.paint(c.poly([[w / 2 - 38, 146], [w / 2 - 24, 146], [w / 2 - 22, 160], [w / 2 - 30, 164], [w / 2 - 40, 160]], { r: 5 }), skin, { sw: 2.2, texture: false });
  out += c.paint(c.blob(w / 2 - 42, 150, 4, 5), skin, { sw: 1.6, texture: false, highlight: false });
  // coat
  const coatS = kind === 'kid'
    ? c.poly([[w / 2 - 26, 88], [w / 2 + 26, 88], [w / 2 + 36, h - 44], [w / 2 - 36, h - 44]], { r: 12, j: 0.8 })
    : c.poly([[w / 2 - 26, 88], [w / 2 + 26, 88], [w / 2 + 40, h - 30], [w / 2 - 40, h - 30]], { r: 12, j: 0.8 });
  out += c.paint(coatS, coat, {});
  // shade down the right side and a soft fold or two
  out += c.flat(c.poly([[w / 2 + 12, 92], [w / 2 + 30, 92], [w / 2 + 38, h - 40], [w / 2 + 18, h - 40]], { r: 8 }), darken(coat, 0.2), 0.28);
  out += c.ink(`M${w / 2 - 12} ${h - 110} q6 14 2 30 M${w / 2 - 4} ${h - 96} q5 10 0 22`, { w: 1.8, color: darken(coat, 0.35), opacity: 0.45 });
  if (kind === 'kid') {
    out += c.ink(`M${w / 2} 96 L${w / 2} ${h - 48}`, { w: 2, opacity: 0.6 });
    for (const y of [110, 130]) out += `<circle cx="${w / 2 + 7}" cy="${y}" r="3" fill="${P.ink}" opacity=".7"/>`;
  } else {
    // lace collar and a brooch
    out += c.ink(`M${w / 2 - 22} 90 q6 8 12 0 q4 8 10 0 q4 8 10 0 q4 8 10 0 q6 -8 12 0`, { w: 2.2, color: P.white, opacity: 0.95 });
    out += c.ink(`M${w / 2 - 20} ${h - 64} q20 8 40 0`, { w: 2, color: darken(coat, 0.3), opacity: 0.6 });
    out += c.paint(c.blob(w / 2 + 12, 120, 8, 6), P.cream, { sw: 1.8, texture: false });
  }
  // head
  const hy = 52;
  if (kind === 'kid') {
    out += c.paint(c.blob(w / 2, hy, 33, 32), skin, {});
    out += c.paint(c.poly([[w / 2 - 36, hy - 4], [w / 2 - 28, hy - 30], [w / 2, hy - 38], [w / 2 + 28, hy - 30], [w / 2 + 36, hy - 4], [w / 2 + 18, hy - 18], [w / 2 - 6, hy - 14]], { r: 10, j: 1 }), hair, { sw: 2.6 });
    out += c.ink(`M${w / 2 - 24} ${hy - 28} q10 -8 20 -4`, { w: 2.6, color: '#FFFFFF', opacity: 0.55 });
    // little rain hat brim
    out += c.paint(c.poly([[w / 2 - 40, hy - 18], [w / 2 - 20, hy - 46], [w / 2 + 22, hy - 46], [w / 2 + 42, hy - 18]], { r: 12, j: 0.6 }), coat, { sw: 2.6 });
    out += c.face(w / 2, hy + 4, 1.15, {});
    out += c.ink(`M${w / 2 - 14} ${hy - 6} q5 -3 9 -1 M${w / 2 + 5} ${hy - 7} q5 -2 9 1`, { w: 1.8, color: P.ink, opacity: 0.6 });
  } else {
    out += c.paint(c.blob(w / 2 + 4, hy - 36, 14, 12), hair, { sw: 2.4 });
    out += c.paint(c.blob(w / 2, hy, 31, 32), skin, {});
    out += c.paint(c.poly([[w / 2 - 32, hy - 2], [w / 2 - 26, hy - 26], [w / 2, hy - 34], [w / 2 + 26, hy - 26], [w / 2 + 32, hy - 2], [w / 2 + 14, hy - 18], [w / 2 - 14, hy - 18]], { r: 10, j: 1 }), hair, { sw: 2.6 });
    out += c.face(w / 2, hy + 4, 1.15, {});
    out += c.ink(c.blob(w / 2 - 13, hy + 4, 9, 8, { n: 10, j: 0.01 }), { w: 2 }) + c.ink(c.blob(w / 2 + 13, hy + 4, 9, 8, { n: 10, j: 0.01 }), { w: 2 }) + c.ink(`M${w / 2 - 4} ${hy + 3} h8`, { w: 2 });
    out += c.ink(`M${w / 2 - 14} ${hy - 14} q6 -4 12 -1 M${w / 2 + 4} ${hy - 15} q6 -3 12 1`, { w: 1.8, color: '#7A7A8A', opacity: 0.7 });
    out += c.flat(c.blob(w / 2 - 22, hy + 14, 5, 3.5), P.coral, 0.45) + c.flat(c.blob(w / 2 + 22, hy + 14, 5, 3.5), P.coral, 0.45);
  }
  return out;
}

function arm(c, w, h, coat, skin) {
  // drawn hanging down from a shoulder pivot at the top-centre
  return c.paint(c.rect(w / 2 - 8, 4, 16, h - 18, 8, 0.4), coat, { sw: 2.4, texture: false }) + c.paint(c.blob(w / 2, h - 12, 8.5, 8.5), skin, { sw: 2.2, texture: false });
}

function blink(c, w, h, skin, glasses = false) {
  let out = c.flat(c.rect(1, 1, w - 2, h - 2, 6, 0.2), skin);
  // closed lids are drawn heavier when the eyes sit behind glasses, so the blink reads at game size
  out += c.ink(`M${w / 2 - 17} ${h / 2} q4 3.5 8 0 M${w / 2 + 9} ${h / 2} q4 3.5 8 0`, { w: glasses ? 3.6 : 2.4 });
  if (glasses) out += c.ink(c.blob(w / 2 - 13, h / 2, 9, 8, { n: 10, j: 0.01 }), { w: 2 }) + c.ink(c.blob(w / 2 + 13, h / 2, 9, 8, { n: 10, j: 0.01 }), { w: 2 });
  return out;
}

function dog(c, w, h) {
  const body = '#EDBE86', deep = '#C9915A', light = '#FBE3BF';
  let out = c.groundShadow(w / 2, h - 6, 52, 7);
  // far legs, then near legs: tapered with rounded paws and toe lines
  for (const x of [34, 112]) {
    out += c.paint(c.poly([[x - 6, 70], [x + 6, 70], [x + 7, 88], [x + 5, 95], [x - 5, 95], [x - 7, 88]], { r: 5 }), deep, { sw: 2.2, texture: false, highlight: false });
  }
  for (const x of [52, 94]) {
    out += c.paint(c.poly([[x - 7, 66], [x + 7, 66], [x + 7, 88], [x + 8, 95], [x - 8, 95], [x - 7, 88]], { r: 5 }), body, { sw: 2.4, texture: false, shade: deep });
    out += c.ink(`M${x - 4} 93 l3 -2 M${x + 1} 93 l3 -2`, { w: 1.4, color: P.ink, opacity: 0.5 });
  }
  // body with a lighter belly and a shade underneath
  out += c.paint(c.blob(72, 58, 50, 25), body, { shade: deep });
  out += c.flat(c.blob(74, 70, 36, 9), light, 0.7);
  out += c.flat(c.blob(58, 50, 16, 11), deep, 0.8);
  out += c.ink(`M46 64 q16 8 40 0`, { w: 1.4, color: deep, opacity: 0.5 });
  // head: rounder, with a cheek and a floppy ear
  out += c.paint(c.blob(118, 36, 27, 25), body, { shade: deep });
  out += c.flat(c.blob(124, 46, 12, 7), light, 0.8);
  out += c.paint(c.poly([[96, 22], [104, 12], [110, 50], [98, 54]], { r: 7 }), '#A87449', { sw: 2.4, texture: false });
  out += c.ink(`M100 26 q4 10 6 22`, { w: 1.6, color: '#7A4C2E', opacity: 0.6 });
  out += c.paint(c.blob(138, 46, 10, 7.5), light, { sw: 2.2, texture: false, highlight: false });
  out += `<ellipse cx="144" cy="42" rx="5.2" ry="4.2" fill="${P.ink}"/><ellipse cx="142.6" cy="40.6" rx="1.6" ry="1.2" fill="#fff"/>`;
  // eye with a glint and brow, then a blush
  out += `<ellipse cx="122" cy="30" rx="3.6" ry="4.4" fill="${P.ink}"/><circle cx="123.2" cy="28.4" r="1.3" fill="#fff"/>`;
  out += c.ink(`M116 24 q5 -3 10 0`, { w: 1.8, color: '#7A4C2E', opacity: 0.8 });
  out += `<ellipse cx="126" cy="44" rx="4.8" ry="3.1" fill="${P.coral}" opacity=".45"/>`;
  // smile and a tongue
  out += c.ink(`M132 52 q4 4 8 0`, { w: 2 });
  out += c.paint(c.blob(138, 56, 4, 5), P.coral, { sw: 1.6, texture: false, highlight: false });
  // collar with a tag that catches the light
  out += c.paint(c.rect(98, 54, 24, 8, 4, 0.3), P.coral, { sw: 2, texture: false });
  out += `<circle cx="110" cy="64" r="4.5" fill="${P.sun}" stroke="${P.ink}" stroke-width="1.5"/><circle cx="108.6" cy="62.6" r="1.2" fill="#fff"/>`;
  return out;
}

function cat(c, w, h, sleeping = false) {
  const fur = '#C4C0D6', deep = '#9F9AB8', stripe = '#8C88A8';
  let out = c.groundShadow(w / 2, h - 6, 40, 6);
  if (sleeping) {
    out += c.paint(c.blob(w / 2, h - 30, 46, 24), fur, { shade: deep });
    // tabby stripes along the back
    out += c.ink(`M${w / 2 - 26} ${h - 46} q8 -6 14 0 M${w / 2 - 6} ${h - 50} q8 -6 14 0 M${w / 2 + 14} ${h - 46} q8 -6 14 0`, { w: 2.2, color: stripe, opacity: 0.9 });
    out += c.paint(c.blob(w / 2 - 30, h - 34, 20, 18), fur, { shade: deep });
    out += c.paint(c.poly([[w / 2 - 46, h - 44], [w / 2 - 44, h - 62], [w / 2 - 32, h - 50]], { r: 3 }), fur, { sw: 2.2, texture: false });
    out += c.paint(c.poly([[w / 2 - 26, h - 50], [w / 2 - 18, h - 64], [w / 2 - 12, h - 46]], { r: 3 }), fur, { sw: 2.2, texture: false });
    out += c.flat(c.poly([[w / 2 - 42, h - 55], [w / 2 - 40, h - 60], [w / 2 - 36, h - 52]], { r: 1 }), P.coralDeep, 0.8);
    // closed eyes with lashes and a tiny nose
    out += c.ink(`M${w / 2 - 38} ${h - 34} q3 3 6 0 M${w / 2 - 28} ${h - 34} q3 3 6 0`, { w: 2 });
    out += `<ellipse cx="${w / 2 - 33}" cy="${h - 30}" rx="3" ry="2" fill="${P.coral}" opacity=".35"/>`;
    // tail wrapped around the front, with a soft highlight
    out += c.ink(`M${w / 2 + 40} ${h - 22} q10 -2 4 -16`, { w: 7, color: deep, opacity: 0.9 });
    out += c.ink(`M${w / 2 + 40} ${h - 22} q10 -2 4 -16`, { w: 5, color: fur, opacity: 1 });
    out += c.ink(`M${w / 2 + 38} ${h - 26} q6 -2 6 -8`, { w: 1.6, color: '#FFFFFF', opacity: 0.6 });
    return out;
  }
  // body with a white chest bib and a shaded belly
  out += c.paint(c.blob(w / 2, h - 34, 30, 30), fur, { shade: deep });
  out += c.paint(c.blob(w / 2, h - 30, 14, 18), P.white, { stroke: false, texture: false, highlight: false });
  out += c.ink(`M${w / 2 - 26} ${h - 52} q4 -6 8 0 M${w / 2 + 18} ${h - 52} q4 -6 8 0`, { w: 2, color: stripe, opacity: 0.8 });
  // ears with a pink inner shell
  out += c.paint(c.poly([[w / 2 - 26, 22], [w / 2 - 22, 0], [w / 2 - 8, 14]], { r: 3 }), fur, { sw: 2.2, texture: false });
  out += c.paint(c.poly([[w / 2 + 8, 14], [w / 2 + 22, 0], [w / 2 + 26, 22]], { r: 3 }), fur, { sw: 2.2, texture: false });
  out += c.flat(c.poly([[w / 2 - 21, 16], [w / 2 - 18, 6], [w / 2 - 11, 15]], { r: 2 }), P.pink, 0.9);
  out += c.flat(c.poly([[w / 2 + 11, 15], [w / 2 + 18, 6], [w / 2 + 21, 16]], { r: 2 }), P.pink, 0.9);
  // head with tabby stripes on the forehead
  out += c.paint(c.blob(w / 2, 32, 28, 22), fur, { shade: deep });
  out += c.ink(`M${w / 2} 14 v8 M${w / 2 - 7} 16 l2 6 M${w / 2 + 7} 16 l-2 6`, { w: 2, color: stripe, opacity: 0.9 });
  out += c.flat(c.blob(w / 2 - 6, 22, 9, 6), '#FFFFFF', 0.25);
  // almond eyes with slit pupils and a glint
  for (const sx of [-1, 1]) {
    const ex = w / 2 + sx * 11;
    out += c.flat(c.blob(ex, 30, 7, 5.5, { n: 9, j: 0.02 }), '#8BD3B5', 1);
    out += `<ellipse cx="${ex}" cy="30" rx="1.8" ry="4.6" fill="${P.ink}"/><circle cx="${ex + 1.4}" cy="28" r="1.1" fill="#fff"/>`;
    out += c.ink(`M${ex - 8} 27 q8 -5 16 0`, { w: 1.6, color: P.ink, opacity: 0.9 });
  }
  // pink nose and mouth
  out += c.paint(c.poly([[w / 2 - 3, 37], [w / 2 + 3, 37], [w / 2, 41]], { r: 1.5 }), P.coral, { sw: 1.2, texture: false, highlight: false });
  out += c.ink(`M${w / 2} 41 q-3 4 -6 3 M${w / 2} 41 q3 4 6 3`, { w: 1.4, opacity: 0.8 });
  // whiskers
  out += c.ink(`M${w / 2 - 34} 36 l12 1 M${w / 2 - 34} 41 l12 -1 M${w / 2 + 34} 36 l-12 1 M${w / 2 + 34} 41 l-12 -1`, { w: 1.4, opacity: 0.7 });
  // paws with toe separations
  for (const x of [w / 2 - 12, w / 2 + 12]) {
    out += c.paint(c.blob(x, h - 8, 9, 6), P.white, { sw: 2, texture: false });
    out += c.ink(`M${x} ${h - 9} v5`, { w: 1, color: '#A9A6BD', opacity: 0.7 });
  }
  return out;
}

function tail(c, w, h, color, kind) {
  if (kind === 'dog') return c.ink(`M4 ${h - 4} q4 -16 ${w - 8} -${h - 10}`, { w: 8, color: P.ink, opacity: 0.9 }) + c.ink(`M4 ${h - 4} q4 -16 ${w - 8} -${h - 10}`, { w: 5, color, opacity: 1 });
  return c.ink(`M4 ${h - 4} q${w} -4 ${w - 10} -${h - 8}`, { w: 9, color: P.ink, opacity: 0.9 }) + c.ink(`M4 ${h - 4} q${w} -4 ${w - 10} -${h - 8}`, { w: 6, color, opacity: 1 });
}

function flower(c, w, h, petal, kind) {
  let out = c.ink(c.line([[w / 2, h - 4], [w / 2 - 2, h * 0.45]]), { w: 4.2, color: P.leafDark, opacity: 1 });
  // two broad leaves and a small third one, so the stem reads as full
  out += c.paint(c.poly([[w / 2, h - 30], [w / 2 + 22, h - 54], [w / 2 + 6, h - 24]], { r: 7 }), P.leaf, { sw: 2.2, texture: false });
  out += c.paint(c.poly([[w / 2, h - 16], [w / 2 - 22, h - 38], [w / 2 - 4, h - 12]], { r: 7 }), P.leaf, { sw: 2.2, texture: false });
  out += c.paint(c.poly([[w / 2 - 2, h - 52], [w / 2 + 8, h - 66], [w / 2 + 4, h - 46]], { r: 4 }), P.leafDeep, { sw: 1.8, texture: false });
  const cy = h * 0.3;
  if (kind === 'tulip') {
    // a fuller cup of three overlapping petals
    out += c.paint(c.poly([[w / 2 - 22, cy - 6], [w / 2 - 12, cy + 4], [w / 2, cy - 18], [w / 2 + 12, cy + 4], [w / 2 + 22, cy - 6], [w / 2 + 18, cy + 16], [w / 2 - 18, cy + 16]], { r: 7, j: 0.5 }), petal, {});
    out += c.paint(c.poly([[w / 2 - 12, cy + 4], [w / 2, cy - 4], [w / 2 + 12, cy + 4], [w / 2 + 8, cy + 16], [w / 2 - 8, cy + 16]], { r: 5 }), darken(petal, 0.12), { sw: 2, texture: false, highlight: false });
  } else if (kind === 'daisy') {
    // two rings of rounded petals, a warm centre and a little highlight
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      out += c.paint(c.blob(w / 2 + Math.cos(a) * 17, cy + Math.sin(a) * 17, 9.5, 6.5, { n: 8, rot: a, j: 0.06 }), petal, { sw: 1.9, texture: false, highlight: false });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      out += c.paint(c.blob(w / 2 + Math.cos(a) * 9, cy + Math.sin(a) * 9, 6, 4.5, { n: 7, rot: a, j: 0.06 }), P.white, { sw: 1.6, texture: false, highlight: false });
    }
    out += c.paint(c.blob(w / 2, cy, 9.5, 9.5, { n: 10, j: 0.05 }), P.sunDeep, { sw: 2, texture: false });
    out += c.flat(c.blob(w / 2 - 3, cy - 3, 3, 3), '#FFF3C8', 0.9);
  } else {
    // bell flower: five overlapping, larger bells
    for (const [dx, dy, r] of [[-12, 6, 12], [12, 6, 12], [0, -9, 13], [-6, 10, 10], [7, 9, 10]]) out += c.paint(c.blob(w / 2 + dx, cy + dy, r, r, { n: 9, j: 0.08 }), petal, { sw: 2, texture: false });
    out += c.paint(c.blob(w / 2, cy + 2, 5.5, 5.5), P.cream, { sw: 1.6, texture: false });
  }
  return out;
}

export const assets = [
  { key: 'house_a', dir: 'buildings', w: 280, h: 300, anchors: { door: [111, 246], peek: [140, 238] }, draw: (c) => house(c, { w: 280, h: 300, wall: '#F8BDAF', roof: P.coralDeep, kind: 'a' }) },
  { key: 'house_a_lit', dir: 'buildings', w: 280, h: 300, draw: (c) => windowPane(c, 46, 168, 54, 54, { round: true, lit: true }) + windowPane(c, 180, 166, 54, 50, { lit: true }) },
  { key: 'house_b', dir: 'buildings', w: 260, h: 290, anchors: { door: [101, 238], peek: [130, 232] }, draw: (c) => house(c, { w: 260, h: 290, wall: '#B9E1F2', roof: P.lavDeep, kind: 'b' }) },
  { key: 'house_b_lit', dir: 'buildings', w: 260, h: 290, draw: (c) => windowPane(c, 106, 62, 48, 48, { round: true, cross: false, lit: true }) + windowPane(c, 44, 146, 56, 54, { lit: true }) + windowPane(c, 132, 146, 56, 54, { lit: true }) },
  { key: 'house_c', dir: 'buildings', w: 220, h: 350, anchors: { door: [81, 297], peek: [110, 290] }, draw: (c) => house(c, { w: 220, h: 350, wall: '#FFE394', roof: P.tealDeep, kind: 'c' }) },
  { key: 'house_c_lit', dir: 'buildings', w: 220, h: 350, draw: (c) => windowPane(c, 88, 34, 44, 40, { round: true, cross: false, lit: true }) + [106, 176].map((y) => windowPane(c, 46, y, 46, 50, { lit: true }) + windowPane(c, 128, y, 46, 50, { lit: true })).join('') },
  { key: 'bakery', dir: 'buildings', w: 340, h: 310, anchors: { door: [225, 229], peek: [255, 224] }, draw: (c) => shop(c, { w: 340, h: 310, wall: '#FFF0D2', stripeA: P.coral, stripeB: P.white, kind: 'bakery' }) },
  { key: 'bakery_lit', dir: 'buildings', w: 340, h: 310, draw: (c) => c.paint(c.rect(34, 162, 160, 92, 6), LIT, { sw: 2.4, shade: '#F6C65A' }) },
  { key: 'florist', dir: 'buildings', w: 300, h: 290, anchors: { door: [205, 209], peek: [235, 204] }, draw: (c) => shop(c, { w: 300, h: 290, wall: '#D3EED7', stripeA: P.leafDeep, stripeB: P.cream, kind: 'florist' }) },
  { key: 'florist_lit', dir: 'buildings', w: 300, h: 290, draw: (c) => c.paint(c.rect(34, 162, 140, 92, 6), LIT, { sw: 2.4, shade: '#F6C65A' }) },
  { key: 'door_wood', dir: 'buildings', w: 58, h: 96, draw: (c) => door(c, 58, 96, P.woodDeep) },
  { key: 'door_shop', dir: 'buildings', w: 60, h: 100, draw: (c) => door(c, 60, 100, P.tealDeep, true) },
  { key: 'peek_kid', dir: 'characters', w: 46, h: 52, draw: (c) => peek(c, 46, 52, 'kid') },
  { key: 'peek_baker', dir: 'characters', w: 48, h: 58, draw: (c) => peek(c, 48, 58, 'baker') },
  { key: 'peek_cat', dir: 'characters', w: 46, h: 46, draw: (c) => peek(c, 46, 46, 'cat') },
  { key: 'car_red', dir: 'vehicles', w: 190, h: 100, anchors: { wheelA: [48, 84], wheelB: [142, 84] }, draw: (c) => car(c, 190, 100, '#F27E74') },
  { key: 'car_teal', dir: 'vehicles', w: 190, h: 100, anchors: { wheelA: [48, 84], wheelB: [142, 84] }, draw: (c) => car(c, 190, 100, P.teal) },
  { key: 'bus', dir: 'vehicles', w: 310, h: 150, anchors: { wheelA: [76, 122], wheelB: [234, 122] }, draw: (c) => bus(c, 310, 150) },
  { key: 'ice_cream_van', dir: 'vehicles', w: 230, h: 150, anchors: { wheelA: [60, 124], wheelB: [172, 124] }, draw: (c) => iceCreamVan(c, 230, 150) },
  { key: 'bike', dir: 'vehicles', w: 140, h: 130, anchors: { wheelA: [30, 108], wheelB: [110, 108] }, draw: (c) => bike(c, 140, 130) },
  { key: 'wheel_s', dir: 'vehicles', w: 44, h: 44, draw: (c) => vehicleWheel(c, 44) },
  { key: 'wheel_m', dir: 'vehicles', w: 54, h: 54, draw: (c) => vehicleWheel(c, 54) },
  { key: 'wheel_bike', dir: 'vehicles', w: 54, h: 54, draw: (c) => vehicleWheel(c, 54, { spokes: true }) },
  {
    key: 'traffic_light', dir: 'furniture', w: 70, h: 230, anchors: { red: [35, 34], amber: [35, 68], green: [35, 102] },
    draw: (c) => {
      let s = c.groundShadow(35, 224, 22, 5);
      s += c.paint(c.rect(29, 110, 12, 116, 5, 0.5), '#6B7A86', { sw: 2.4, texture: false });
      s += c.paint(c.rect(10, 8, 50, 122, 14), '#56656F', { shade: '#46535C' });
      for (const [y, col] of [[34, '#9A5A57'], [68, '#A08A55'], [102, '#5E8A64']]) s += c.paint(c.blob(35, y, 13, 13, { n: 10, j: 0.02 }), col, { sw: 2.2, texture: false });
      return s;
    },
  },
  ...[['lamp_red', '#FF7D6E'], ['lamp_amber', '#FFC85A'], ['lamp_green', '#7EDB86']].map(([key, col]) => ({
    key, dir: 'furniture', w: 44, h: 44,
    draw: (c) => `<circle cx="22" cy="22" r="21" fill="${col}" opacity=".35"/>` + c.paint(c.blob(22, 22, 13, 13, { n: 10, j: 0.02 }), col, { sw: 2.2, texture: false, hlOpacity: 0.6 }),
  })),
  {
    key: 'mailbox', dir: 'furniture', w: 90, h: 150, anchors: { flag: [80, 52] },
    draw: (c) => {
      let s = c.groundShadow(45, 144, 22, 5);
      s += c.paint(c.rect(38, 74, 14, 72, 4, 0.4), P.woodDeep, { sw: 2.4, texture: false });
      s += c.paint(c.poly([[8, 82], [8, 40], [45, 18], [82, 40], [82, 82]], { r: 10, rr: [6, 30, 30, 30, 6], j: 0.5 }), '#86B9EA', { shade: '#679ED6' });
      s += c.paint(c.rect(20, 46, 50, 30, 8, 0.4), '#9CC8F0', { sw: 2.2, texture: false });
      s += c.ink('M30 58 h30', { w: 3 });
      return s;
    },
  },
  {
    key: 'mailbox_open', dir: 'furniture', w: 90, h: 150, anchors: { flag: [80, 52] },
    draw: (c) => {
      let s = c.groundShadow(45, 144, 22, 5);
      s += c.paint(c.rect(38, 74, 14, 72, 4, 0.4), P.woodDeep, { sw: 2.4, texture: false });
      s += c.paint(c.poly([[8, 82], [8, 40], [45, 18], [82, 40], [82, 82]], { r: 10, rr: [6, 30, 30, 30, 6], j: 0.5 }), '#86B9EA', { shade: '#679ED6' });
      s += c.paint(c.rect(18, 40, 54, 38, 8, 0.4), '#3F4B63', { sw: 2.2, texture: false, highlight: false });
      s += c.paint(c.rect(26, 46, 34, 24, 3, 0.4), P.white, { sw: 2, texture: false });
      s += c.ink('M26 48 L43 60 L60 48', { w: 1.6 });
      s += c.paint(c.rect(12, 80, 66, 26, 8, 0.4), '#9CC8F0', { sw: 2.4, texture: false });
      return s;
    },
  },
  { key: 'mailbox_flag', dir: 'furniture', w: 16, h: 50, draw: (c) => c.paint(c.rect(5, 2, 6, 46, 3, 0.2), P.ink, { sw: 1.4, texture: false, highlight: false }) + c.paint(c.rect(4, 2, 12, 14, 3, 0.3), P.coralDeep, { sw: 1.8, texture: false }) },
  {
    key: 'streetlight', dir: 'furniture', w: 90, h: 290, anchors: { glow: [56, 40] },
    draw: (c) => {
      let s = c.groundShadow(30, 284, 22, 5);
      s += c.paint(c.rect(18, 270, 26, 16, 6, 0.4), '#56656F', { sw: 2.4, texture: false });
      s += c.ink(`M31 272 L31 50 Q31 22 56 26`, { w: 10, color: P.ink, opacity: 1 });
      s += c.ink(`M31 272 L31 50 Q31 22 56 26`, { w: 6, color: '#6B7A86', opacity: 1 });
      s += c.paint(c.poly([[40, 30], [72, 30], [64, 50], [48, 50]], { r: 6 }), '#56656F', { sw: 2.4, texture: false });
      s += c.paint(c.blob(56, 52, 10, 6), '#FFF3C4', { sw: 2.2, texture: false });
      return s;
    },
  },
  {
    key: 'bench', dir: 'furniture', w: 190, h: 96,
    draw: (c) => {
      let s = c.groundShadow(95, 90, 82, 6);
      for (const x of [26, 154]) s += c.paint(c.rect(x, 52, 12, 38, 4, 0.4), '#56656F', { sw: 2.2, texture: false });
      s += c.paint(c.rect(12, 8, 166, 18, 6), P.wood, { shade: P.woodDeep, sw: 2.6 });
      s += c.paint(c.rect(12, 30, 166, 16, 6), P.wood, { shade: P.woodDeep, sw: 2.6 });
      s += c.paint(c.rect(6, 50, 178, 18, 6), P.woodDeep, { sw: 2.6 });
      return s;
    },
  },
  {
    key: 'hydrant', dir: 'furniture', w: 64, h: 86,
    draw: (c) => {
      let s = c.groundShadow(32, 80, 22, 5);
      s += c.paint(c.rect(14, 26, 36, 54, 10), P.coralDeep, {});
      s += c.paint(c.blob(32, 24, 18, 12), P.coralDeep, { sw: 2.4 });
      s += c.paint(c.rect(4, 40, 56, 14, 6, 0.4), P.coral, { sw: 2.4, texture: false });
      s += c.paint(c.rect(24, 4, 16, 12, 4, 0.4), P.coral, { sw: 2.2, texture: false });
      s += c.face(32, 60, 0.7, { cheeks: false });
      return s;
    },
  },
  {
    key: 'flowerbed', dir: 'nature', w: 230, h: 64,
    draw: (c) => {
      let s = c.groundShadow(115, 58, 108, 6);
      s += c.paint(c.rect(6, 18, 218, 40, 12), P.woodDeep, { shade: P.woodDark });
      s += c.paint(c.blob(115, 20, 104, 12, { n: 14, j: 0.03 }), '#8A5E43', { sw: 2.4, texture: false, highlight: false });
      for (let x = 20; x < 220; x += 26) s += c.ink(`M${x} 32 v18`, { w: 1.6, opacity: 0.35 });
      return s;
    },
  },
  { key: 'flower_red', dir: 'nature', w: 50, h: 96, draw: (c) => flower(c, 50, 96, P.coral, 'tulip') },
  { key: 'flower_yellow', dir: 'nature', w: 56, h: 96, draw: (c) => flower(c, 56, 96, P.white, 'daisy') },
  { key: 'flower_blue', dir: 'nature', w: 50, h: 96, draw: (c) => flower(c, 50, 96, P.lavender, 'bell') },
  {
    key: 'treat_croissant', dir: 'toys', w: 70, h: 46,
    draw: (c) => c.paint(c.poly([[4, 34], [16, 10], [35, 4], [54, 10], [66, 34], [35, 42]], { r: 12 }), P.sunDeep, { shade: '#E19B3C' }) + c.ink('M22 14 q4 12 0 24 M35 8 v30 M48 14 q-4 12 0 24', { w: 2, opacity: 0.55 }),
  },
  {
    key: 'treat_cupcake', dir: 'toys', w: 56, h: 64,
    draw: (c) => c.paint(c.poly([[10, 34], [46, 34], [40, 62], [16, 62]], { r: 5 }), P.lavender, { sw: 2.4 }) + c.ink('M20 36 l3 24 M28 36 v24 M36 36 l-3 24', { w: 1.6, opacity: 0.5 }) + c.paint(c.blob(28, 26, 22, 14, { n: 10, j: 0.08 }), P.pink, { sw: 2.4 }) + c.paint(c.blob(28, 10, 6, 6), P.coralDeep, { sw: 2, texture: false }),
  },
  {
    key: 'treat_donut', dir: 'toys', w: 60, h: 60,
    draw: (c) => c.paint(c.blob(30, 30, 27, 26), P.wood, { shade: P.woodDeep }) + c.paint(c.blob(30, 28, 22, 20, { n: 12, j: 0.07 }), P.pink, { sw: 2.2 }) + c.paint(c.blob(30, 30, 8, 8), P.cream, { sw: 2.2, texture: false, highlight: false }) + [[18, 20, P.sky], [40, 22, P.sun], [22, 38, P.leaf], [40, 38, P.white]].map(([x, y, col]) => `<rect x="${x}" y="${y}" width="6" height="2.6" rx="1.3" fill="${col}" transform="rotate(${(x * 7) % 60} ${x} ${y})"/>`).join(''),
  },
  {
    key: 'treat_cookie', dir: 'toys', w: 56, h: 56,
    draw: (c) => c.paint(c.blob(28, 28, 25, 24, { n: 11, j: 0.06 }), '#E8B676', { shade: '#C99256' }) + [[18, 20], [34, 16], [26, 34], [38, 32], [16, 36]].map(([x, y]) => c.flat(c.blob(x, y, 3.6, 3, { n: 6 }), P.woodDark)).join(''),
  },
  { key: 'pip', dir: 'characters', w: 104, h: 200, anchors: { arm: [82, 92], blink: [52, 56] }, draw: (c) => person(c, 104, 200, { skin: P.skin2, hair: P.woodDark, coat: P.sun, legs: '#6C86C9', kind: 'kid' }) },
  { key: 'pip_arm', dir: 'characters', w: 24, h: 64, draw: (c) => arm(c, 24, 64, P.sun, P.skin2) },
  { key: 'pip_blink', dir: 'characters', w: 42, h: 14, draw: (c) => blink(c, 42, 14, P.skin2) },
  { key: 'nana', dir: 'characters', w: 110, h: 200, anchors: { arm: [87, 92], blink: [55, 56] }, draw: (c) => person(c, 110, 200, { skin: P.skin1, hair: '#D9D6E2', coat: P.lavender, legs: P.tealDeep, kind: 'nana' }) },
  { key: 'nana_arm', dir: 'characters', w: 24, h: 64, draw: (c) => arm(c, 24, 64, P.lavender, P.skin1) },
  { key: 'nana_blink', dir: 'characters', w: 46, h: 20, draw: (c) => blink(c, 46, 20, P.skin1, true) },
  { key: 'dog', dir: 'characters', w: 156, h: 100, anchors: { tail: [24, 46] }, draw: (c) => dog(c, 156, 100) },
  { key: 'dog_tail', dir: 'characters', w: 34, h: 34, draw: (c) => tail(c, 34, 34, '#EDBE86', 'dog') },
  { key: 'cat', dir: 'characters', w: 110, h: 100, anchors: { tail: [78, 84] }, draw: (c) => cat(c, 110, 100) },
  { key: 'cat_sleep', dir: 'characters', w: 120, h: 80, draw: (c) => cat(c, 120, 80, true) },
  { key: 'cat_tail', dir: 'characters', w: 40, h: 46, draw: (c) => tail(c, 40, 46, '#C4C0D6', 'cat') },
];

export { lighten };
