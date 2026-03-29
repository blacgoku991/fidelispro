import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──────────────────────────────────────────────────────────

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const padding = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ── VAPID JWT ────────────────────────────────────────────────────────

async function createVapidJwt(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:notifications@fidelispro.app",
  };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import VAPID private key as PKCS8
  const privKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  // Build PKCS8 wrapper for raw 32-byte EC private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Key = concat(pkcs8Header, privKeyBytes);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Key,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER to raw r||s (64 bytes)
  let sig = new Uint8Array(signatureBuffer);
  if (sig.length !== 64) {
    // DER decode
    const rLen = sig[3];
    const r = sig.slice(4, 4 + rLen);
    const sOffset = 4 + rLen + 2;
    const sLen = sig[sOffset - 1];
    const s = sig.slice(sOffset, sOffset + sLen);
    const rPad = new Uint8Array(32);
    rPad.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    const sPad = new Uint8Array(32);
    sPad.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));
    sig = concat(rPad, sPad);
  }

  const sigB64 = uint8ArrayToBase64Url(sig);
  return `${unsignedToken}.${sigB64}`;
}

// ── RFC 8291 Encryption ──────────────────────────────────────────────

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // HKDF-Extract: PRK = HMAC-SHA256(salt, IKM) — salt is the key, IKM is the message
  const saltKey = await crypto.subtle.importKey(
    "raw",
    salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));

  // HKDF-Expand: OKM = HMAC-SHA256(PRK, info || 0x01)
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const buf = new Uint8Array(18 + typeBytes.length + 1 + 5 + 2 + 65 + 2 + 65);
  let offset = 0;

  // "Content-Encoding: " + type + "\0"
  const prefix = new TextEncoder().encode("Content-Encoding: ");
  buf.set(prefix, offset); offset += prefix.length;
  buf.set(typeBytes, offset); offset += typeBytes.length;
  buf[offset++] = 0;

  // "P-256" + "\0"
  const p256 = new TextEncoder().encode("P-256");
  buf.set(p256, offset); offset += p256.length;
  buf[offset++] = 0;

  // Client key length (2 bytes) + key (65 bytes)
  buf[offset++] = 0;
  buf[offset++] = 65;
  buf.set(clientPublicKey, offset); offset += 65;

  // Server key length (2 bytes) + key (65 bytes)
  buf[offset++] = 0;
  buf[offset++] = 65;
  buf.set(serverPublicKey, offset); offset += 65;

  return buf.slice(0, offset);
}

async function encryptPayload(
  clientPublicKeyBytes: Uint8Array,
  clientAuthSecret: Uint8Array,
  payload: Uint8Array
): Promise<{ encrypted: Uint8Array; serverPublicKeyBytes: Uint8Array; salt: Uint8Array }> {
  // Generate ephemeral server ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeys.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF extract + expand for IKM
  // ikm = HKDF(auth, shared_secret, "Content-Encoding: auth\0", 32)
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const ikm = await hkdf(clientAuthSecret, sharedSecret, authInfo, 32);

  // Derive content encryption key
  const cekInfo = createInfo("aesgcm", clientPublicKeyBytes, serverPublicKeyBytes);
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // Derive nonce
  const nonceInfo = createInfo("nonce", clientPublicKeyBytes, serverPublicKeyBytes);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload (2 bytes padding length + padding + payload)
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payload.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payload, 2 + paddingLength);

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encryptedBuffer),
    serverPublicKeyBytes,
    salt,
  };
}

// ── Send Web Push ────────────────────────────────────────────────────

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const clientPublicKey = base64UrlToUint8Array(subscription.p256dh);
    const clientAuth = base64UrlToUint8Array(subscription.auth);
    const payloadBytes = new TextEncoder().encode(payload);

    // Encrypt payload per RFC 8291
    const { encrypted, serverPublicKeyBytes, salt } = await encryptPayload(
      clientPublicKey,
      clientAuth,
      payloadBytes
    );

    // Create VAPID JWT
    const jwt = await createVapidJwt(subscription.endpoint, vapidPublicKey, vapidPrivateKey);

    // Build request
    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Encoding": "aesgcm",
        "Content-Type": "application/octet-stream",
        Encryption: `salt=${uint8ArrayToBase64Url(salt)}`,
        "Crypto-Key": `dh=${uint8ArrayToBase64Url(serverPublicKeyBytes)}`,
        TTL: "86400",
        Urgency: "high",
      },
      body: encrypted,
    });

    if (res.status === 201 || res.status === 200) {
      return { success: true, status: res.status };
    }
    const errorText = await res.text();
    console.error(`Push failed [${res.status}]:`, errorText);
    return { success: false, status: res.status, error: errorText };
  } catch (err) {
    console.error("Push error:", err);
    return { success: false, error: String(err) };
  }
}

// ── Main Handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, title, message, segment, campaign_id, channels } = await req.json();
    const sendWebPushChannel = channels?.web_push !== false;
    const sendWalletChannel = channels?.apple_wallet !== false;

    if (!business_id || !message) {
      return new Response(
        JSON.stringify({ error: "business_id and message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      const payload = JSON.stringify({
        title: title || "FidéliPro",
        body: message,
        tag: campaign_id || "notification",
      });

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
          console.error(`Failed push to ${sub.endpoint}:`, result.error);
          if (result.status === 410 || result.status === 404) {
            await supabase.from("web_push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    let walletResult = { pushed: 0, failed: 0 };
    if (sendWalletChannel) {
      try {
        const walletRes = await fetch(`${supabaseUrl}/functions/v1/wallet-push`, {
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
        });
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
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
