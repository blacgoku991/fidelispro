import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_WALLET_ISSUER_ID",
] as const;

function base64urlEncode(data: string | Uint8Array): string {
  let b64: string;
  if (typeof data === "string") {
    b64 = btoa(unescape(encodeURIComponent(data)));
  } else {
    let binary = "";
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    b64 = btoa(binary);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, "")
    .replace(/-----END RSA PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

async function signJWT(payload: object, privateKeyPem: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const headerEncoded = base64urlEncode(JSON.stringify(header));
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  const keyBuffer = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Startup validation
  const missing = REQUIRED_SECRETS.filter((s) => !Deno.env.get(s));
  if (missing.length > 0) {
    console.error("[GOOGLE-PASS] Missing secrets:", missing);
    return new Response(JSON.stringify({ error: `Missing secrets: ${missing.join(", ")}` }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const cardCode = url.searchParams.get("card_code");
    if (!cardCode) {
      return new Response(JSON.stringify({ error: "card_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
    // Secrets stored with literal \n — expand to real newlines
    const privateKeyPem = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")!.replace(/\\n/g, "\n");
    const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID")!;

    // Fetch card + customer
    const { data: card, error: cardErr } = await supabase
      .from("customer_cards")
      .select("*, customers(*)")
      .eq("card_code", cardCode)
      .maybeSingle();

    if (cardErr || !card) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", card.business_id)
      .maybeSingle();

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customer = card.customers;
    const classId = `${issuerId}.loyalty_${business.id}`;
    const objectId = `${issuerId}.card_${card.id}`;

    const loyaltyClass = {
      id: classId,
      issuerName: business.name,
      programName: `Fidélité ${business.name}`,
      programLogo: business.logo_url
        ? {
            sourceUri: { uri: business.logo_url },
            contentDescription: { defaultValue: { language: "fr", value: business.name } },
          }
        : undefined,
      hexBackgroundColor: business.primary_color || "#7c3aed",
      reviewStatus: "UNDER_REVIEW",
    };

    const loyaltyObject = {
      id: objectId,
      classId,
      loyaltyPoints: {
        balance: { int: card.current_points || 0 },
        label: business.loyalty_type === "stamps" ? "Tampons" : "Points",
      },
      barcode: {
        type: "QR_CODE",
        value: card.card_code || card.id,
        alternateText: card.card_code || card.id,
      },
      accountId: customer?.id || "unknown",
      accountName: customer?.full_name || "Client",
      heroImage: business.logo_url
        ? {
            sourceUri: { uri: business.logo_url },
            contentDescription: { defaultValue: { language: "fr", value: business.name } },
          }
        : undefined,
      hexBackgroundColor: business.primary_color || "#7c3aed",
      state: "ACTIVE",
    };

    const jwtPayload = {
      iss: serviceAccountEmail,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyClasses: [loyaltyClass],
        loyaltyObjects: [loyaltyObject],
      },
      origins: ["https://fidelispro.vercel.app"],
    };

    const jwt = await signJWT(jwtPayload, privateKeyPem);
    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    return new Response(
      JSON.stringify({
        success: true,
        saveUrl,
        card: {
          points: card.current_points || 0,
          maxPoints: card.max_points || 10,
          customerName: customer?.full_name || "Client",
          businessName: business.name,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[GOOGLE-PASS] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
