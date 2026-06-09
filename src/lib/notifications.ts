// Lightweight browser notification helper (foreground). True background web push
// requires a service worker push handler + VAPID — separate setup.
export function canNotify() {
  return typeof window !== "undefined" && "Notification" in window;
}
export function notifyPermission(): NotificationPermission {
  return canNotify() ? Notification.permission : "denied";
}
export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return "denied";
  if (Notification.permission === "default") {
    try { return await Notification.requestPermission(); } catch { return "denied"; }
  }
  return Notification.permission;
}
export function showNotification(title: string, body: string, onClick?: () => void) {
  if (!canNotify() || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && !onClick) return; // skip in-app spam
  try {
    const n = new Notification(title, {
      body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      tag: "immoniq-msg",
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch { /* ignore */ }
}
