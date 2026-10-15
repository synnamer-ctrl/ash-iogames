// Renders a contact sheet of all generated assets (dev tool).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2] || 'preview.png';
const filter = process.argv[3] ? new RegExp(process.argv[3]) : null;
const src = readFileSync('src/data/asset-manifest.ts', 'utf8');
const json = src.slice(src.indexOf('= {') + 2, src.lastIndexOf('} as const') + 1);
const m = JSON.parse(json);
const items = Object.entries(m).filter(([k, v]) => !filter || filter.test(k) || filter.test(v.dir));
const html = `<html><body style="margin:0;background:#FFF7E8;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:10px;padding:10px;width:${process.argv[4]||1600}px">` +
  items.map(([k, v]) => `<div style="text-align:center"><img src="file://${process.cwd()}/public/${v.path}" style="max-width:${Math.min(v.w, process.argv[5]||400)}px;background:#e9f4f8"><br>${k}</div>`).join('') + '</body></html>';
writeFileSync('/tmp/claude-preview.html', html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: Number(process.argv[4]||1600), height: 800 } });
await p.goto('file:///tmp/claude-preview.html');
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close();
