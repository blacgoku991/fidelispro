// Apple PassKit Web Service — handles device registration, pass updates
// Spec: https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes

import { createClient } from "npm:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";
import JSZip from "npm:jszip@3.10.1";

const PASS_TYPE_ID = "pass.app.lovable.fidelispro";

const ICON_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAYAAABWk2cPAAAAgklEQVR4nGPkF9f6z0BnwERvCwfMUhZcEh9eXL1LqeECEtrK2MSx+pQaFuIzhxE9ISErxOVSUi1EN4eJWIWkAmT96D7GGryUWkjInJGTZUYtHbV01NJRS0ctHSSW0rrlgGIpvoqXEgvR61WM5go1LEQG2CryAWk5YPUprcHgSb20BgDttTV1QCPBRwAAAABJRU5ErkJggg==";

const ICON_2X_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAYAAADhu0ooAAAA7ElEQVR4nO2aOxLCMAxECUMPHenp4P5HoaSn5AZJReMJjj7Bclb7eo/1Zh2lkIbz9T4dEnCMLqAVFEWDomikET15Dn/ez9dWhUi4jI+b9exg+Y+2FiyxCKufbrSktQZxoj0ILiFNN00zEiVaS9PTIDR4a1gV/XVBK8ESaz2mpxsl6bm7KtprA1pirVZ1opFpempI03UpigZF0aAoGhRFg6JoUBQNiqJBUTQoigZF0aAoGhRFI80guCraw/hByl+maZGpWu/mIFhzUSTcYShQ7xn1kqz2k0kzCDZtjn2BX5HbI2maEUXRoCgaaURn7+ldg7yB9K8AAAAASUVORK5CYII=";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // Strip the base function path to get the route
  const pathParts = url.pathname.replace(/^\/wallet-webservice\/?/, "").replace(/^functions\/v1\/wallet-webservice\/?/, "");
  const segments = pathParts.split("/").filter(Boolean);

  console.log(`[PassKit WS] ${req.method} ${url.pathname} -> segments:`, segments);

  // Route: POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
  // → Register device for pass updates
  if (req.method === "POST" && segments[0] === "v1" && segments[1] === "devices" && segments[3] === "registrations") {
    return handleRegisterDevice(req, segments[2], segments[4], segments[5]);
  }

  // Route: DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
  // → Unregister device
  if (req.method === "DELETE" && segments[0] === "v1" && segments[1] === "devices" && segments[3] === "registrations") {
    return handleUnregisterDevice(req, segments[2], segments[4], segments[5]);
  }

  // Route: GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=...
  // → Get serial numbers of updated passes
  if (req.method === "GET" && segments[0] === "v1" && segments[1] === "devices" && segments[3] === "registrations") {
    return handleGetSerialNumbers(segments[2], segments[4], url.searchParams.get("passesUpdatedSince"));
  }

  // Route: GET /v1/passes/{passTypeIdentifier}/{serialNumber}
  // → Fetch latest pass
  if (req.method === "GET" && segments[0] === "v1" && segments[1] === "passes") {
    return handleGetLatestPass(req, segments[2], segments[3]);
  }

  // Route: POST /v1/log
  // → Receive log messages from devices
  if (req.method === "POST" && segments[0] === "v1" && segments[1] === "log") {
    const body = await req.json().catch(() => ({}));
    console.log("[PassKit WS] Device log:", JSON.stringify(body));
    return new Response("", { status: 200 });
  }

  console.log("[PassKit WS] No route matched");
  return new Response("Not found", { status: 404 });
});

// ── Register device ────────────────────────────────────────────────

