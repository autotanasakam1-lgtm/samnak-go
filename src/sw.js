// Service worker for สำนักหมากล้อม. Works from any subfolder: all paths are resolved against the registration scope.
const VERSION = 'v15-curriculum';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
const CACHE_FIRST_DIRS = ['engine/', 'tfjs/'];

const SCOPE = self.registration ? self.registration.scope : self.location.href.replace(/[^/]*$/, '');
const SCOPE_PATH = new URL(SCOPE).pathname;
const CACHE_PREFIX = `samnak-${encodeURIComponent(SCOPE_PATH)}-`;
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Tolerant pre-cache: a missing file (e.g. index.html not yet uploaded) must not fail install.
    await Promise.all(PRECACHE.map(async (p) => {
      try {
        const res = await fetch(new URL(p, SCOPE));
        if (res.ok) await cache.put(new URL(p, SCOPE), res);
      } catch (_) { /* skip */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && !keep.has(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // ignore cross-origin
  if (!url.pathname.startsWith(SCOPE_PATH)) return; // outside our folder

  const rel = url.pathname.slice(SCOPE_PATH.length);
  if (CACHE_FIRST_DIRS.some((d) => rel.startsWith(d))) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
