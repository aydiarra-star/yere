// All URLs and caches are scoped to this installation, not the domain root.
// This also supports hosting YÉRÉ at a subfolder such as /yere/.
const APP_SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `yere-atelier-shell-${encodeURIComponent(APP_SCOPE.pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}v8`;
const appUrl = (path = "") => new URL(path, APP_SCOPE).href;
const APP_SHELL = [
  "",
  "manifest.webmanifest",
  "images/delivery-reference.webp",
  "images/payment-reference.webp",
  "images/production-reference.webp",
  "images/atelier.webp"
].map(appUrl);
const ASSETS_PATH = new URL("assets/", APP_SCOPE).pathname;
const IMAGES_PATH = new URL("images/", APP_SCOPE).pathname;

// Vite fingerprints JS/CSS on every build. Read their URLs from the cached HTML so a
// freshly installed app can also start offline without requiring a second visit.
async function precacheBuildAssets(cache) {
  try {
    const shell = await cache.match(appUrl());
    if (!shell) return;
    const html = await shell.text();
    const references = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)];
    const urls = references.map((match) => new URL(match[1], APP_SCOPE))
      .filter((url) => url.origin === APP_SCOPE.origin && url.pathname.startsWith(APP_SCOPE.pathname))
      .map((url) => url.href);
    await Promise.allSettled(urls.map((url) => cache.add(new Request(url, { cache: "no-store" }))));
  } catch {
    // Offline support is best-effort if the deployment rewrites the shell unusually.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // Avoid installing an outdated HTML shell from the browser HTTP cache.
        await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "no-store" })));
        await precacheBuildAssets(cache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => {
        // v1–v6 were unscoped; remove them only for the root installation.
        const legacyRootCache = APP_SCOPE.pathname === "/" && /^yere-atelier-shell-v\d+$/.test(key);
        return legacyRootCache || (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
      }).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== APP_SCOPE.origin || !url.pathname.startsWith(APP_SCOPE.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(appUrl(), response.clone());
            } catch {
              // Storage failure must not prevent an online page from loading.
            }
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) || (await cache.match(appUrl())) || Response.error();
        })
    );
    return;
  }

  // Network-first keeps the code and illustrations current and refreshes their offline copy.
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.startsWith(ASSETS_PATH) || url.pathname.startsWith(IMAGES_PATH)) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(async (response) => {
          if (response.ok && response.type === "basic") {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, response.clone());
            } catch {
              // A full or unavailable cache must not prevent a successful network response.
            }
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) || Response.error();
        })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok && response.type === "basic" && url.pathname === new URL("manifest.webmanifest", APP_SCOPE).pathname) {
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          } catch {
            // The manifest can still be returned when storage is unavailable.
          }
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || Response.error();
      })
  );
});
