import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Pure base64 decoder - no atob dependency
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = new Uint8Array(128);
for (let i = 0; i < B64.length; i++) B64_LOOKUP[B64.charCodeAt(i)] = i;

function b64Decode(input: string): Uint8Array {
  // Remove padding
  let s = input.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor(s.length * 3 / 4));
  let j = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = B64_LOOKUP[s.charCodeAt(i)];
    const b = B64_LOOKUP[s.charCodeAt(i + 1)];
    const c = i + 2 < s.length ? B64_LOOKUP[s.charCodeAt(i + 2)] : 0;
    const d = i + 3 < s.length ? B64_LOOKUP[s.charCodeAt(i + 3)] : 0;
    out[j++] = (a << 2) | (b >> 4);
    if (i + 2 < s.length) out[j++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < s.length) out[j++] = ((c & 3) << 6) | d;
  }
  return out.slice(0, j);
}

function b64Encode(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i += 3) {
    const a = buf[i];
    const b = i + 1 < buf.length ? buf[i + 1] : 0;
    const c = i + 2 < buf.length ? buf[i + 2] : 0;
    s += B64[a >> 2];
    s += B64[((a & 3) << 4) | (b >> 4)];
    s += i + 1 < buf.length ? B64[((b & 15) << 2) | (c >> 6)] : "=";
    s += i + 2 < buf.length ? B64[c & 63] : "=";
  }
  return s;
}

function b64urlDecode(s: string): Uint8Array {
  return b64Decode(s.replace(/-/g, "+").replace(/_/g, "/"));
}

function b64urlEncode(buf: Uint8Array): string {
  return b64Encode(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function concat(...a: Uint8Array[]): Uint8Array {
  const r = new Uint8Array(a.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of a) { r.set(x, o); o += x.length; }
  return r;
}

// ── HKDF (RFC 5869) ─────────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const t = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", key, t));
  return okm.slice(0, len);
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const prk = await hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, len);
}

// ── RFC 8291 info builders ───────────────────────────────────────────

function buildInfo(encoding: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  const prefix = enc.encode("Content-Encoding: " + encoding + "\0");
  const label = enc.encode("P-256\0");
  const clientLen = new Uint8Array([0, 65]);
  const serverLen = new Uint8Array([0, 65]);
  return concat(prefix, label, clientLen, clientPub, serverLen, serverPub);
}

// ── Encrypt payload (RFC 8291 / aesgcm) ──────────────────────────────

async function encryptPayload(
  clientPubBytes: Uint8Array,
  authSecret: Uint8Array,
  plaintext: Uint8Array,
): Promise<{ body: Uint8Array; serverPubBytes: Uint8Array; salt: Uint8Array }> {
  // 1. Generate ephemeral ECDH key pair
  const serverKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const serverPubBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKP.publicKey)
  );

  // 2. Import client public key
  const clientPub = await crypto.subtle.importKey(
    "raw", clientPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  // 3. ECDH shared secret
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPub }, serverKP.privateKey, 256
    )
  );

  // 4. Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. Derive IKM: HKDF(auth_secret, ecdh_secret, "Content-Encoding: auth\0", 32)
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const ikm = await hkdf(authSecret, shared, authInfo, 32);

  // 6. Derive CEK (16 bytes) and nonce (12 bytes)
  const cekInfo = buildInfo("aesgcm", clientPubBytes, serverPubBytes);
  const nonceInfo = buildInfo("nonce", clientPubBytes, serverPubBytes);
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // 7. Pad: 2-byte big-endian padding length + padding + plaintext
  const padLen = 0;
  const padded = new Uint8Array(2 + padLen + plaintext.length);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(plaintext, 2 + padLen);

  // 8. AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey(
    "raw", cek, { name: "AES-GCM" }, false, ["encrypt"]
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );

  return { body: ciphertext, serverPubBytes, salt };
}

// ── VAPID JWT (ES256) ────────────────────────────────────────────────

