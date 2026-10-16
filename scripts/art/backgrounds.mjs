import { P, darken, lighten, paperGrainDefs, fmt as f } from './lib.mjs';
import layout from '../../src/data/world-layout.json' with { type: 'json' };
import { shared } from './shared.mjs';
import { assets as town } from './town.mjs';
import { assets as garden } from './garden.mjs';
import { assets as workshop } from './workshop.mjs';
import { assets as build } from './build.mjs';

const ALL = [...shared, ...town, ...garden, ...workshop, ...build];
const spec = (k) => {
  const s = ALL.find((a) => a.key === k);
  if (!s) throw new Error('No asset ' + k);
  return s;
};
/** Place another illustration (drawn with the same context) centred at x,y. */
function place(c, key, x, y, scale = 1, { opacity = 1, flip = false } = {}) {
  const s = spec(key);
  const sx = flip ? -scale : scale;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${sx} ${scale}) translate(${-s.w / 2} ${-s.h / 2})" opacity="${opacity}">${s.draw(c)}</g>`;
}

const { w: W, h: H, bleedX: BX, bleedY: BY } = layout.world;
const FW = W + BX * 2, FH = H + BY * 2;

function wave(c, y, amp, len, x0 = -BX - 20, x1 = W + BX + 20, bottom = H + BY + 20) {
  const pts = [];
  for (let x = x0; x < x1; x += len / 4) pts.push([x, y + Math.sin((x / len) * Math.PI * 2 + c.rand(0, 0.4)) * amp + c.jit(amp * 0.25)]);
  pts.push([x1 + 40, y]);
  let d = `M${f(x0)} ${f(bottom)} L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [x, y2] = pts[i];
    d += ` Q${f(px + (x - px) / 2)} ${f(py + c.jit(2))} ${f((px + x) / 2 + (x - px) / 2)} ${f(y2)}`;
  }
  d += ` L${f(x1 + 40)} ${f(bottom)} Z`;
  return d;
}

function texture(c, x, y, w, h, color, opacity, density = 0.25, angle = -30) {
  return c.pencil({ x, y, w, h }, { color, opacity, density, angle, width: 2 });
}

function grassTufts(c, x0, x1, y0, y1, n, color = P.leafDeep) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = c.rand(x0, x1), y = c.rand(y0, y1);
    s += c.ink(`M${f(x - 6)} ${f(y)} q2 -9 4 -12 M${f(x)} ${f(y)} q0 -10 2 -15 M${f(x + 6)} ${f(y)} q-1 -8 -3 -11`, { w: 2, color, opacity: 0.55 });
  }
  return s;
}

function tinyFlowers(c, x0, x1, y0, y1, n) {
  let s = '';
  const cols = [P.white, P.pink, P.sun, P.lavender];
  for (let i = 0; i < n; i++) {
    const x = c.rand(x0, x1), y = c.rand(y0, y1), col = cols[i % cols.length];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      s += `<circle cx="${f(x + Math.cos(a) * 3.6)}" cy="${f(y + Math.sin(a) * 3.6)}" r="2.6" fill="${col}"/>`;
    }
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="2" fill="${P.sunDeep}"/>`;
  }
  return s;
}

function sky(c, color = P.sky) {
  let s = `<rect x="${-BX}" y="${-BY}" width="${FW}" height="${FH}" fill="${color}"/>`;
  s += texture(c, -BX, -BY, FW, 700, lighten(color, 0.5), 0.25, 0.12, -12);
  // soft painted background clouds
  for (const [x, y, sc] of [[180, 120, 1.1], [760, 70, 0.8], [1350, 150, 1]]) {
    s += `<g opacity=".35">${c.flat(c.blob(x, y, 120 * sc, 26 * sc), P.white)}${c.flat(c.blob(x - 30 * sc, y - 18 * sc, 60 * sc, 30 * sc), P.white)}${c.flat(c.blob(x + 40 * sc, y - 14 * sc, 50 * sc, 26 * sc), P.white)}</g>`;
  }
  return s;
}

function hills(c, baseY) {
  let s = '';
  s += c.flat(wave(c, baseY - 90, 40, 700), '#D7CEF2');
  s += c.flat(wave(c, baseY - 40, 34, 520), '#C9E7C4');
  s += texture(c, -BX, baseY - 80, FW, 120, P.white, 0.22, 0.12, -20);
  return s;
}

