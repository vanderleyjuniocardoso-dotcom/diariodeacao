import { supabase } from "@/integrations/supabase/client";

// Public VAPID key for Web Push subscriptions (safe to expose).
export const VAPID_PUBLIC_KEY =
  "BD94_LTYgiwVqLkpBgIl2CbAYCQORjeEAnO_nC1VAvroScgq8GhDEMXHkuAAvuHxD0P9UW0kVLpjktGUy0kXWDo";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  if (isInIframe) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.error("SW register failed", e);
    return null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;
  if (!("PushManager" in window)) return null;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return null;

  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const appServerKey = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;

  let sub = await reg.pushManager.getSubscription();

  // If existing subscription was created with a different VAPID public key, drop it.
  if (sub) {
    const existingKey = sub.options?.applicationServerKey;
    const same =
      existingKey &&
      new Uint8Array(existingKey as ArrayBuffer).every((b, i) => b === key[i]) &&
      (existingKey as ArrayBuffer).byteLength === key.byteLength;
    if (!same) {
      try { await sub.unsubscribe(); } catch {}
      sub = null;
    }
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey,
    });
  }
  return sub;
}

export async function savePushSubscription(userId: string): Promise<PushSubscription | null> {
  const sub = await subscribeToPush();
  if (!sub) return null;
  const json: any = sub.toJSON();
  await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  return sub;
}
