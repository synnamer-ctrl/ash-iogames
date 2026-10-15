// Verifies every asset in the manifest exists on disk (run before builds).
import { existsSync, readFileSync } from 'node:fs';
const src = readFileSync('src/data/asset-manifest.ts', 'utf8');
const m = JSON.parse(src.slice(src.indexOf('= {') + 2, src.lastIndexOf('} as const') + 1));
const missing = Object.values(m).filter((a) => !existsSync('public/' + a.path)).map((a) => a.path);
if (missing.length) {
  console.error('Missing assets:\n' + missing.join('\n'));
  process.exit(1);
}
console.log(`All ${Object.keys(m).length} assets present.`);
