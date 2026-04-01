const CACHE_NAME = 'trading-v1';
const ASSETS = [
    './',
    './index.html',
    './calculator.html',
    './script.js',
    './style.css',
    './icon.png',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