function background(name, draw) {
  return {
    key: `bg_${name}`, dir: 'backgrounds', w: FW, h: FH,
    defs: () => paperGrainDefs('grain', 0.1),
    draw: (c) => `<g transform="translate(${BX} ${BY})">${draw(c)}</g><rect width="${FW}" height="${FH}" filter="url(#grain)"/>`,
  };
}

function townScene(c) {
  const L = layout.town;
  let s = sky(c);
  s += hills(c, 560);
  // distant little town silhouettes
  for (let i = 0; i < 14; i++) {
    const x = -150 + i * 140 + c.jit(30), hh = 50 + c.rand(0, 40), ww = 50 + c.rand(0, 30);
    const roofCol = '#C3B7EA';
    s += c.flat(c.rect(x, 520 - hh, ww, hh + 40, 4, 0.6), '#D9D0F5');
    s += c.flat(c.poly([[x - 6, 524 - hh], [x + ww / 2, 490 - hh], [x + ww + 6, 524 - hh]], { r: 4 }), roofCol);
    s += `<rect x="${f(x + ww / 2 - 6)}" y="${f(540 - hh)}" width="12" height="12" rx="3" fill="#F2EEFF" opacity=".8"/>`;
  }
  // meadow
  s += c.flat(wave(c, 545, 10, 400), P.grass);
  s += texture(c, -BX, 545, FW, 160, P.leafDeep, 0.16, 0.25);
  s += grassTufts(c, -BX, W + BX, 570, 680, 50);
  for (const x of [-120, 1700]) s += place(c, 'tree_pine', x, 470, 0.9, { opacity: 0.9 });
  // upper sidewalk
  const sw = L.sidewalkTop;
  s += c.paint(c.rect(-BX - 20, sw, FW + 40, L.road.y - sw + 6, 4, 1.4), '#EFE3CC', { shade: '#E0D2B7', sw: 3, highlight: false, density: 0.25 });
  for (let x = -BX; x < W + BX; x += 120) s += c.ink(c.line([[x, sw + 6], [x - 8, L.road.y]]), { w: 1.6, opacity: 0.25 });
  s += c.flat(c.rect(-BX - 20, L.road.y - 12, FW + 40, 14, 4, 0.8), '#D2C3A6');
  // road
  const r = L.road;
  s += c.paint(c.rect(r.x - 20, r.y, r.w + 40, r.h, 4, 1.2), '#A3A9BE', { shade: '#8F95AB', sw: 3, highlight: false, pencilOpacity: 0.12, density: 0.4 });
  const mid = r.y + r.h / 2;
  for (let x = -BX; x < W + BX; x += 110) {
    if (Math.abs(x - L.crosswalkX) < 90) continue;
    s += c.paint(c.rect(x, mid - 5, 56, 10, 5, 0.3), P.cream, { sw: 0, stroke: false, texture: false, highlight: false });
  }
  for (let i = 0; i < 6; i++) s += c.paint(c.rect(L.crosswalkX - 60 + i * 22, r.y + 12, 13, r.h - 24, 4, 0.5), P.white, { stroke: false, texture: false, highlight: false });
  // lower sidewalk + grass
  const ls = L.lowerSidewalk;
  s += c.flat(c.rect(-BX - 20, ls - 2, FW + 40, 12, 4, 0.8), '#D2C3A6');
  s += c.paint(c.rect(-BX - 20, ls + 8, FW + 40, 52, 4, 1.4), '#EFE3CC', { shade: '#E0D2B7', sw: 3, highlight: false, density: 0.2 });
  s += c.flat(wave(c, ls + 58, 6, 300), P.grass);
  s += texture(c, -BX, ls + 60, FW, 200, P.leafDeep, 0.14, 0.2);
  s += grassTufts(c, -BX, W + BX, ls + 80, H + BY - 10, 40);
  s += tinyFlowers(c, -BX, W + BX, ls + 80, H + BY - 20, 40);
  s += tinyFlowers(c, -BX, W + BX, 580, 680, 26);
  // a row of little bushes along the upper sidewalk
  for (let x = 40; x < W; x += 210) s += place(c, 'bush_plain', x + c.jit(20), 548, 0.55);
  return s;
}

