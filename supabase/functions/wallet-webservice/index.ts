// Apple PassKit Web Service — handles device registration, pass updates
// Spec: https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes

import { createClient } from "npm:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";
import JSZip from "npm:jszip@3.10.1";

const PASS_TYPE_ID = Deno.env.get("APPLE_PASS_TYPE_ID") || "pass.app.fidelispro";

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
  const rawPathname = url.pathname;

  // Supabase Edge Functions receive the full URL pathname, e.g.:
  //   /functions/v1/wallet-webservice/v1/devices/{id}/registrations/{passType}/{serial}
  // Strip the Supabase function prefix to isolate the Apple PassKit sub-path.
  const pathParts = rawPathname
    .replace(/^\/functions\/v1\/wallet-webservice\/?/, "")  // Supabase standard prefix
    .replace(/^\/wallet-webservice\/?/, "")                  // Fallback: function-name only
    .replace(/^\//, "");                                      // Remove any remaining leading slash
  const segments = pathParts.split("/").filter(Boolean);

  console.log(`[PassKit WS] ▶ ${req.method} raw=${rawPathname}`);
  console.log(`[PassKit WS]   pathParts="${pathParts}" segments=[${segments.join(",")}]`);
  console.log(`[PassKit WS]   Authorization=${req.headers.get("Authorization")?.slice(0, 20)}...`);

  // Route: POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
  if (req.method === "POST" && segments[0] === "v1" && segments[1] === "devices" && segments[3] === "registrations") {
    return handleRegisterDevice(req, segments[2], segments[4], segments[5]);
  }

  // Route: DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
  if (req.method === "DELETE" && segments[0] === "v1" && segments[1] === "devices" && segments[3] === "registrations") {
    return handleUnregisterDevice(req, segments[2], segments[4], segments[5]);
  }

  // Route: GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=...
  if (req.method === "GET" && segments[0] === "v1" && segments[1] === "devices" && segments[3] === "registrations") {
    return handleGetSerialNumbers(segments[2], segments[4], url);
  }

  // Route: GET /v1/passes/{passTypeIdentifier}/{serialNumber}
  if (req.method === "GET" && segments[0] === "v1" && segments[1] === "passes") {
    return handleGetLatestPass(req, segments[2], segments[3]);
  }

  // Route: POST /v1/log
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
  console.log(`[PassKit WS] ── REGISTER device=${deviceLibraryId?.slice(0, 12)}... pass=${passTypeId} serial=${serialNumber}`);

  const authToken = extractAuthToken(req);
  if (!authToken) {
    console.log("[PassKit WS]   ✗ No ApplePass auth token in header");
    return new Response("Unauthorized", { status: 401 });
  }
  console.log(`[PassKit WS]   authToken present, length=${authToken.length}`);

  const supabase = getSupabase();

  const { data: card, error: cardErr } = await supabase
    .from("customer_cards")
    .select("id, business_id, customer_id, wallet_auth_token")
    .eq("id", serialNumber)
    .maybeSingle();

  if (cardErr) {
    console.error("[PassKit WS]   ✗ DB error fetching card:", cardErr.message);
    return new Response("Server error", { status: 500 });
  }
  if (!card) {
    console.log(`[PassKit WS]   ✗ No card found for serialNumber=${serialNumber}`);
    return new Response("Unauthorized", { status: 401 });
  }
  if (card.wallet_auth_token !== authToken) {
    console.log(`[PassKit WS]   ✗ Auth token mismatch: pass has len=${authToken.length} DB has len=${card.wallet_auth_token?.length ?? 0}`);
    return new Response("Unauthorized", { status: 401 });
  }
  console.log(`[PassKit WS]   ✓ Card found, business=${card.business_id}`);

  const body = await req.json().catch(() => ({}));
  const pushToken = body?.pushToken;
  if (!pushToken) {
    console.log("[PassKit WS]   ✗ Missing pushToken in request body");
    return new Response("Missing pushToken", { status: 400 });
  }
  console.log(`[PassKit WS]   pushToken present, suffix=...${pushToken.slice(-8)}`);

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
    console.error("[PassKit WS]   ✗ Upsert error:", error.message, error.code);
    return new Response("Server error", { status: 500 });
  }
  console.log(`[PassKit WS]   ✓ Registration upserted successfully`);

  await supabase
    .from("customer_cards")
    .update({ wallet_installed_at: new Date().toISOString() })
    .eq("id", card.id);

  console.log(`[PassKit WS] Device registered successfully`);
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
  url: URL
): Promise<Response> {
  const rawSince = url.searchParams.get("passesUpdatedSince");
  const since = normalizePassesUpdatedSince(rawSince);
  console.log(`[PassKit WS] Get serials device=${deviceId} rawSince=${rawSince} normalized=${since}`);

  const supabase = getSupabase();

  let query = supabase
    .from("wallet_registrations")
    .select("serial_number, updated_at")
    .eq("device_library_id", deviceId)
    .eq("pass_type_id", passTypeId);

  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[PassKit WS] Get serials error:", error);
    return new Response("Server error", { status: 500 });
  }

  if (!data || data.length === 0) {
    console.log("[PassKit WS] No updated serials found → 204");
    return new Response(null, { status: 204 });
  }

  const response = {
    serialNumbers: data.map((r) => r.serial_number),
    lastUpdated: new Date().toISOString(),
  };

  console.log(`[PassKit WS] Returning ${data.length} serial(s) → 200`, response);

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizePassesUpdatedSince(value: string | null): string | null {
  if (!value) return null;
  // URLSearchParams turns '+' into ' ' in timezone offsets like +00:00
  let normalized = value.replace(/\s(\d{2}:\d{2})$/, "+$1");
  // Also handle case where the whole thing got mangled
  try {
    const d = new Date(normalized);
    if (isNaN(d.getTime())) {
      console.log(`[PassKit WS] Could not parse passesUpdatedSince: ${value}, returning null to fetch all`);
      return null;
    }
    return d.toISOString();
  } catch {
    return null;
  }
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

  await supabase
    .from("customer_cards")
    .update({ wallet_last_fetched_at: new Date().toISOString() })
    .eq("id", card.id);

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

// ── Build pkpass (same logic as generate-pass, with logo + strip) ──

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

  // Fetch business logo for icons and logo
  const { iconPng, icon2xPng, icon3xPng } = await fetchOrGenerateIcons(business);
  const { logoPng, logo2xPng } = await fetchOrGenerateLogo(business);
  const { stripPng, strip2xPng } = generateStripImages(business.primary_color || "#6B46C1");

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
        {
          key: "offer",
          label: "OFFRE DU JOUR",
          value: latestOffer,
          changeMessage: "%@",
        },
      ],
      auxiliaryFields: [
        { key: "progress", label: "PROGRESSION", value: `${pointsCurrent} / ${pointsMax}` },
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

  // Apple Wallet native geofencing with satellite points
  if (business.geofence_enabled && business.latitude && business.longitude) {
    const lat = parseFloat(String(business.latitude));
    const lng = parseFloat(String(business.longitude));
    const relevantText = business.geofence_message || `Passez nous voir chez ${business.name} !`;

    const locations: any[] = [{ latitude: lat, longitude: lng, relevantText }];

    // Add manually placed satellite points
    const satellites = Array.isArray(business.geofence_satellite_points) ? business.geofence_satellite_points : [];
    for (const pt of satellites) {
      if (pt?.lat && pt?.lng && locations.length < 10) {
        locations.push({
          latitude: parseFloat(String(pt.lat)),
          longitude: parseFloat(String(pt.lng)),
          relevantText,
        });
      }
    }

    passJson.locations = locations;
    passJson.maxDistance = business.geofence_radius || 200;
  }

  const passJsonStr = JSON.stringify(passJson);
  const passJsonBytes = new TextEncoder().encode(passJsonStr);

  const manifest: Record<string, string> = {
    "pass.json": sha1Hex(passJsonBytes),
    "icon.png": sha1Hex(iconPng),
    "icon@2x.png": sha1Hex(icon2xPng),
    "icon@3x.png": sha1Hex(icon3xPng),
    "logo.png": sha1Hex(logoPng),
    "logo@2x.png": sha1Hex(logo2xPng),
    "strip.png": sha1Hex(stripPng),
    "strip@2x.png": sha1Hex(strip2xPng),
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
  zip.file("icon@3x.png", icon3xPng);
  zip.file("logo.png", logoPng);
  zip.file("logo@2x.png", logo2xPng);
  zip.file("strip.png", stripPng);
  zip.file("strip@2x.png", strip2xPng);

  return zip.generateAsync({ type: "uint8array" });
}

// ── Icon helpers (square, for notification icon) ─────────────────

async function fetchOrGenerateIcons(business: any): Promise<{ iconPng: Uint8Array; icon2xPng: Uint8Array; icon3xPng: Uint8Array }> {
  // Try to use business logo for notification icons so the logo appears on lock screen
  if (business.logo_url) {
    try {
      const logoUrl = business.logo_url.split("?")[0];
      const response = await fetch(logoUrl);
      if (response.ok) {
        const imageBytes = new Uint8Array(await response.arrayBuffer());
        return { iconPng: imageBytes, icon2xPng: imageBytes, icon3xPng: imageBytes };
      }
    } catch (err) {
      console.error("[Pass] Failed to fetch logo for icons, using fallback:", err);
    }
  }
  const color = business.primary_color || "#6B46C1";
  const iconPng   = generateSolidColorPng(29, 29, color);
  const icon2xPng = generateSolidColorPng(58, 58, color);
  const icon3xPng = generateSolidColorPng(87, 87, color);
  return { iconPng, icon2xPng, icon3xPng };
}

// ── Logo helpers (rectangular, shown on card front) ──────────────

async function fetchOrGenerateLogo(business: any): Promise<{ logoPng: Uint8Array; logo2xPng: Uint8Array }> {
  if (business.logo_url) {
    try {
      const logoUrl = business.logo_url.split("?")[0];
      const response = await fetch(logoUrl);
      if (response.ok) {
        const imageBytes = new Uint8Array(await response.arrayBuffer());
        return { logoPng: imageBytes, logo2xPng: imageBytes };
      }
    } catch (err) {
      console.error("[Pass] Failed to fetch logo, using fallback:", err);
    }
  }

  const logoPng = generateSolidColorPng(160, 50, business.primary_color || "#6B46C1");
  const logo2xPng = generateSolidColorPng(320, 100, business.primary_color || "#6B46C1");
  return { logoPng, logo2xPng };
}

// ── Strip image generation ────────────────────────────────────────

function generateStripImages(hexColor: string): { stripPng: Uint8Array; strip2xPng: Uint8Array } {
  const stripPng = generateStripPng(320, 123, hexColor);
  const strip2xPng = generateStripPng(640, 246, hexColor);
  return { stripPng, strip2xPng };
}

function generateStripPng(width: number, height: number, hexColor: string): Uint8Array {
  const hex = /^#[0-9A-Fa-f]{6}$/.test(hexColor) ? hexColor : "#6B46C1";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      const stripe = ((x + y) % 16) < 4;
      const lightness = stripe ? 20 : 0;
      const gradientDarken = Math.floor((y / height) * 30);
      const pr = Math.min(255, Math.max(0, r + lightness - gradientDarken));
      const pg = Math.min(255, Math.max(0, g + lightness - gradientDarken));
      const pb = Math.min(255, Math.max(0, b + lightness - gradientDarken));
      rawData.push(pr, pg, pb, 255);
    }
  }

  return buildPngFromRaw(width, height, new Uint8Array(rawData));
}

