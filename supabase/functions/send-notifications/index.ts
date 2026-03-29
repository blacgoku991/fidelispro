import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push utilities
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    // Import VAPID private key
    const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
    const publicKeyBytes = base64UrlToUint8Array(vapidPublicKey);

    // Create JWT for VAPID
    const audience = new URL(subscription.endpoint).origin;
    const header = { typ: "JWT", alg: "ES256" };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = { aud: audience, exp: now + 86400, sub: "mailto:notifications@fidelispro.app" };

    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import key and sign
    const key = await crypto.subtle.importKey(
      "raw",
      privateKeyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsignedToken)
    );

    // Convert DER to raw r||s format if needed
    let signatureBytes = new Uint8Array(signatureBuffer);
    if (signatureBytes.length !== 64) {
      // DER encoded, extract r and s
      const r = signatureBytes.slice(4, 4 + signatureBytes[3]);
      const sOffset = 4 + signatureBytes[3] + 2;
      const s = signatureBytes.slice(sOffset, sOffset + signatureBytes[sOffset - 1]);
      const rPad = new Uint8Array(32); rPad.set(r.slice(-32));
      const sPad = new Uint8Array(32); sPad.set(s.slice(-32));
      signatureBytes = new Uint8Array([...rPad, ...sPad]);
    }

    const signatureB64 = btoa(String.fromCharCode(...signatureBytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const jwt = `${unsignedToken}.${signatureB64}`;

    // For simplicity, send unencrypted payload via TTL 0 push
    // (In production, implement RFC 8291 content encryption)
    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: new TextEncoder().encode(payload),
    });

    if (res.status === 201 || res.status === 200) {
      return { success: true, status: res.status };
    }
    const errorText = await res.text();
    return { success: false, status: res.status, error: errorText };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, title, message, segment, campaign_id, channels } = await req.json();
    const sendWebPushChannel = channels?.web_push !== false;
    const sendWalletChannel = channels?.apple_wallet !== false;
    if (!business_id || !message) {
      return new Response(JSON.stringify({ error: "business_id and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let pushed = 0;
    let failed = 0;

    if (sendWebPushChannel) {
      // Get web push subscriptions for this business
      const { data: subscriptions } = await supabase
        .from("web_push_subscriptions")
        .select("*")
        .eq("business_id", business_id);

      const subs = subscriptions || [];
      const payload = JSON.stringify({ title: title || "FidéliPro", body: message, tag: campaign_id || "notification" });

      for (const sub of subs) {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (result.success) pushed++;
        else {
          failed++;
          if (result.status === 410 || result.status === 404) {
            await supabase.from("web_push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    // Also trigger Apple Wallet push if available
    let walletResult = { pushed: 0, failed: 0 };
    if (sendWalletChannel) {
      try {
        const walletRes = await fetch(`${supabaseUrl}/functions/v1/wallet-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ business_id, action_type: "campaign", change_message: message }),
        });
        walletResult = await walletRes.json();
      } catch {}
    }

    return new Response(JSON.stringify({
      success: true,
      web_push: { pushed, failed, total: subs.length },
      wallet_push: walletResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-notifications error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
