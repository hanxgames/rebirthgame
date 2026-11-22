/* ReBirth Topluluk bildirimleri: yalnız bildirime dokununca ilgili gönderiyi açar (önbellek/fetch yok). Kapsam ./topluluk */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "topluluk.html", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) {
      if (w.url.indexOf("topluluk.html") >= 0) { w.postMessage({ tpAc: url }); return w.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
