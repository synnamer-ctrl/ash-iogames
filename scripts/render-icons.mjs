// Rasterises the app icon SVG into the PNG sizes PWAs need (uses Playwright's Chromium).
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const svg = readFileSync('public/assets/ui/app_icon.svg', 'utf8');
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
mkdirSync('public/icons', { recursive: true });
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.1]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:${pad ? '#9EDDF5' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg style="width:${inner}px;height:${inner}px" `)}</body></html>`);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: !pad });
  await page.close();
}
await browser.close();
console.log('Icons written to public/icons/');
