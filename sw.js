const CACHE_NAME = 'som-da-terra-v2.1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// Instalação: Cacheia os ativos iniciais e força a ativação
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS);
            })
    );
});

// Ativação: Limpa caches antigos e assume controle das abas imediatamente
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME) {
                            return caches.delete(cache);
                        }
                    })
                );
            })
        ])
    );
});

// Estratégia de busca: Network-First para navegação, Stale-While-Revalidate para outros
self.addEventListener('fetch', (event) => {
    // Para a página principal (HTML), tentamos a rede primeiro para garantir a versão nova
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Para demais recursos (CSS, JS, etc), servimos cache e atualizamos em background
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const cacheCopy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, cacheCopy);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Silenciosamente falha se estiver offline e não houver no cache
            });
            return cachedResponse || fetchPromise;
        })
    );
});
