// Service Worker for Web Push Notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "FidéliPro";
  const options = {
    body: data.body || data.message || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.url ? { url: data.url } : undefined,
    vibrate: [100, 50, 100],
    tag: data.tag || "fidelipro-notification",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