function gardenScene(c) {
  const L = layout.garden;
  let s = sky(c);
  s += hills(c, 520);
  // a wooden fence along the back of the garden
  const fy = L.meadowTop - 10;
  s += c.flat(wave(c, L.meadowTop, 12, 420), P.grass);
  for (let x = -BX + 10; x < 760; x += 46) {
    s += c.paint(c.poly([[x, fy + 40], [x, fy - 26], [x + 15, fy - 40], [x + 30, fy - 26], [x + 30, fy + 40]], { r: 5 }), '#F4E6CE', { shade: '#E4D0AE', sw: 2.4, highlight: false, density: 0.3 });
  }
  s += c.paint(c.rect(-BX, fy - 10, 960, 14, 4), '#E8D6B6', { sw: 2.4, texture: false, highlight: false });
  s += texture(c, -BX, L.meadowTop, FW, 700, P.leafDeep, 0.14, 0.22);
  // stream from the hills into the pond
  const p = L.pond;
  const stream = c.poly([[1560, 470], [1620, 470], [1520, 600], [1400, 690], [1300, 730], [1180, 720], [1260, 680], [1400, 620], [1500, 530]], { r: 30, j: 2 });
  s += c.paint(stream, P.water, { shade: P.waterDeep, sw: 3, highlight: false, pencilOpacity: 0.3 });
  // pond
  const pondEdge = c.blob(p.cx, p.cy, p.rx + 22, p.ry + 16, { n: 16, j: 0.03 });
  s += c.paint(pondEdge, '#D8CDB8', { shade: '#C2B59C', sw: 3, highlight: false });
  const pond = c.blob(p.cx, p.cy, p.rx, p.ry, { n: 16, j: 0.025 });
  s += c.paint(pond, P.water, { shade: P.waterDeep, hlOpacity: 0.35, pencilOpacity: 0.35 });
  for (const [dx, dy, rx] of [[-120, -20, 60], [60, 30, 80], [150, -40, 40]]) s += c.ink(c.blob(p.cx + dx, p.cy + dy, rx, rx * 0.25, { n: 10, j: 0.03 }).d, { w: 2.2, color: P.white, opacity: 0.6 });
  // stones and reeds around the pond
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    const x = p.cx + Math.cos(a) * (p.rx + 24), y = p.cy + Math.sin(a) * (p.ry + 18);
    s += c.paint(c.blob(x, y, 16 + c.rand(0, 8), 10 + c.rand(0, 4)), i % 3 ? P.stone : '#BEB6C9', { sw: 2.2, texture: false });
  }
  for (const x of [p.cx - p.rx - 20, p.cx + p.rx + 30]) {
    for (let k = 0; k < 4; k++) {
      const xx = x + k * 12 - 18, top = p.cy - 70 - c.rand(0, 40);
      s += c.ink(`M${f(xx)} ${p.cy + 10} Q${f(xx + 4)} ${f((top + p.cy) / 2)} ${f(xx + c.jit(6))} ${f(top)}`, { w: 3.2, color: P.leafDark, opacity: 0.9 });
      if (k % 2 === 0) s += c.paint(c.rect(xx - 5 + c.jit(3), top - 6, 10, 26, 5, 0.3), P.woodDeep, { sw: 2, texture: false, highlight: false });
    }
  }
  // stepping-stone path
  for (let i = 0; i < 6; i++) s += c.paint(c.blob(260 + i * 120, 960 - i * 14 + c.jit(8), 34, 16), '#E8DFCF', { sw: 2.4, texture: false, highlight: false });
  s += grassTufts(c, -BX, W + BX, 560, H + BY - 10, 90);
  s += tinyFlowers(c, -BX, 900, 560, 700, 30);
  s += tinyFlowers(c, -BX, W + BX, 930, H + BY - 20, 30);
  s += place(c, 'tree_pine', -60, 380, 0.85, { opacity: 0.95 });
  return s;
}

