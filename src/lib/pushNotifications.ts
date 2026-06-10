// Web-Push helper — Permission + Subscription Management
// Public VAPID key (safe to expose). Private key lives in edge function secret.

import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BOhPOswXs_KmA6Wvx3PbOjsdG_TpPIZ5hNR7nYXK-1d3MvM17A-awvFs2wZbte2xETiSuckHjPAP8DuyNSZgHcc";

export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

export function pushPermission(): NotificationPermission {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export async function showLocalNotification(title: string, opts?: NotificationOptions) {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { icon: "/icon-512.png", badge: "/icon-512.png", ...opts });
  } catch { new Notification(title, opts); }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Ensures the current user has a stored push subscription. Safe to call on every chat load. */
export async function ensurePushSubscription(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    if (Notification.permission !== "granted") return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      });
    }
    const endpoint = sub.endpoint;
    const p256dh = bufToBase64(sub.getKey("p256dh"));
    const auth = bufToBase64(sub.getKey("auth"));
    if (!endpoint || !p256dh || !auth) return false;

    await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint, p256dh, auth, user_agent: navigator.userAgent, last_used_at: new Date().toISOString() },
      { onConflict: "endpoint" }
    );
    return true;
  } catch (e) {
    console.warn("[push] subscribe failed", e);
    return false;
  }
}

export async function disablePushSubscription(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {}
}
