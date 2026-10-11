// Keeps the app itself on the device, so it starts without the server.
// The data is handled by the offline data access, not by this worker.
const CACHE = 'foody-shell';
const STATIC_FILES = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
// PocketBase API and dashboard are never answered from the cache
const NOT_APP = /^\/(api|_)\//;

/**
 * Stores the current index.html with the scripts and styles it refers to
 * and removes the files of older versions
 */
async function refreshShell() {
  const cache = await caches.open(CACHE);
  const response = await fetch('/', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);

  const html = await response.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
    (match) => new URL(match[1], location.origin).pathname,
  );
  const wanted = new Set(['/', ...STATIC_FILES, ...assets]);

  for (const path of wanted) {
    if (path !== '/' && !(await cache.match(path))) await cache.add(path);
  }
  await cache.put('/', response);

  for (const request of await cache.keys()) {
    if (!wanted.has(new URL(request.url).pathname)) await cache.delete(request);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(refreshShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== location.origin ||
    NOT_APP.test(url.pathname)
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    // Start from the cache at once; a new version is used on the next start
    event.respondWith(
      caches.match('/').then((cached) => cached ?? fetch(request)),
    );
    event.waitUntil(refreshShell().catch(() => undefined));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
