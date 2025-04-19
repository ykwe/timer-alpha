const CACHE_NAME = 'timer-cache-v1';
const BASE_PATH = '/timer-alpha';
const CACHE_URLS = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/icon-192.png`,
    `${BASE_PATH}/icon-512.png`,
    `${BASE_PATH}/icon.svg`,
    `${BASE_PATH}/manifest.json`
];

// インストール時にリソースをキャッシュ
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                return self.skipWaiting();
            })
    );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    console.log('Service Worker: Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            return self.clients.claim();
        })
    );
});

// フェッチ時にキャッシュを使用
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(response => {
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    });
            })
    );
});

// 通知をクリックした時の処理
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(BASE_PATH + '/');
            }
        })
    );
});

// プッシュ通知の受信処理
self.addEventListener('push', event => {
    console.log('Service Worker: Push received');
    const options = {
        body: event.data ? event.data.text() : 'タイマーが終了しました',
        icon: `${BASE_PATH}/icon-192.png`,
        badge: `${BASE_PATH}/icon-192.png`,
        vibrate: [200, 100, 200],
        tag: 'timer-notification',
        renotify: true,
        data: {
            url: self.registration.scope
        }
    };

    event.waitUntil(
        self.registration.showNotification('タイマー終了', options)
            .then(() => {
                console.log('Service Worker: Notification sent');
            })
            .catch(error => {
                console.error('Service Worker: Notification error:', error);
            })
    );
}); 