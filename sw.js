// Terminator2 Service Worker — caches the background video and static assets
var CACHE_NAME = 't2-v2';
var PRECACHE = ['/eyesblink.mp4'];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(PRECACHE);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                    .map(function(n) { return caches.delete(n); })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(e) {
    var url = new URL(e.request.url);
    // Only cache-first for the video and static assets on same origin
    if (url.origin !== location.origin) return;
    // Cache-first for the video file
    if (url.pathname === '/eyesblink.mp4') {
        e.respondWith(
            caches.match(e.request).then(function(cached) {
                return cached || fetch(e.request).then(function(resp) {
                    var clone = resp.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(e.request, clone);
                    });
                    return resp;
                });
            })
        );
        return;
    }
    // Network-first for everything else (HTML, CSS, JS, JSON change frequently)
});