async function handleRegisterDevice(
  req: Request,
  deviceLibraryId: string,
  passTypeId: string,
  serialNumber: string
): Promise<Response> {
  console.log(`[PassKit WS] Register device=${deviceLibraryId} pass=${passTypeId} serial=${serialNumber}`);

  const authToken = extractAuthToken(req);
  if (!authToken) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabase();

  // Validate auth token against card
  const { data: card } = await supabase
    .from("customer_cards")
    .select("id, business_id, customer_id, wallet_auth_token")
    .eq("id", serialNumber)
    .maybeSingle();

  if (!card || card.wallet_auth_token !== authToken) {
    console.log("[PassKit WS] Auth token mismatch");
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse push token from body
  const body = await req.json().catch(() => ({}));
  const pushToken = body?.pushToken;
  if (!pushToken) {
    console.log("[PassKit WS] Missing pushToken in body");
    return new Response("Missing pushToken", { status: 400 });
  }

  // Upsert registration
  const { error } = await supabase.from("wallet_registrations").upsert(
    {
      device_library_id: deviceLibraryId,
      pass_type_id: passTypeId,
      serial_number: serialNumber,
      push_token: pushToken,
      authentication_token: authToken,
      customer_id: card.customer_id,
      business_id: card.business_id,
      card_id: card.id,
    },
    { onConflict: "device_library_id,pass_type_id,serial_number" }
  );

  if (error) {
    console.error("[PassKit WS] Registration error:", error);
    return new Response("Server error", { status: 500 });
  }

  // Mark card as wallet-installed
  await supabase
    .from("customer_cards")
    .update({ wallet_installed_at: new Date().toISOString() })
    .eq("id", card.id);

  console.log(`[PassKit WS] Device registered successfully`);
  // 201 = new registration, 200 = already existed
  return new Response("", { status: 201 });
}

// ── Unregister device ──────────────────────────────────────────────

async function handleUnregisterDevice(
  req: Request,
  deviceLibraryId: string,
  passTypeId: string,
  serialNumber: string
): Promise<Response> {
  console.log(`[PassKit WS] Unregister device=${deviceLibraryId} serial=${serialNumber}`);

  const authToken = extractAuthToken(req);
  if (!authToken) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabase();

  const { error } = await supabase
    .from("wallet_registrations")
    .delete()
    .eq("device_library_id", deviceLibraryId)
    .eq("pass_type_id", passTypeId)
    .eq("serial_number", serialNumber);

  if (error) console.error("[PassKit WS] Unregister error:", error);

  return new Response("", { status: 200 });
}

// ── Get updated serial numbers ─────────────────────────────────────

async function handleGetSerialNumbers(
  deviceId: string,
  passTypeId: string,
  passesUpdatedSince: string | null
): Promise<Response> {
  console.log(`[PassKit WS] Get serials device=${deviceId} since=${passesUpdatedSince}`);

  const supabase = getSupabase();

  let query = supabase
    .from("wallet_registrations")
    .select("serial_number, updated_at")
    .eq("device_library_id", deviceId)
    .eq("pass_type_id", passTypeId);

  if (passesUpdatedSince) {
    query = query.gt("updated_at", passesUpdatedSince);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[PassKit WS] Get serials error:", error);
    return new Response("Server error", { status: 500 });
  }

  if (!data || data.length === 0) {
    return new Response(null, { status: 204 });
  }

  return new Response(
    JSON.stringify({
      serialNumbers: data.map((r) => r.serial_number),
      lastUpdated: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ── Get latest pass ────────────────────────────────────────────────

async function handleGetLatestPass(
  req: Request,
  passTypeId: string,
  serialNumber: string
): Promise<Response> {
  console.log(`[PassKit WS] Get latest pass type=${passTypeId} serial=${serialNumber}`);

  const authToken = extractAuthToken(req);
  if (!authToken) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabase();

  // Get card + customer + business
  const { data: card } = await supabase
    .from("customer_cards")
    .select("*, customers(*)")
    .eq("id", serialNumber)
    .maybeSingle();

  if (!card || card.wallet_auth_token !== authToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", card.business_id)
    .maybeSingle();

  if (!business) return new Response("Not found", { status: 404 });

  // Update last fetched timestamp
  await supabase
    .from("customer_cards")
    .update({ wallet_last_fetched_at: new Date().toISOString() })
    .eq("id", card.id);

  // Build and return the updated .pkpass
  try {
    const pkpass = await buildPkpassForUpdate(card, business, card.customers, card.wallet_auth_token);
    return new Response(pkpass, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Last-Modified": new Date().toUTCString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[PassKit WS] Error building pass:", err);
    return new Response("Server error", { status: 500 });
  }
}

// ── Build pkpass (same logic as generate-pass) ─────────────────────

async function buildPkpassForUpdate(
  card: any,
  business: any,
  customer: any,
  authToken: string
): Promise<Uint8Array> {
  const teamId = Deno.env.get("APPLE_TEAM_ID")!.trim();
  const p12Base64 = Deno.env.get("APPLE_P12_BASE64")!;
  const p12Password = Deno.env.get("APPLE_P12_PASSWORD")!;

  const { signerCert, signerKey, certificateChain } = extractSigningMaterial(p12Base64, p12Password);
  const iconPng = decodeBase64(ICON_PNG_BASE64);
  const icon2xPng = decodeBase64(ICON_2X_PNG_BASE64);

  const bgColor = hexToRgb(business.primary_color || "#6B46C1");
  const level = (customer?.level || "bronze").toLowerCase();
  const pointsCurrent = card.current_points || 0;
  const pointsMax = card.max_points || 10;
  const pointsToReward = pointsMax - pointsCurrent;
  const latestOffer = card.wallet_change_message || "";
  const levelEmoji = level === "gold" ? "⭐" : level === "silver" ? "🥈" : "🥉";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const passJson: any = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    serialNumber: card.id,
    teamIdentifier: teamId,
    organizationName: business.name,
    description: `Carte de fidélité ${business.name}`,
    logoText: business.name,
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: bgColor,
    labelColor: "rgb(255, 255, 255)",
    webServiceURL: `${supabaseUrl}/functions/v1/wallet-webservice`,
    authenticationToken: authToken,
    barcode: { message: card.card_code, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" },
    barcodes: [{ message: card.card_code, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" }],
    storeCard: {
      headerFields: [
        {
          key: "points",
          label: "POINTS",
          value: pointsCurrent,
          textAlignment: "PKTextAlignmentRight",
          changeMessage: "Vous avez gagné %@ points !",
        },
      ],
      primaryFields: [{ key: "name", label: "CLIENT", value: customer?.full_name || "Client" }],
      secondaryFields: [
        { key: "level", label: "STATUT", value: `${levelEmoji} ${level.toUpperCase()}` },
        { key: "progress", label: "PROGRESSION", value: `${pointsCurrent} / ${pointsMax}`, textAlignment: "PKTextAlignmentRight" },
        {
          key: "offer",
          label: "OFFRE DU JOUR",
          value: latestOffer,
          changeMessage: "%@",
        },
      ],
      auxiliaryFields: [
        { key: "rewards", label: "RÉCOMPENSES", value: `${card.rewards_earned || 0} obtenues` },
        {
          key: "next_reward",
          label: "PROCHAINE",
          value: pointsToReward > 0 ? `${pointsToReward} pts restants` : "🎁 Disponible !",
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      backFields: [
        { key: "reward_info", label: "🎁 Récompense", value: business.reward_description || "Récompense offerte !" },
        { key: "visits", label: "📊 Statistiques", value: `Visites : ${customer?.total_visits || 0}\nStreak : ${customer?.current_streak || 0} jours` },
        { key: "info", label: "ℹ️ À propos", value: `Programme de fidélité ${business.name}.` },
        { key: "powered", label: "", value: "Propulsé par FidéliPro" },
      ],
    },
  };

  const passJsonStr = JSON.stringify(passJson);
  const passJsonBytes = new TextEncoder().encode(passJsonStr);

  const manifest: Record<string, string> = {
    "pass.json": sha1Hex(passJsonBytes),
    "icon.png": sha1Hex(iconPng),
    "icon@2x.png": sha1Hex(icon2xPng),
  };
  const manifestStr = JSON.stringify(manifest);
  const manifestBytes = new TextEncoder().encode(manifestStr);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestStr, "utf8");
  p7.addCertificate(signerCert);
  for (const cert of certificateChain) p7.addCertificate(cert);
  p7.addSigner({
    key: signerKey,
    certificate: signerCert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });

  const sigDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const sigBytes = new Uint8Array(sigDer.length);
  for (let i = 0; i < sigDer.length; i++) sigBytes[i] = sigDer.charCodeAt(i);

  const zip = new JSZip();
  zip.file("pass.json", passJsonBytes);
  zip.file("manifest.json", manifestBytes);
  zip.file("signature", sigBytes);
  zip.file("icon.png", iconPng);
  zip.file("icon@2x.png", icon2xPng);

  return zip.generateAsync({ type: "uint8array" });
}

// ── Helpers ────────────────────────────────────────────────────────

function extractAuthToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") || "";
  if (auth.startsWith("ApplePass ")) return auth.slice(10);
  return null;
}

function sha1Hex(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(forge.util.binary.raw.encode(data));
  return md.digest().toHex();
}

function decodeBase64(b64: string): Uint8Array {
  const raw = forge.util.decode64(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function extractSigningMaterial(p12Base64: string, p12Password: string) {
  const p12Der = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);
  let signerKey: any = null;
  const certs: any[] = [];
  for (const sc of p12.safeContents) {
    for (const sb of sc.safeBags) {
      if (sb.type === forge.pki.oids.certBag && sb.cert) certs.push(sb.cert);
      if (sb.type === forge.pki.oids.pkcs8ShroudedKeyBag && sb.key) signerKey = sb.key;
    }
  }
  if (!signerKey || certs.length === 0) throw new Error("Cannot extract .p12");
  const signerCert =
    certs.find((c) => c?.publicKey?.n && signerKey?.n && c.publicKey.n.compareTo(signerKey.n) === 0) ||
    certs.find((c) => (c?.subject?.getField?.("CN")?.value || "").includes("Pass Type ID")) ||
    certs[0];
  return { signerCert, signerKey, certificateChain: certs.filter((c) => c !== signerCert) };
}

function hexToRgb(hex: string): string {
  const n = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#6B46C1";
  return `rgb(${parseInt(n.slice(1, 3), 16)}, ${parseInt(n.slice(3, 5), 16)}, ${parseInt(n.slice(5, 7), 16)})`;
}
