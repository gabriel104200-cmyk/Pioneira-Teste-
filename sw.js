// sw.js (atualizado)
const VERSION = "v100"; // <<< mude o número sempre que publicar mudança
const CACHE = `pioneira-pwa-${VERSION}`;

// Descobre o "base" do GitHub Pages automaticamente (ex: /PIONEIRA/)
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, ""); // "/PIONEIRA"
const BASE = SCOPE_PATH || "";

// Lista mínima (pode adicionar seus arquivos se tiver mais)
const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/sw.js`,
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Estratégia:
// - HTML / navegação: NETWORK FIRST (pra não ficar preso em versão antiga)
// - Arquivos estáticos: CACHE FIRST
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navegação (quando troca de aba/rota, abre link, F5, etc.)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        // também garante o index.html atualizado no cache
        cache.put(`${BASE}/index.html`, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || caches.match(`${BASE}/index.html`);
      }
    })());
    return;
  }

  // Estáticos: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const res = await fetch(req);
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone());
    return res;
  })());
});

// (opcional) permite forçar atualização do SW se você mandar mensagem via console
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