function workshopScene(c) {
  const pp = layout.workshop.paper;
  let s = `<rect x="${-BX}" y="${-BY}" width="${FW}" height="${FH}" fill="#E6BE8A"/>`;
  // wide table planks seen from above
  for (let y = -BY; y < H + BY; y += 125) {
    s += c.ink(c.line([[-BX, y], [W + BX, y + c.jit(4)]], { j: 1.5, step: 60 }), { w: 3, color: '#B98552', opacity: 0.55 });
    s += texture(c, -BX, y, FW, 125, '#C99A64', 0.22, 0.14, -4);
    for (let k = 0; k < 4; k++) {
      const x = c.rand(-BX, W + BX), yy = y + c.rand(20, 100);
      s += c.ink(c.line([[x, yy], [x + c.rand(80, 220), yy + c.jit(4)]], { j: 1, step: 30 }), { w: 1.6, color: '#B98552', opacity: 0.35 });
    }
  }
  // a big green cutting mat under the paper
  s += c.paint(c.rect(pp.x - 70, pp.y - 60, pp.w + 140, pp.h + 120, 26), '#A9D7B9', { shade: '#8CC3A1', sw: 3, highlight: false, density: 0.25 });
  for (let x = pp.x - 40; x < pp.x + pp.w + 60; x += 40) s += c.ink(`M${x} ${pp.y - 52} v12 M${x} ${pp.y + pp.h + 40} v12`, { w: 1.6, color: P.white, opacity: 0.6 });
  for (let y = pp.y - 20; y < pp.y + pp.h + 30; y += 40) s += c.ink(`M${pp.x - 62} ${y} h12 M${pp.x + pp.w + 50} ${y} h12`, { w: 1.6, color: P.white, opacity: 0.6 });
  // paper shadow (the paper itself is drawn live by the game)
  s += c.flat(c.rect(pp.x + 8, pp.y + 12, pp.w, pp.h, 8, 1), P.ink, 0.16);
  // doodles on the desk corners
  s += c.ink('M60 900 q20 -30 40 0 t40 0 t40 0', { w: 3, color: P.coralDeep, opacity: 0.5 });
  s += c.ink(c.star(1500, 920, 26, 12).d, { w: 3, color: P.lavDeep, opacity: 0.5 });
  s += c.ink(c.heart(90, 80, 22).d, { w: 3, color: P.coralDeep, opacity: 0.45 });
  // desk clutter kept outside the paper: a ruler, shavings, paper scraps and crayon marks
  s += c.paint(c.rect(-60, 330, 330, 48, 8), '#F4E9C8', { shade: '#DCCD9E', sw: 2.6, texture: false, highlight: false });
  for (let x = -40; x < 260; x += 30) s += c.ink(`M${x} 330 v${x % 60 ? 14 : 22}`, { w: 2.4, color: P.inkSoft, opacity: 0.6 });
  for (const [x, y, r, col] of [[1420, 220, -0.4, P.pink], [1450, 280, 0.3, P.sky], [60, 560, 0.6, P.sun], [110, 610, -0.2, P.leaf], [1400, 620, 0.9, P.coral]]) {
    s += c.paint(c.rect(x - 36, y - 26, 72, 50, 4, 0.6), col, { sw: 2.6, texture: false, highlight: false });
  }
  for (const [x, y] of [[1500, 470], [1540, 548]]) s += c.paint(c.poly([[x - 40, y], [x, y - 14], [x + 40, y], [x, y + 14]], { r: 4 }), P.wood, { sw: 2.6, texture: false, highlight: false });
  s += c.ink('M1180 760 q30 -10 60 4 t60 -2 t50 6', { w: 5, color: P.lavDeep, opacity: 0.45 });
  s += c.ink('M-30 720 q40 14 80 -6 t80 4', { w: 4, color: P.leafDeep, opacity: 0.4 });
  return s;
}

