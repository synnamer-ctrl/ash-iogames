// Preview set: 20 hedgehog looks for the user to pick from. Not wired into the game.
// Run with `node scripts/art/hedgehog-variants.mjs`; writes assets-src/hedgehog-variants/*.svg and index.html.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ctx, svgDoc } from './lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'assets-src', 'hedgehog-variants');

const BASE = {
  body: '#7A5238', shade: '#4E3322', spike: '#4A2F20', spikeBack: '#3E2619', cap: '#F3E2C6',
  face: '#FBF1E0', faceShade: '#E2CDAE', mask: '#4E3322', ear: '#4E3322', earIn: '#F0A0A0',
  eyes: 'round', eyeCol: '#2B1B12', nose: '#2B1B12', blush: true, legs: '#FBF1E0',
  spikeLen: 19, spikes: 9, acc: null, accCol: '#E0474C', mask_on: true, chevrons: true, spikeCap: true,
};

// each entry overrides BASE; names are shown on the sheet
const VARIANTS = [
  { name: 'Classic chestnut', },
  { name: 'Honey gold', body: '#C9913E', shade: '#8E5E22', spike: '#6B4520', spikeBack: '#553616', cap: '#FFF1C9', face: '#FFF8E6', faceShade: '#EAD9B2', mask: '#6B4520', ear: '#6B4520' },
  { name: 'Dark chocolate', body: '#4A3024', shade: '#2A1A12', spike: '#2A1A12', spikeBack: '#1D120C', cap: '#E9C9A0', mask: '#1D120C', ear: '#1D120C' },
  { name: 'Silver grey', body: '#8A8A93', shade: '#55555E', spike: '#4B4B54', spikeBack: '#383840', cap: '#F2F2F4', face: '#F4F4F6', faceShade: '#CDCDD4', mask: '#3E3E46', ear: '#3E3E46', eyeCol: '#1E1E24', nose: '#1E1E24' },
  { name: 'Ginger', body: '#C2622E', shade: '#82361A', spike: '#7A3A1C', spikeBack: '#5C2A14', cap: '#FFD7A8', face: '#FFF0DE', faceShade: '#EDC9A4', mask: '#7A3A1C', ear: '#7A3A1C' },
  { name: 'Snow white', body: '#EFE8DA', shade: '#B7AD98', spike: '#A9A08E', spikeBack: '#8F8674', cap: '#FFFFFF', face: '#FFFDF7', faceShade: '#D9D0BC', mask: null, ear: '#B9A98F', earIn: '#F7B8B8', eyeCol: '#2B1B12', nose: '#D98A8A' },
  { name: 'Mint forest', body: '#5E8F6A', shade: '#33573D', spike: '#2D4A36', spikeBack: '#21382A', cap: '#CFEBD2', face: '#F4F9EC', faceShade: '#D2E2C2', mask: '#2D4A36', ear: '#2D4A36' },
  { name: 'Lavender dream', body: '#8E7BB8', shade: '#5A4C80', spike: '#4C3F6E', spikeBack: '#382E55', cap: '#EAE0FF', face: '#FBF8FF', faceShade: '#D9CDEE', mask: '#4C3F6E', ear: '#4C3F6E', earIn: '#FFB3D9' },
  { name: 'Ocean blue', body: '#4F86B8', shade: '#2D5A86', spike: '#2A4E74', spikeBack: '#1C3754', cap: '#BFE3FF', face: '#F2F9FF', faceShade: '#C8DDF0', mask: '#2A4E74', ear: '#2A4E74' },
  { name: 'Sunny yellow', body: '#E8B93A', shade: '#A97E1A', spike: '#8A6418', spikeBack: '#6A4B10', cap: '#FFF6C2', face: '#FFFBEA', faceShade: '#EEDFA8', mask: '#8A6418', ear: '#8A6418' },
  { name: 'Rose pink', body: '#D98AA0', shade: '#A4566E', spike: '#8E4862', spikeBack: '#6E3349', cap: '#FFE3EC', face: '#FFF6F9', faceShade: '#EFC9D6', mask: '#8E4862', ear: '#8E4862', earIn: '#FF9FBF' },
  { name: 'Happy eyes', eyes: 'happy' },
  { name: 'Sleepy', eyes: 'sleepy' },
  { name: 'Wink', eyes: 'wink' },
  { name: 'Bow tie', acc: 'bow' },
  { name: 'Red scarf', acc: 'scarf' },
  { name: 'Flower friend', acc: 'flower' },
  { name: 'Smart glasses', acc: 'glasses' },
  { name: 'Woolly hat', acc: 'hat' },
  { name: 'Long spikes', spikeLen: 22, spikes: 9, spikeCap: false },
];

