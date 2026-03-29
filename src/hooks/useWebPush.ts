import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key — safe to expose client-side
const VAPID_PUBLIC_KEY = "BOLFKld_IoZmiAkLYzYT5gDdR4uy6RewPZdHhWSHj4grXBV4NzbkxiArOxtlxhLoro_OVJjM2TKvlKX338PcgaA";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export { VAPID_PUBLIC_KEY };

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
      navigator.serviceWorker.getRegistration('/sw.js').then(reg => {
        if (reg) reg.pushManager.getSubscription().then(sub => {
          if (sub) setSubscribed(true);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      console.error('[WebPush] Not supported or VAPID key missing');
      return;
    }
    setLoading(true);
    try {
      console.log('[WebPush] Starting subscription...');
      console.log('[WebPush] VAPID key:', VAPID_PUBLIC_KEY.slice(0, 20) + '...');

      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[WebPush] SW registered:', reg.scope);

      const ready = await navigator.serviceWorker.ready;
      console.log('[WebPush] SW ready, active:', !!ready.active);

      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log('[WebPush] Permission:', perm);
      if (perm !== 'granted') {
        console.warn('[WebPush] Permission denied, aborting');
        setLoading(false);
        return;
      }

      const sub = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[WebPush] Push subscription created:', sub.endpoint.slice(0, 60) + '...');

      const subJson = sub.toJSON();
      console.log('[WebPush] Saving to DB...', {
        business_id: businessId,
        card_id: cardId || null,
        endpoint: subJson.endpoint?.slice(0, 50),
        has_p256dh: !!subJson.keys?.p256dh,
        has_auth: !!subJson.keys?.auth,
      });

      const { data, error } = await supabase
        .from('web_push_subscriptions')
        .upsert({
          business_id: businessId,
          card_id: cardId || null,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys?.p256dh!,
          auth: subJson.keys?.auth!,
          user_agent: navigator.userAgent,
        }, { onConflict: 'endpoint' })
        .select();

      if (error) {
        console.error('[WebPush] DB error:', error);
        throw error;
      }

      console.log('[WebPush] Saved to DB:', data);
      setSubscribed(true);
      console.log('[WebPush] Done! ✅');
    } catch (err) {
      console.error('[WebPush] FAILED:', err);
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, isPWA, permission, subscribed, loading, subscribe };
}