function buildScene(c) {
  const fy = layout.build.floorY;
  // wallpaper with little painted dots and stripes
  let s = `<rect x="${-BX}" y="${-BY}" width="${FW}" height="${FH}" fill="#CFE8F2"/>`;
  for (let x = -BX; x < W + BX; x += 80) s += `<rect x="${x}" y="${-BY}" width="36" height="${fy + BY}" fill="#DCEFF6"/>`;
  for (let x = -BX + 18; x < W + BX; x += 80) for (let y = -BY + 30; y < fy; y += 90) s += `<circle cx="${x + ((y / 90) % 2 ? 40 : 0)}" cy="${y}" r="4" fill="${P.white}" opacity=".8"/>`;
  s += texture(c, -BX, -BY, FW, fy + BY, P.white, 0.18, 0.12, -12);
  // window with a sunny view
  s += c.paint(c.rect(1080, 90, 340, 260, 20), '#F7EAD3', { shade: '#E7D3B0', sw: 3.2 });
  s += c.paint(c.rect(1100, 110, 300, 220, 12), P.sky, { shade: P.skyDeep, hlOpacity: 0.4 });
  s += c.flat(c.blob(1250, 330, 190, 50), P.grass);
  s += place(c, 'sun_face', 1340, 170, 0.45);
  s += c.ink('M1250 114 v214 M1104 220 h292', { w: 7, color: '#F7EAD3', opacity: 1 }) + c.ink('M1250 114 v214 M1104 220 h292', { w: 2, opacity: 0.6 });
  // paper bunting across the wall (decoration only)
  const flags = [P.coral, P.sun, P.leaf, P.sky, P.lavender];
  s += c.ink('M-60 120 Q260 210 560 120 Q760 70 980 130', { w: 3, opacity: 0.7 });
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const x = -40 + t * 1000;
    const y = x < 560 ? 120 + Math.sin(((x + 60) / 620) * Math.PI) * 52 : 120 - Math.sin(((x - 560) / 420) * Math.PI) * 24;
    s += c.paint(c.poly([[x - 22, y], [x + 22, y], [x, y + 46]], { r: 4, j: 0.6 }), flags[i % flags.length], { sw: 2.4, texture: false });
  }
  // a framed crayon drawing
  s += c.paint(c.rect(140, 300, 220, 170, 10), P.woodDeep, { shade: P.woodDark });
  s += c.paint(c.rect(156, 316, 188, 138, 6), P.white, { highlight: false, shade: '#EEE6D6' });
  s += c.ink('M176 430 L216 360 L256 420 L286 380 L326 430', { w: 5, color: P.leafDeep, opacity: 0.85 });
  s += c.ink(c.blob(300, 350, 16, 16).d, { w: 5, color: P.sunDeep, opacity: 0.9 });
  // skirting board + floor
  s += c.paint(c.rect(-BX - 20, fy - 30, FW + 40, 36, 4, 1), P.white, { shade: '#E8E1D2', sw: 3, highlight: false });
  s += `<rect x="${-BX}" y="${fy}" width="${FW}" height="${H + BY - fy}" fill="${P.wood}"/>`;
  for (let y = fy + 30; y < H + BY; y += 40) s += c.ink(c.line([[-BX, y], [W + BX, y]], { j: 1, step: 80 }), { w: 2, color: P.woodDeep, opacity: 0.55 });
  s += texture(c, -BX, fy, FW, H + BY - fy, P.woodDeep, 0.2, 0.3, -4);
  // a round rug
  s += c.paint(c.blob(800, fy + 60, 420, 46, { n: 18, j: 0.02 }), P.lavender, { shade: P.lavDeep, sw: 3, highlight: false });
  s += c.ink(c.blob(800, fy + 58, 380, 34, { n: 18, j: 0.02 }).d, { w: 3, color: P.white, opacity: 0.6 });
  return s;
}

function card(name, draw) {
  return {
    key: `card_${name}`, dir: 'ui', w: 640, h: 420,
    defs: () => paperGrainDefs('grain', 0.08),
    draw: (c) => {
      const id = c.uid('card');
      const frame = c.rect(6, 6, 628, 408, 36, 1);
      return `<clipPath id="${id}"><path d="${frame.d}"/></clipPath><g clip-path="url(#${id})">${draw(c)}<rect width="640" height="420" filter="url(#grain)"/></g>` + c.ink(frame, { w: 4 });
    },
  };
}

