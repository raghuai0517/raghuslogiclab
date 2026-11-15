/* APPSC Group 2 Prep Hall — offline support.
   Serves the saved copy at once and refreshes it in the background, so the app opens without internet.
   Change CACHE when you want every phone to drop its old copy immediately. */
var CACHE = "appsc-g2-v1";
var FILES = ["./", "index.html", "app.js?v=1", "reasoning.js?v=1", "icon.svg", "icon-192.png", "manifest.webmanifest",
  "data/history.js?v=1", "data/geography.js?v=1", "data/society.js?v=1", "data/polity.js?v=1", "data/economy.js?v=1", "data/science.js?v=1", "data/extras.js?v=1"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf("appsc-g2-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.indexOf(new URL("./", location.href).pathname) !== 0) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) { if (res && res.ok) c.put(e.request, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
