// Development-only review gallery for hand-drawn sources. Not part of the game build.
// Usage: node scripts/art/build-gallery.mjs  → scripts/art/gallery/index.html
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSamples, validateSvg } from './validate-samples.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = join(root, 'assets-src', 'samples');
const cards = listSamples(dir).map((f) => {
  const text = readFileSync(join(dir, f), 'utf8');
  const { problems, viewBox } = validateSvg(text);
  const [, , w, h] = (viewBox ?? '0 0 0 0').split(/\s+/);
  const name = f.replace(/\.svg$/, '');
  const status = problems.length ? `FAIL: ${problems.join('; ')}` : 'valid';
  // inline the SVG so the gallery works offline and shows exact outlines
  return `<figure class="card"><div class="stage" data-zoom="1">${text.replace(/^<\?xml[^>]*>\s*/, '')}</div>
  <figcaption><b>${name}</b><span>${f} · SVG · viewBox ${w}×${h}</span><em class="${problems.length ? 'bad' : 'ok'}">${status}</em></figcaption></figure>`;
});
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Asset review gallery (dev only)</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font: 14px system-ui, sans-serif; background: #e9e9ec; color: #222; }
  header { padding: 14px 18px; background: #fff; border-bottom: 1px solid #ddd; position: sticky; top: 0; z-index: 2; display: flex; gap: 16px; align-items: center; }
  header h1 { font-size: 16px; margin: 0; }
  header label { display: flex; gap: 6px; align-items: center; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--cell, 300px), 1fr)); gap: 14px; padding: 16px; }
  .card { margin: 0; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px #0002; }
  .stage { background: repeating-conic-gradient(#f4f4f6 0 25%, #fff 0 50%) 0 0/20px 20px; display: grid; place-items: center; padding: 10px; height: var(--cell, 300px); }
  .stage svg { max-width: 100%; max-height: 100%; width: auto; height: auto; }
  figcaption { display: grid; gap: 2px; padding: 10px 12px; }
  figcaption b { font-size: 15px; }
  figcaption span { color: #666; font-size: 12px; }
  figcaption em { font-style: normal; font-size: 12px; font-weight: 600; }
  .ok { color: #2a7a3a; } .bad { color: #b02a2a; }
  body.zoom-s { --cell: 200px; } body.zoom-l { --cell: 460px; }
</style></head><body>
<header><h1>Little Wonder World — asset review (dev only)</h1>
<label>Preview size
  <select onchange="document.body.className=this.value">
    <option value="zoom-s">Small (in-game scale)</option>
    <option value="" selected>Medium</option>
    <option value="zoom-l">Large (outlines)</option>
  </select></label>
<span>${cards.length} samples</span></header>
<main>${cards.join('\n')}</main></body></html>`;
writeFileSync(join(root, 'scripts', 'art', 'gallery', 'index.html'), html);
console.log(`Gallery written with ${cards.length} samples.`);
