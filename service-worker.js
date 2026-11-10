
/* ==========================================
   QASR SALAH
   Service Worker
   PWA + Offline Support
========================================== */

"use strict";

const CACHE_NAME = "qasr-salah-v1";

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

    caches.open(CACHE_NAME).then((cache) => {

      return cache.addAll(APP_FILES);

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
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))

      );

    })

  );

  self.clients.claim();

});

// ==========================================
// FETCH
// ==========================================

self.addEventListener("fetch", (event) => {

  const request = event.request;

  // Only handle GET requests

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Do not cache external API requests

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(

    caches.match(request).then((cachedResponse) => {

      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {

        if (
          !response ||
          response.status !== 200 ||
          response.type !== "basic"
        ) {
          return response;
        }

        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {

          cache.put(request, responseClone);

        });

        return response;

      }).catch(() => {

        if (request.mode === "navigate") {

          return caches.match("./index.html");

        }

      });

    })

  );

});
                      
