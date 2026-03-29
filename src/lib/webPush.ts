import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BF79k_rhcwVH2BEiTdoBeWCzVsngL_WIOaYczHSfo1LQYvNiAYLJ2DEXoRGamy1cGqvQhCSTun4qEDEycS8zs3U";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPushSubscription(businessId: string, customerId?: string): Promise<boolean> {
  try {
    // Check support
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Push permission denied");
      return false;
    }

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();

    // Save to database
    const { error } = await supabase.from("web_push_subscriptions" as any).upsert({
      business_id: businessId,
      customer_id: customerId || null,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
    }, { onConflict: "endpoint" });

    if (error) {
      console.error("Error saving push subscription:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Push registration error:", err);
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
