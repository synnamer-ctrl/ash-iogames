// Validates hand-drawn SVG sources: well-formed XML, a viewBox, no raster or
// external references. Usage: node scripts/art/validate-samples.mjs [dir]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

export function validateSvg(text) {
  const problems = [];
  const dom = new JSDOM(text, { contentType: 'image/svg+xml' });
  const doc = dom.window.document;
  if (doc.querySelector('parsererror')) problems.push('invalid XML');
  const svg = doc.documentElement;
  if (!svg || svg.localName !== 'svg') problems.push('root is not <svg>');
  const vb = svg?.getAttribute('viewBox');
  if (!vb || vb.split(/\s+/).length !== 4) problems.push('missing or malformed viewBox');
  if (/<image\b|data:image\/|href="https?:|xlink:href="https?:/.test(text)) problems.push('raster or external reference');
  return { problems, viewBox: vb ?? null };
}

export function listSamples(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
}

if (process.argv[1] && process.argv[1].endsWith('validate-samples.mjs')) {
  const dir = process.argv[2] ?? 'assets-src/samples';
  let bad = 0;
  for (const f of listSamples(dir)) {
    const { problems, viewBox } = validateSvg(readFileSync(join(dir, f), 'utf8'));
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${f}  viewBox=${viewBox}${problems.length ? '  ' + problems.join('; ') : ''}`);
    if (problems.length) bad++;
  }
  if (bad) process.exit(1);
}
