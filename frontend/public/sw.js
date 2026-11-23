const CACHE_PREFIX = "barberflow-offline-";
const CACHE_NAME = CACHE_PREFIX + "v1";
const OFFLINE_PAGE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.add(new Request(OFFLINE_PAGE, { cache: "reload" })),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  )
    return;

  event.respondWith(
    fetch(request).catch(async (error) => {
      const fallback = await (
        await caches.open(CACHE_NAME)
      ).match(OFFLINE_PAGE);
      if (fallback) return fallback;
      throw error;
    }),
  );
});
