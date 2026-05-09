self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Nojai", body: event.data.text() };
  }

  const title = payload.title ?? "Nojai";
  const options = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag ?? "nojai-trade",
    renotify: true,
    data: { url: payload.url ?? "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes(target) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(target);
      }),
  );
});