function draw(c, o) {
  const cx = 58, cy = 48, rx = 34, ry = 21;
  let s = c.groundShadow(58, 71, 44, 4.5);
  const spikeAt = (a, len, col, capped) => {
    const bx = cx + Math.cos(a) * rx, by = cy + Math.sin(a) * ry;
    const d = a - 0.28;
    const tx = bx + Math.cos(d) * len, ty = by + Math.sin(d) * len;
    const nx = -Math.sin(d) * 4.8, ny = Math.cos(d) * 4.8;
    let r = c.paint(c.poly([[bx + nx, by + ny], [tx, ty], [bx - nx, by - ny]], { r: 1.2 }), col, { sw: 1.6, texture: false, highlight: false });
    if (capped) {
      const mx = bx + (tx - bx) * 0.7, my = by + (ty - by) * 0.7;
      r += c.flat(c.poly([[tx, ty], [mx + nx * 1.05, my + ny * 1.05], [mx - nx * 1.05, my - ny * 1.05]], { r: 0.8 }), o.cap, 0.95);
    }
    return r;
  };
  const span = 0.98;
  for (let i = 0; i < o.spikes; i++) s += spikeAt(Math.PI * (1.12 + (i / (o.spikes - 1)) * span), o.spikeLen + (i % 2) * 2, o.spikeBack, o.spikeCap);
  for (let i = 0; i < o.spikes - 1; i++) s += spikeAt(Math.PI * (1.17 + (i / (o.spikes - 2)) * (span - 0.06)), o.spikeLen - 3 + (i % 2) * 2, o.spike, o.spikeCap);
  for (const x of [36, 76]) {
    s += c.paint(c.rect(x - 6, 56, 12, 13, 5, 0.2), o.legs, { sw: 2, texture: false, shade: o.faceShade });
    for (const dx of [-3.5, 0, 3.5]) s += `<ellipse cx="${x + dx}" cy="69" rx="1.6" ry="2" fill="${o.eyeCol}"/>`;
  }
  s += c.paint(c.blob(cx, cy, rx, ry, { n: 14, j: 0.02 }), o.body, { shade: o.shade, sw: 2.4 });
  s += c.flat(c.blob(48, 36, 20, 5, { n: 10 }), '#FFFFFF', 0.08);
  if (o.chevrons) for (let i = 0; i < 6; i++) s += c.ink(`M${26 + i * 8} ${52 + (i % 2) * 4} l3 -3 l3 3`, { w: 1.2, color: o.shade, opacity: 0.5 });
  s += c.paint(c.blob(88, 50, 16, 14, { n: 12, j: 0.025 }), o.face, { shade: o.faceShade, sw: 2.2 });
  for (let i = 0; i < 4; i++) s += spikeAt(Math.PI * (1.22 + i * 0.1), 12, o.spike, o.spikeCap);
  if (o.mask) s += c.flat(c.blob(87, 42, 8, 7, { n: 10, j: 0.03 }), o.mask, 0.95);
  s += c.paint(c.blob(74, 36, 6, 6, { n: 10 }), o.ear, { sw: 1.8, texture: false, highlight: false });
  s += c.flat(c.blob(74, 36, 3.4, 3.4, { n: 8 }), o.earIn, 0.95);
  // eyes
  if (o.eyes === 'happy') s += c.ink('M87 41 q3 -4 6 0', { w: 1.8, color: o.eyeCol });
  else if (o.eyes === 'sleepy') s += c.ink('M87 42 q3 2.5 6 0', { w: 1.8, color: o.eyeCol });
  else if (o.eyes === 'wink') s += c.ink('M87 42 q3 2.5 6 0', { w: 1.8, color: o.eyeCol }) + `<ellipse cx="91" cy="43" rx="2.6" ry="3.2" fill="${o.eyeCol}"/><circle cx="92" cy="42" r="1" fill="#fff"/>`;
  else s += `<ellipse cx="91" cy="43" rx="3.4" ry="4.2" fill="${o.eyeCol}"/><circle cx="92.1" cy="41.6" r="1.25" fill="#fff"/>`;
  if (o.blush) s += `<ellipse cx="86" cy="53" rx="3.4" ry="2.2" fill="#F0A0A0" opacity=".6"/>`;
  s += c.ink('M97 55 q3.5 2.6 6.5 -1', { w: 1.5, color: o.eyeCol, opacity: 0.85 });
  s += `<circle cx="105" cy="49" r="3.2" fill="${o.nose}"/><circle cx="104" cy="47.8" r="1" fill="#fff"/>`;
  for (const x of [54, 94]) {
    s += c.paint(c.blob(x, 65, 8, 5.5), o.legs, { sw: 1.9, texture: false, shade: o.faceShade });
    for (const dx of [-3.5, 0, 3.5]) s += `<ellipse cx="${x + dx}" cy="70" rx="1.6" ry="2.1" fill="${o.eyeCol}"/>`;
  }
  // accessories
  const A = o.accCol;
  if (o.acc === 'bow') s += `<path d="M66 20 l-7 -5 v10 z M66 20 l7 -5 v10 z" fill="${A}" stroke="${P_INK}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="66" cy="20" r="1.6" fill="${P_INK}"/>`;
  if (o.acc === 'scarf') s += `<path d="M68 42 q8 6 18 2 l1 6 q-10 4 -20 -2 z" fill="${A}" stroke="${P_INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M80 48 l3 10 l-5 1 l-1 -9 z" fill="${A}" stroke="${P_INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  if (o.acc === 'flower') s += [0, 72, 144, 216, 288].map((d) => { const r = (d * Math.PI) / 180; return `<circle cx="${(80 + Math.cos(r) * 4).toFixed(1)}" cy="${(18 + Math.sin(r) * 4).toFixed(1)}" r="3" fill="#FFD0E0" stroke="${P_INK}" stroke-width="0.9"/>`; }).join('') + `<circle cx="80" cy="18" r="2.4" fill="#F7C23B"/>`;
  if (o.acc === 'glasses') s += `<circle cx="91" cy="43" r="5.4" fill="none" stroke="${P_INK}" stroke-width="1.4"/><path d="M85.6 42 h-3" stroke="${P_INK}" stroke-width="1.4"/>`;
  if (o.acc === 'hat') s += `<path d="M79 36 q-1 -12 9 -12 q10 0 9 12 z" fill="${A}" stroke="${P_INK}" stroke-width="1.2" stroke-linejoin="round"/><rect x="77" y="35" width="24" height="4" rx="2" fill="${A}" stroke="${P_INK}" stroke-width="1.2"/>`;
  return s;
}
const P_INK = '#2B1B12';

mkdirSync(out, { recursive: true });
const cards = [];
VARIANTS.forEach((v, i) => {
  const o = { ...BASE, ...v };
  const c = new Ctx(`hedgehog_v${i + 1}`);
  const body = draw(c, o);
  const num = String(i + 1).padStart(2, '0');
  const file = `hh-${num}.svg`;
  writeFileSync(join(out, file), svgDoc(110, 74, body, {}));
  cards.push(`<figure><img src="${file}" alt="${v.name}"><figcaption><b>${num}</b> ${v.name}</figcaption></figure>`);
});
writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Hedgehog looks</title>
<style>body{margin:0;padding:16px;background:#E9F6DA;font:15px system-ui,sans-serif;color:#2B1B12}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
figure{margin:0;background:#CFE9A8;border-radius:14px;padding:10px;text-align:center}
img{width:100%;height:auto;display:block}figcaption{margin-top:6px}</style>
<h2>Pick a hedgehog (1–20)</h2><div class="grid">${cards.join('')}</div>`);
console.log(`Wrote ${VARIANTS.length} hedgehog variants to ${out}`);
