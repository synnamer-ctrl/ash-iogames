import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Generates a small offline service worker at build time listing every
 * built file and public asset, so the installed PWA works without a network.
 */
function serviceWorker(): Plugin {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  return {
    name: 'lww-service-worker',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const publicDir = join(process.cwd(), 'public');
      const files = new Set<string>(['./', './index.html']);
      for (const name of Object.keys(bundle)) files.add('./' + name);
      for (const p of walk(publicDir)) files.add('./' + relative(publicDir, p).split('\\').join('/'));
      files.delete('./sw.js');
      const version = Date.now().toString(36);
      const source = `// Generated at build time. Cache-first offline support for Little Wonder World.
const CACHE = 'lww-${version}';
const FILES = ${JSON.stringify([...files].sort(), null, 0)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  const req = e.request;
  const isPage = req.mode === 'navigate' || req.destination === 'document' || new URL(req.url).pathname.endsWith('sw.js');
  if (isPage) {
    // pages and the worker itself: network first so a redeploy is picked up immediately
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))));
    return;
  }
  // hashed build assets never change, so cache first is safe
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'], react: ['react', 'react-dom'] } },
    },
  },
  server: { host: true },
});