async function createVapidJwt(
  endpoint: string,
  pubKey: string,
  privKeyB64: string,
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: now + 86400, sub: "mailto:notifications@fidelispro.app" })
    )
  );
  const unsigned = `${header}.${payload}`;

  // Import private key as JWK (works reliably across runtimes)
  const rawPriv = b64urlDecode(privKeyB64);
  const rawPub = b64urlDecode(pubKey);
  // Extract x and y from uncompressed public key (04 || x || y)
  const x = b64urlEncode(rawPub.slice(1, 33));
  const y = b64urlEncode(rawPub.slice(33, 65));
  const d = b64urlEncode(rawPriv);

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sigBuf = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, key,
      new TextEncoder().encode(unsigned)
    )
  );

  // DER → raw r||s (64 bytes)
  let sig = sigBuf;
  if (sig.length !== 64) {
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

// ── Send a single Web Push ───────────────────────────────────────────

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPub: string,
  vapidPriv: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    console.log(`[WebPush] p256dh=${sub.p256dh.slice(0,10)}... auth=${sub.auth.slice(0,10)}... vapidPub=${vapidPub.slice(0,10)}... (len=${vapidPub.length})`);
    const clientPub = b64urlDecode(sub.p256dh);
    const authSecret = b64urlDecode(sub.auth);
    console.log(`[WebPush] clientPub bytes=${clientPub.length}, authSecret bytes=${authSecret.length}`);
    const data = new TextEncoder().encode(payload);

    const { body, serverPubBytes, salt } = await encryptPayload(clientPub, authSecret, data);
    const jwt = await createVapidJwt(sub.endpoint, vapidPub, vapidPriv);
    console.log(`[WebPush] JWT created, sending to ${sub.endpoint.slice(0,60)}...`);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPub}`,
        "Content-Encoding": "aesgcm",
        "Content-Type": "application/octet-stream",
        Encryption: `salt=${b64urlEncode(salt)}`,
        "Crypto-Key": `dh=${b64urlEncode(serverPubBytes)}`,
        TTL: "86400",
        Urgency: "high",
      },
      body,
    });

    const txt = await res.text();
    if (res.status === 201 || res.status === 200) {
      return { ok: true, status: res.status };
    }
    console.error(`[WebPush] ${res.status} ${sub.endpoint.slice(0, 60)}:`, txt);
    return { ok: false, status: res.status, error: txt };
  } catch (err) {
    console.error(`[WebPush] error:`, String(err));
    return { ok: false, error: String(err) };
  }
}

// ── Main handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, title, message, campaign_id, channels } = await req.json();
    const doWebPush = channels?.web_push !== false;
    const doWallet = channels?.apple_wallet !== false;

    if (!business_id || !message) {
      return new Response(
        JSON.stringify({ error: "business_id and message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPub = "BCAQpqqjHGJNpDoHlOt7wenXFdnlpKe_WMSwL0Vvmple6hZuMN7ip5UXF9TN8vBDZ7fHy1u1nODYT2gsiFGMLKE";
    const vapidPriv = "8aTrxSgr5oK-GVYVKR3RH0arR1tQQPRN3MhAGNbEkRo";
    console.log(`[WebPush] vapidPub length=${vapidPub.length}, vapidPriv length=${vapidPriv.length}`);
    const sb = createClient(sbUrl, sbKey);

    let pushed = 0, failed = 0, total = 0;

    if (doWebPush) {
      const { data: subs } = await sb
        .from("web_push_subscriptions")
        .select("*")
        .eq("business_id", business_id);

      const list = subs || [];
      total = list.length;
      const payload = JSON.stringify({
        title: title || "FidéliPro",
        body: message,
        tag: campaign_id || "notification",
      });

      for (const s of list) {
        const r = await sendWebPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          payload, vapidPub, vapidPriv
        );
        if (r.ok) pushed++;
        else {
          failed++;
          if (r.status === 410 || r.status === 404) {
            await sb.from("web_push_subscriptions").delete().eq("id", s.id);
          }
        }
      }
    }

    let walletResult = { pushed: 0, failed: 0 };
    if (doWallet) {
      try {
        const wr = await fetch(`${sbUrl}/functions/v1/wallet-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sbKey}` },
          body: JSON.stringify({ business_id, action_type: "campaign", change_message: message }),
        });
        walletResult = await wr.json();
      } catch {}
    }

    return new Response(
      JSON.stringify({ success: true, web_push: { pushed, failed, total }, wallet_push: walletResult }),
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
