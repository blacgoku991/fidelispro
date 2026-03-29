import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/@block65/webcrypto-web-push@1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      business_id,
      title,
      message,
      segment,
      campaign_id,
      channels,
    } = await req.json();

    const sendWebPushChannel = channels?.web_push !== false;
    const sendWalletChannel = channels?.apple_wallet !== false;

    if (!business_id || !message) {
      return new Response(
        JSON.stringify({ error: "business_id and message required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let pushed = 0;
    let failed = 0;
    let totalSubs = 0;

    if (sendWebPushChannel) {
      const { data: subscriptions } = await supabase
        .from("web_push_subscriptions")
        .select("*")
        .eq("business_id", business_id);

      const subs = subscriptions || [];
      totalSubs = subs.length;

      // Build VAPID keys for the library
      const vapidKeys = await webpush.importVapidKeys(
        {
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey,
        },
        { extractable: false }
      );

      const appServer = new webpush.ApplicationServer(
        {
          contactInformation: "mailto:notifications@fidelispro.app",
          vapidKeys,
        }
      );

      const payload = JSON.stringify({
        title: title || "FidéliPro",
        body: message,
        tag: campaign_id || "notification",
      });

      for (const sub of subs) {
        try {
          const subscriber = appServer.subscribe({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          });

          const pushMessage = await subscriber.pushTextMessage(payload, {
            urgency: "high",
            ttl: 86400,
          });

          const res = await fetch(sub.endpoint, pushMessage);
          const resText = await res.text();

          if (res.status === 201 || res.status === 200) {
            pushed++;
          } else {
            failed++;
            console.error(
              `Push failed [${res.status}] for ${sub.endpoint}: ${resText}`
            );
            if (res.status === 410 || res.status === 404) {
              await supabase
                .from("web_push_subscriptions")
                .delete()
                .eq("id", sub.id);
            }
          }
        } catch (pushErr) {
          failed++;
          console.error(`Push error for ${sub.endpoint}:`, String(pushErr));
        }
      }
    }

    let walletResult = { pushed: 0, failed: 0 };
    if (sendWalletChannel) {
      try {
        const walletRes = await fetch(
          `${supabaseUrl}/functions/v1/wallet-push`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              business_id,
              action_type: "campaign",
              change_message: message,
            }),
          }
        );
        walletResult = await walletRes.json();
      } catch {}
    }

    return new Response(
      JSON.stringify({
        success: true,
        web_push: { pushed, failed, total: totalSubs },
        wallet_push: walletResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-notifications error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
