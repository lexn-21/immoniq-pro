// Browser-Notification helper — fragt Permission an und zeigt lokale Notifications
// via Service Worker. (Echte Server-Push via Web-Push/VAPID kann später ergänzt werden.)

export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator;
}

export function pushPermission(): NotificationPermission {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const res = await Notification.requestPermission();
  return res;
}

export async function showLocalNotification(title: string, opts?: NotificationOptions) {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      ...opts,
    });
  } catch {
    // Fallback ohne SW
    new Notification(title, opts);
  }
}
