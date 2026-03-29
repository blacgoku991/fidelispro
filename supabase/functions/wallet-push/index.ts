// Edge function: Real APNs push for Apple Wallet pass updates
// Uses token-based (P8/JWT) authentication — works with Deno's HTTP/2 fetch

import { createClient } from "npm:@supabase/supabase-js@2";

const PASS_TYPE_ID = "pass.app.lovable.fidelispro";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { business_id, campaign_id, change_message, card_ids, test_mode } = body;

    if (!business_id) {
      return jsonResponse({ error: "business_id required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get registered wallet devices for this business
    let query = supabase
      .from("wallet_registrations")
      .select("*")
      .eq("business_id", business_id);

    if (card_ids && card_ids.length > 0) {
      query = query.in("card_id", card_ids);
    }

    const { data: registrations, error: regErr } = await query;

    if (regErr) {
      console.error("[Wallet Push] Error fetching registrations:", regErr);
      return jsonResponse({ error: "Failed to fetch registrations" }, 500);
    }

    if (!registrations || registrations.length === 0) {
      return jsonResponse({
        success: true,
        message: "No wallet registrations found",
        pushed: 0,
        total_registrations: 0,
      }, 200);
    }

    // Update wallet_pass_updates for all affected serial numbers
    const serialNumbers = [...new Set(registrations.map((r: any) => r.serial_number))];
    const now = new Date().toISOString();

    for (const sn of serialNumbers) {
      await supabase.from("wallet_pass_updates").upsert(
        {
          serial_number: sn,
          pass_type_id: PASS_TYPE_ID,
          last_updated: now,
          change_message: change_message || null,
          campaign_id: campaign_id || null,
        },
        { onConflict: "serial_number,pass_type_id" }
      );

      // Set change message on the card
      if (change_message) {
        await supabase
          .from("customer_cards")
          .update({ wallet_change_message: change_message })
          .eq("id", sn);
      }
    }

    // ── REAL APNs Push via Token-Based Auth ──────────────────────────
    const p8Key = Deno.env.get("APPLE_P8_KEY")!;
    const keyId = Deno.env.get("APPLE_KEY_ID")!;
    const teamId = Deno.env.get("APPLE_TEAM_ID")!.trim();

    if (!p8Key || !keyId) {
      console.error("[Wallet Push] Missing APPLE_P8_KEY or APPLE_KEY_ID");
      return jsonResponse({
        success: false,
        error: "APNs credentials not configured (P8 key / Key ID missing)",
        total_registrations: registrations.length,
      }, 500);
    }

    // Generate JWT for APNs
    const jwt = await createApnsJwt(teamId, keyId, p8Key);

    const apnsHost = test_mode
      ? "api.sandbox.push.apple.com"
      : "api.push.apple.com";

    let successCount = 0;
    let failCount = 0;
    const pushResults: any[] = [];

    // Deduplicate by push_token to avoid sending duplicates
    const uniqueTokens = new Map<string, any>();
    for (const reg of registrations) {
      if (!uniqueTokens.has(reg.push_token)) {
        uniqueTokens.set(reg.push_token, reg);
      }
    }

    for (const [pushToken, reg] of uniqueTokens) {
      const logEntry: any = {
        business_id,
        serial_number: reg.serial_number,
        push_token: pushToken,
        campaign_id: campaign_id || null,
        status: "pending",
      };

      try {
        const result = await sendApnsPush(pushToken, PASS_TYPE_ID, jwt, apnsHost);

        logEntry.status = result.success ? "sent" : "failed";
        logEntry.apns_response = JSON.stringify(result);

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          // If token is invalid, mark registration
          if (result.status === 410 || result.reason === "Unregistered") {
            logEntry.error_message = "Token invalid/unregistered";
            await supabase
              .from("wallet_registrations")
              .delete()
              .eq("push_token", pushToken);
          }
        }

        pushResults.push({
          serial_number: reg.serial_number,
          device: reg.device_library_id,
          ...result,
        });
      } catch (err: any) {
        logEntry.status = "error";
        logEntry.error_message = String(err);
        failCount++;
        pushResults.push({
          serial_number: reg.serial_number,
          device: reg.device_library_id,
          success: false,
          error: String(err),
        });
      }

      // Log the attempt
      await supabase.from("wallet_apns_logs").insert(logEntry);
    }

    return jsonResponse({
      success: true,
      total_registrations: registrations.length,
      unique_passes: serialNumbers.length,
      unique_devices: uniqueTokens.size,
      pushed: successCount,
      failed: failCount,
      results: pushResults,
    }, 200);
  } catch (err: any) {
    console.error("[Wallet Push] Error:", err);
    return jsonResponse({ error: "Internal error", details: String(err) }, 500);
  }
});

// ── APNs JWT Token-Based Auth ─────────────────────────────────────

async function createApnsJwt(
  teamId: string,
  keyId: string,
  p8Key: string
): Promise<string> {
  // Clean the P8 key
  const pemContent = p8Key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const keyData = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  // Import as ECDSA P-256 key
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // JWT header + payload
  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Sign with ECDSA SHA-256
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  // crypto.subtle returns IEEE P1363 format (r || s), which is what JWT ES256 expects
  const sigB64 = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

// ── APNs Push ─────────────────────────────────────────────────────

async function sendApnsPush(
  pushToken: string,
  topic: string,
  jwt: string,
  apnsHost: string
): Promise<{ success: boolean; status?: number; reason?: string }> {
  const apnsUrl = `https://${apnsHost}/3/device/${pushToken}`;

  console.log(`[APNs] POST ${apnsUrl} topic=${topic}`);

  // Apple Wallet pass update: send empty JSON payload
  // The push tells iOS to contact webServiceURL for updated passes
  const response = await fetch(apnsUrl, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": topic,
      "apns-push-type": "background",
      "apns-priority": "5",
    },
    body: JSON.stringify({}),
  });

  const status = response.status;
  let reason = "";

  if (status !== 200) {
    try {
      const body = await response.json();
      reason = body?.reason || "";
    } catch {
      reason = await response.text().catch(() => "unknown");
    }
    console.error(`[APNs] Failed: status=${status} reason=${reason}`);
    return { success: false, status, reason };
  }

  // Consume response body
  await response.text().catch(() => {});

  console.log(`[APNs] Success: status=${status} token=${pushToken.slice(0, 8)}...`);
  return { success: true, status };
}

// ── Helpers ───────────────────────────────────────────────────────

function base64urlEncode(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
