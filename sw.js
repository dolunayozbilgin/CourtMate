// CourtMate Service Worker — Web Push bildirimleri

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'CourtMate', {
      body:      data.body  || '',
      icon:      '/icon-192.png',
      badge:     '/icon-96.png',
      tag:       data.tag   || 'courtmate',
      renotify:  true,
      data:      { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const open = cs.find(c => 'focus' in c);
      return open ? open.focus() : clients.openWindow(url);
    })
  );
});