function generateSolidColorPng(width: number, height: number, hexColor: string): Uint8Array {
  const hex = /^#[0-9A-Fa-f]{6}$/.test(hexColor) ? hexColor : "#6B46C1";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b, 255);
    }
  }

  return buildPngFromRaw(width, height, new Uint8Array(rawData));
}

function buildPngFromRaw(width: number, height: number, rawBytes: Uint8Array): Uint8Array {
  const compressed = deflateRaw(rawBytes);
  const chunks: Uint8Array[] = [];
  chunks.push(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));

  const ihdr = new Uint8Array(13);
  writeUint32BE(ihdr, 0, width);
  writeUint32BE(ihdr, 4, height);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(makeChunk("IHDR", ihdr));
  chunks.push(makeChunk("IDAT", compressed));
  chunks.push(makeChunk("IEND", new Uint8Array(0)));

  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const png = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) { png.set(c, offset); offset += c.length; }
  return png;
}

// ── PNG helpers ───────────────────────────────────────────────────

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  writeUint32BE(chunk, 0, data.length);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + data.length));
  writeUint32BE(chunk, 8 + data.length, crc);
  return chunk;
}

function writeUint32BE(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = (val >>> 24) & 0xff;
  buf[offset + 1] = (val >>> 16) & 0xff;
  buf[offset + 2] = (val >>> 8) & 0xff;
  buf[offset + 3] = val & 0xff;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function deflateRaw(data: Uint8Array): Uint8Array {
  const blocks: number[] = [];
  const MAX_BLOCK = 65535;
  blocks.push(0x78, 0x01);

  let offset = 0;
  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, MAX_BLOCK);
    const isFinal = offset + blockSize >= data.length;
    blocks.push(isFinal ? 0x01 : 0x00);
    blocks.push(blockSize & 0xff, (blockSize >> 8) & 0xff);
    blocks.push((~blockSize) & 0xff, ((~blockSize) >> 8) & 0xff);
    for (let i = 0; i < blockSize; i++) {
      blocks.push(data[offset + i]);
    }
    offset += blockSize;
  }

  let a = 1, b2 = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b2 = (b2 + a) % 65521;
  }
  const adler = ((b2 << 16) | a) >>> 0;
  blocks.push((adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff);

  return new Uint8Array(blocks);
}

// ── Helpers ────────────────────────────────────────────────────────

function extractAuthToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") || "";
  if (auth.startsWith("ApplePass ")) return auth.slice(10);
  return null;
}

function sha1Hex(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  const CHUNK = 8192;
  for (let i = 0; i < data.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, data.length);
    let str = "";
    for (let j = i; j < end; j++) str += String.fromCharCode(data[j]);
    md.update(str);
  }
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
