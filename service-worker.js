
/* ==========================================
   QASR NAMAZ
   SERVICE WORKER
   PWA + SMART CACHE + OFFLINE SUPPORT
========================================== */

"use strict";

// ==========================================
// CACHE VERSION
// ==========================================

const CACHE_NAME = "qasr-namaz-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

// ==========================================
// INSTALL
// ==========================================

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches.open(CACHE_NAME).then(async (cache) => {

      await Promise.allSettled(
        APP_FILES.map(async (file) => {
          try {
            const response = await fetch(file);

            if (response.ok) {
              await cache.put(file, response);
            }
          } catch (error) {
            console.log("Cache skipped:", file);
          }
        })
      );

    })

  );

  self.skipWaiting();

});

// ==========================================
// ACTIVATE
// ==========================================

self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches.keys().then((cacheNames) => {

      return Promise.all(

        cacheNames
          .filter((name) => {
            return name.startsWith("qasr-namaz-") &&
                   name !== CACHE_NAME;
          })
          .map((name) => caches.delete(name))

      );

    }).then(() => {

      return self.clients.claim();

    })

  );

});

// ==========================================
// NETWORK FIRST
// HTML, CSS, JS, MANIFEST
// ==========================================

async function networkFirst(request) {

  const cache = await caches.open(CACHE_NAME);

  try {

    const response = await fetch(request);

    if (
      response &&
      response.ok &&
      response.type === "basic"
    ) {

      await cache.put(
        request,
        response.clone()
      );

    }

    return response;

  } catch (error) {

    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      return await cache.match("./index.html");
    }

    return Response.error();

  }

}

// ==========================================
// CACHE FIRST
// STATIC FILES
// ==========================================

async function cacheFirst(request) {

  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (
    response &&
    response.ok &&
    response.type === "basic"
  ) {

    await cache.put(
      request,
      response.clone()
    );

  }

  return response;

}

// ==========================================
// FETCH
// ==========================================

self.addEventListener("fetch", (event) => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Never cache external map tiles,
  // geocoding or third-party API requests.

  if (url.origin !== self.location.origin) {
    return;
  }

  // Only handle this application's files.

  if (
    !url.pathname.startsWith(
      new URL(self.registration.scope).pathname
    )
  ) {
    return;
  }

  const path = url.pathname;

  // HTML navigation and application files

  if (
    request.mode === "navigate" ||
    /\.(html|js|css|webmanifest)$/i.test(path)
  ) {

    event.respondWith(
      networkFirst(request)
    );

    return;
  }

  // Images and other static assets

  event.respondWith(
    cacheFirst(request)
  );

});

// ==========================================
// SKIP WAITING MESSAGE
// ==========================================

self.addEventListener("message", (event) => {

  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }

});

// ==========================================
// END SERVICE WORKER
// ==========================================