export const assets = [
  background('town', townScene),
  background('garden', gardenScene),
  background('workshop', workshopScene),
  background('build', buildScene),
  card('town', (c) => {
    let s = `<rect width="640" height="420" fill="${P.sky}"/>`;
    s += c.flat(c.blob(320, 330, 420, 110), '#C9E7C4');
    s += c.flat(c.rect(-20, 330, 680, 120, 4), '#A3A9BE');
    for (let x = 0; x < 640; x += 90) s += `<rect x="${x}" y="372" width="46" height="8" rx="4" fill="${P.cream}"/>`;
    s += c.flat(c.rect(-20, 312, 680, 22, 4), '#EFE3CC');
    s += place(c, 'sun_rays', 560, 70, 0.55) + place(c, 'sun_face', 560, 70, 0.55);
    s += place(c, 'cloud_b', 150, 70, 0.7);
    s += place(c, 'house_a', 150, 175, 0.9) + place(c, 'bakery', 400, 168, 0.85) + place(c, 'tree_round', 575, 210, 0.6);
    s += place(c, 'car_red', 300, 368, 0.9) + place(c, 'wheel_s', 300 - 42.3, 368 + 30.6, 0.9) + place(c, 'wheel_s', 300 + 42.3, 368 + 30.6, 0.9);
    s += place(c, 'dog', 560, 300, 0.6);
    return s;
  }),
  card('garden', (c) => {
    let s = `<rect width="640" height="420" fill="${P.sky}"/>`;
    s += c.flat(c.blob(320, 360, 460, 170), P.grass);
    s += place(c, 'rainbow', 330, 230, 0.6, { opacity: 0.9 });
    s += c.paint(c.blob(440, 350, 150, 48), P.water, { shade: P.waterDeep });
    s += place(c, 'duck', 450, 335, 0.7) + place(c, 'lily_pad', 370, 365, 0.7);
    s += place(c, 'plant_bloom_sun', 120, 270, 0.9) + place(c, 'plant_bloom_tulip', 210, 300, 0.8) + place(c, 'rabbit', 290, 330, 0.8);
    s += place(c, 'butterfly_pink', 200, 150, 0.9) + place(c, 'cloud_a', 520, 70, 0.6) + place(c, 'mushroom_red', 60, 370, 0.7);
    return s;
  }),
  card('workshop', (c) => {
    let s = `<rect width="640" height="420" fill="#E6BE8A"/>`;
    s += c.paint(c.rect(70, 50, 440, 320, 14), P.white, { shade: '#EDE6D8', sw: 3 });
    s += c.ink('M110 300 q60 -140 120 -40 t120 -60 t100 40', { w: 12, color: P.coral, opacity: 0.9 });
    s += c.ink('M120 120 q40 40 90 0 t90 0', { w: 10, color: P.skyDeep, opacity: 0.9 });
    s += c.ink('M330 300 q30 -30 60 0 t60 0', { w: 8, color: P.leafDeep, opacity: 0.9 });
    s += place(c, 'sticker_star', 420, 130, 0.8) + place(c, 'sticker_whale', 220, 220, 0.7) + place(c, 'tape', 100, 60, 0.7) + place(c, 'tape', 480, 60, 0.7);
    s += place(c, 'jar_brushes', 575, 270, 0.85) + place(c, 'palette', 560, 375, 0.6);
    return s;
  }),
  card('build', (c) => {
    let s = `<rect width="640" height="420" fill="#CFE8F2"/>`;
    for (let x = 0; x < 640; x += 60) s += `<rect x="${x}" y="0" width="28" height="330" fill="#DCEFF6"/>`;
    s += `<rect x="0" y="330" width="640" height="90" fill="${P.wood}"/>`;
    s += c.ink('M0 370 h640', { w: 2, color: P.woodDeep, opacity: 0.6 });
    s += place(c, 'ramp', 140, 260, 0.8) + place(c, 'ball_beach', 70, 170, 0.6);
    s += place(c, 'block_blue', 380, 300, 0.75) + place(c, 'block_red', 440, 300, 0.75) + place(c, 'block_long', 410, 255, 0.6) + place(c, 'block_yellow', 410, 210, 0.75) + place(c, 'block_tri', 410, 160, 0.6);
    s += place(c, 'toy_car', 270, 320, 0.7) + place(c, 'wheel_toy', 270 - 28.7, 320 + 16.8, 0.7) + place(c, 'wheel_toy', 270 + 28.7, 320 + 16.8, 0.7);
    s += place(c, 'pinwheel', 560, 140, 0.7) + place(c, 'pinwheel_stick', 560, 250, 0.7);
    s += place(c, 'ball_red', 520, 310, 0.8);
    return s;
  }),
];
