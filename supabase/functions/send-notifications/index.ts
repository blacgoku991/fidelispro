import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──────────────────────────────────────────────────────────

function b64urlDecode(s: string): Uint8Array {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}

function b64urlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const r = new Uint8Array(arrays.reduce((s, a) => s + a.length, 0));
  let off = 0;
  for (const a of arrays) { r.set(a, off); off += a.length; }
  return r;
}

// ── HKDF (RFC 5869) ─────────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", key, concat(info, new Uint8Array([1]))));
  return okm.slice(0, len);
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  return hkdfExpand(await hkdfExtract(salt, ikm), info, len);
}

// ── RFC 8291 aes128gcm encryption ───────────────────────────────────

function buildInfo(type: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  return concat(
    enc.encode("Content-Encoding: " + type + "\0"),
    enc.encode("P-256\0"),
    new Uint8Array([0, 65]), clientPub,
    new Uint8Array([0, 65]), serverPub,
  );
}

async function encryptPayload(
  clientPubBytes: Uint8Array,
  authSecret: Uint8Array,
  plaintext: Uint8Array,
): Promise<{ body: Uint8Array; serverPubBytes: Uint8Array; salt: Uint8Array }> {
  const serverKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"],
  );
  const serverPubBytes = new Uint8Array(await crypto.subtle.exportKey("raw", serverKP.publicKey));

  const clientPub = await crypto.subtle.importKey(
    "raw", clientPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, [],
  );

  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientPub }, serverKP.privateKey, 256),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM from auth secret
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const ikm = await hkdf(authSecret, shared, concat(authInfo, clientPubBytes, serverPubBytes), 32);

  // CEK and nonce
  const cekInfo = concat(new TextEncoder().encode("Content-Encoding: aes128gcm\0"));
  const nonceInfo = concat(new TextEncoder().encode("Content-Encoding: nonce\0"));
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad: plaintext + delimiter byte 0x02
  const padded = concat(plaintext, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  // aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = concat(salt, rs, new Uint8Array([65]), serverPubBytes);

  return { body: concat(header, ciphertext), serverPubBytes, salt };
}

// ── VAPID JWT (ES256; supports PKCS8 or raw 32-byte private key) ─────

function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function importVapidPrivateKey(priv: string, vapidPub: string): Promise<CryptoKey> {
  const v = (priv || "").trim();

  // 1) PEM PKCS#8
  if (v.includes("BEGIN PRIVATE KEY")) {
    const bytes = pemToBytes(v);
    return crypto.subtle.importKey(
      "pkcs8",
      bytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  }

  // 2) Base64/base64url input
  const keyBytes = b64urlDecode(v);

  // 2a) Raw 32-byte private key (web-push style)
  if (keyBytes.length === 32) {
    const pubBytes = b64urlDecode(vapidPub);
    if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
      throw new Error("Invalid VAPID_PUBLIC_KEY format (expected uncompressed P-256 key)");
    }

    const x = b64urlEncode(pubBytes.slice(1, 33));
    const y = b64urlEncode(pubBytes.slice(33, 65));
    const d = b64urlEncode(keyBytes);

    return crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x, y, d, ext: true, key_ops: ["sign"] },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  }

  // 2b) PKCS#8 bytes (base64/base64url encoded)
  return crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function createVapidJwt(
  endpoint: string,
  vapidSubject: string,
  privKey: string,
  vapidPub: string,
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const encodeJson = (obj: object) =>
    b64urlEncode(new TextEncoder().encode(JSON.stringify(obj)));

  const header = encodeJson({ typ: "JWT", alg: "ES256" });
  const payload = encodeJson({ aud: audience, exp: now + 43200, sub: vapidSubject });
  const unsigned = `${header}.${payload}`;

  const key = await importVapidPrivateKey(privKey, vapidPub);

  const sigBuf = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsigned),
    ),
  );

  // Deno uses raw r||s (64 bytes) but handle DER just in case
  let sig = sigBuf;
  if (sig.length !== 64 && sig[0] === 0x30) {
    const rLen = sig[3];
    const r = sig.slice(4, 4 + rLen);
    const sOff = 4 + rLen + 2;
    const sLen = sig[sOff - 1];
    const s = sig.slice(sOff, sOff + sLen);
    const rP = new Uint8Array(32);
    rP.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    const sP = new Uint8Array(32);
    sP.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));
    sig = concat(rP, sP);
  }

  return `${unsigned}.${b64urlEncode(sig)}`;
}

// ── Send a single push ──────────────────────────────────────────────

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payloadStr: string,
  vapidPub: string,
  vapidPriv: string,
  vapidSubject: string,
): Promise<{ ok: boolean; status?: number }> {
  try {
    const clientPub = b64urlDecode(sub.p256dh);
    const authSecret = b64urlDecode(sub.auth);
    const data = new TextEncoder().encode(payloadStr);

    const { body } = await encryptPayload(clientPub, authSecret, data);
    const jwt = await createVapidJwt(sub.endpoint, vapidSubject, vapidPriv, vapidPub);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPub}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body,
    });

    if (res.status === 201 || res.status === 200) return { ok: true, status: res.status };
    const txt = await res.text();
    console.error(`[WebPush] ${res.status}: ${txt}`);
    return { ok: false, status: res.status };
  } catch (err) {
    console.error("[WebPush] error:", String(err));
    return { ok: false };
  }
}

// ── Main handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { business_id, title, message, body: bodyField, campaign_id, channels } = await req.json();
    const messageText = message || bodyField;

    if (!business_id || !messageText) {
      return new Response(
        JSON.stringify({ error: "business_id and message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const doWebPush = channels?.web_push !== false && channels?.webpush !== false;
    const doWallet = channels?.apple_wallet !== false && channels?.wallet !== false;

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPub = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
    const vapidPriv = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@fidelispro.app";
    const sb = createClient(sbUrl, sbKey);

    let webpushSent = 0, webpushFailed = 0, webpushTotal = 0;

    // ── WEB PUSH ──
    if (doWebPush && vapidPub && vapidPriv) {
      const { data: subs } = await sb
        .from("web_push_subscriptions")
        .select("*")
        .eq("business_id", business_id);

      const list = subs || [];
      webpushTotal = list.length;

      const payload = JSON.stringify({
        title: title || "FidéliPro",
        body: messageText,
        url: "/",
      });

      for (const s of list) {
        const r = await sendPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          payload, vapidPub, vapidPriv, vapidSubject,
        );
        if (r.ok) {
          webpushSent++;
        } else {
          webpushFailed++;
          if (r.status === 410 || r.status === 404) {
            await sb.from("web_push_subscriptions").delete().eq("id", s.id);
          }
        }
      }
    }

    // ── APPLE WALLET ──
    let walletSent = 0;
    if (doWallet) {
      try {
        const wr = await fetch(`${sbUrl}/functions/v1/wallet-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sbKey}` },
          body: JSON.stringify({ business_id, action_type: "campaign", change_message: messageText }),
        });
        const walletResult = await wr.json();
        walletSent = walletResult.pushed || 0;
      } catch (e) {
        console.error("Wallet push error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        webpush: { sent: webpushSent, failed: webpushFailed, total: webpushTotal },
        wallet: { sent: walletSent },
        total: webpushSent + walletSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-notifications error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
