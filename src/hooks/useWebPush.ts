import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BOLFKld_IoZmiAkLYzYT5gDdR4uy6RewPZdHhWSHj4grXBV4NzbkxiArOxtlxhLoro_OVJjM2TKvlKX338PcgaA";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function useWebPush(businessId: string, cardId?: string) {
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    const pwa = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
    setIsSupported(supported);
    setIsPWA(pwa);
    if (supported) {
      setPermission(Notification.permission);
      // Check if already subscribed
      navigator.serviceWorker.getRegistration('/sw.js').then(reg => {
        if (reg) reg.pushManager.getSubscription().then(sub => {
          if (sub) setSubscribed(true);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();
      await supabase.from('web_push_subscriptions' as any).upsert({
        business_id: businessId,
        card_id: cardId || null,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' });

      setSubscribed(true);
      console.log('[WebPush] Subscribed successfully');
    } catch (err) {
      console.error('Push subscription failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, isPWA, permission, subscribed, loading, subscribe };
}
