const CACHE_NAME = "godziny-pracy-v0.8";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./config.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-180.png"
];

// Pliki, ktore rzadko sie zmieniaja - moga byc serwowane z cache jako pierwsze.
const CACHE_FIRST = ["/icons/", "/manifest.json"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Dane z Supabase mają zawsze iść po sieci - nigdy nie serwujemy ich z cache.
    if (url.hostname.endsWith("supabase.co")) {
        event.respondWith(fetch(event.request));
        return;
    }

    const isCacheFirst = CACHE_FIRST.some((prefix) => url.pathname.includes(prefix));

    if (isCacheFirst) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return (
                    cached ||
                    fetch(event.request).then((response) => {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                        return response;
                    })
                );
            })
        );
        return;
    }

    // HTML/JS/CSS aplikacji: zawsze najpierw siec, zeby nowe zmiany byly widoczne od razu.
    // Cache to tylko zapasowa kopia na wypadek braku sieci.
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
