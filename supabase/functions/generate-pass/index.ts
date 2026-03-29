import { createClient } from "npm:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";
import JSZip from "npm:jszip@3.10.1";

const PASS_TYPE_ID = "pass.app.lovable.fidelispro";

const ICON_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAYAAABWk2cPAAAAgklEQVR4nGPkF9f6z0BnwERvCwfMUhZcEh9eXL1LqeECEtrK2MSx+pQaFuIzhxE9ISErxOVSUi1EN4eJWIWkAmT96D7GGryUWkjInJGTZUYtHbV01NJRS0ctHSSW0rrlgGIpvoqXEgvR61WM5go1LEQG2CryAWk5YPUprcHgSb20BgDttTV1QCPBRwAAAABJRU5ErkJggg==";

const ICON_2X_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAYAAADhu0ooAAAA7ElEQVR4nO2aOxLCMAxECUMPHenp4P5HoaSn5AZJReMJjj7Bclb7eo/1Zh2lkIbz9T4dEnCMLqAVFEWDomikET15Dn/ez9dWhUi4jI+b9exg+Y+2FiyxCKufbrSktQZxoj0ILiFNN00zEiVaS9PTIDR4a1gV/XVBK8ESaz2mpxsl6bm7KtprA1pirVZ1opFpempI03UpigZF0aAoGhRFg6JoUBQNiqJBUTQoigZF0aAoGhRFI80guCraw/hByl+maZGpWu/mIFhzUSTcYShQ7xn1kqz2k0kzCDZtjn2BX5HbI2maEUXRoCgaaURn7+ldg7yB9K8AAAAASUVORK5CYII=";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cardCode = await extractCardCode(req);
    if (!cardCode) {
      return new Response(JSON.stringify({ error: "card_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabase();

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

    // Generate or retrieve auth token for this card
    let authToken = card.wallet_auth_token;
    if (!authToken) {
      authToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      await supabase
        .from("customer_cards")
        .update({ wallet_auth_token: authToken })
        .eq("id", card.id);
    }

    const pkpassBuffer = await buildPkpass(card, business, card.customers, authToken);

    return new Response(pkpassBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="card.pkpass"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("Error generating pass:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ── Pass building ──────────────────────────────────────────────────

export async function buildPkpass(
  card: any,
  business: any,
  customer: any,
  authToken: string
): Promise<Uint8Array> {
  const teamId = requireEnv("APPLE_TEAM_ID").trim();
  const p12Base64 = requireEnv("APPLE_P12_BASE64");
  const p12Password = requireEnv("APPLE_P12_PASSWORD");

  const { signerCert, signerKey, certificateChain } = extractSigningMaterial(p12Base64, p12Password);

  // Fetch business logo for icons (square) and logo (rectangular)
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
  const levelLabel = level.toUpperCase();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const webServiceURL = `${supabaseUrl}/functions/v1/wallet-webservice`;

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
    webServiceURL,
    authenticationToken: authToken,
    barcode: {
      message: card.card_code,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
    },
    barcodes: [
      {
        message: card.card_code,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
      },
    ],
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
      primaryFields: [
        {
          key: "name",
          label: "CLIENT",
          value: customer?.full_name || "Client",
        },
      ],
      secondaryFields: [
        {
          key: "level",
          label: "STATUT",
          value: `${levelEmoji} ${levelLabel}`,
        },
        {
          key: "offer",
          label: "OFFRE DU JOUR",
          value: latestOffer,
          changeMessage: "%@",
        },
      ],
      auxiliaryFields: [
        {
          key: "progress",
          label: "PROGRESSION",
          value: `${pointsCurrent} / ${pointsMax}`,
        },
        {
          key: "next_reward",
          label: "PROCHAINE",
          value: pointsToReward > 0 ? `${pointsToReward} pts restants` : "🎁 Disponible !",
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      backFields: [
        {
          key: "reward_info",
          label: "🎁 Récompense",
          value: business.reward_description || "Récompense offerte !",
        },
        {
          key: "visits",
          label: "📊 Statistiques",
          value: `Visites : ${customer?.total_visits || 0}\nStreak : ${customer?.current_streak || 0} jours`,
        },
        {
          key: "info",
          label: "ℹ️ À propos",
          value: `Programme de fidélité ${business.name}.\n${business.address ? `Adresse : ${business.address}` : ""}\n${business.phone ? `Tél : ${business.phone}` : ""}`.trim(),
        },
        {
          key: "powered",
          label: "",
          value: "Propulsé par FidéliPro",
        },
      ],
    },
  };

  const passJsonStr = JSON.stringify(passJson);
  const passJsonBytes = new TextEncoder().encode(passJsonStr);

  const manifest: Record<string, string> = {
    "pass.json": forgeSha1(passJsonBytes),
    "icon.png": forgeSha1(iconPng),
    "icon@2x.png": forgeSha1(icon2xPng),
    "icon@3x.png": forgeSha1(icon3xPng),
    "logo.png": forgeSha1(logoPng),
    "logo@2x.png": forgeSha1(logo2xPng),
    "strip.png": forgeSha1(stripPng),
    "strip@2x.png": forgeSha1(strip2xPng),
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

  const signatureDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const signatureBytes = new Uint8Array(signatureDer.length);
  for (let i = 0; i < signatureDer.length; i++) signatureBytes[i] = signatureDer.charCodeAt(i);

  const zip = new JSZip();
  zip.file("pass.json", passJsonBytes);
  zip.file("manifest.json", manifestBytes);
  zip.file("signature", signatureBytes);
  zip.file("icon.png", iconPng);
  zip.file("icon@2x.png", icon2xPng);
  zip.file("icon@3x.png", icon3xPng);
  zip.file("logo.png", logoPng);
  zip.file("logo@2x.png", logo2xPng);
  zip.file("strip.png", stripPng);
  zip.file("strip@2x.png", strip2xPng);

  return zip.generateAsync({ type: "uint8array" });
}

// ── Logo helpers ──────────────────────────────────────────────────

async function fetchOrGenerateLogo(business: any): Promise<{ logoPng: Uint8Array; logo2xPng: Uint8Array }> {
  if (business.logo_url) {
    try {
      const logoUrl = business.logo_url.split("?")[0]; // Remove cache buster
      const response = await fetch(logoUrl);
      if (response.ok) {
        const imageBytes = new Uint8Array(await response.arrayBuffer());
        // Use the fetched image for both sizes (browser/Wallet handles scaling)
        return { logoPng: imageBytes, logo2xPng: imageBytes };
      }
    } catch (err) {
      console.error("[Pass] Failed to fetch logo, using fallback:", err);
    }
  }

  // Generate text-based initials logo
  const logoPng = generateInitialsLogo(business.name, business.primary_color || "#6B46C1", 160, 50);
  const logo2xPng = generateInitialsLogo(business.name, business.primary_color || "#6B46C1", 320, 100);
  return { logoPng, logo2xPng };
}

function generateInitialsLogo(name: string, hexColor: string, width: number, height: number): Uint8Array {
  // Generate a minimal BMP with initials rendered as a solid color block
  // Since we can't use Canvas in Deno edge functions, we create a simple solid-color PNG
  // The logoText field in pass.json shows the business name, so the logo just needs brand color
  return generateSolidColorPng(width, height, hexColor);
}

function generateSolidColorPng(width: number, height: number, hexColor: string): Uint8Array {
  const hex = /^#[0-9A-Fa-f]{6}$/.test(hexColor) ? hexColor : "#6B46C1";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Minimal valid PNG: solid color
  // We'll create raw pixel data and wrap in PNG format
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b, 255);
    }
  }

  const rawBytes = new Uint8Array(rawData);
  const compressed = deflateRaw(rawBytes);

  // Build PNG
  const chunks: Uint8Array[] = [];

  // Signature
  chunks.push(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = new Uint8Array(13);
  writeUint32BE(ihdr, 0, width);
  writeUint32BE(ihdr, 4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(makeChunk("IHDR", ihdr));

  // IDAT
  chunks.push(makeChunk("IDAT", compressed));

  // IEND
  chunks.push(makeChunk("IEND", new Uint8Array(0)));

  // Concatenate
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const png = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    png.set(c, offset);
    offset += c.length;
  }
  return png;
}

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
  // Use zlib stored blocks (no compression) — simple and always valid
  const blocks: number[] = [];
  const MAX_BLOCK = 65535;

  // zlib header
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

  // Adler-32 checksum
  let a = 1, b2 = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b2 = (b2 + a) % 65521;
  }
  const adler = ((b2 << 16) | a) >>> 0;
  blocks.push((adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff);

  return new Uint8Array(blocks);
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

  // Create strip with diagonal pattern overlay
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Diagonal stripe pattern: every 8px, slightly lighter
      const stripe = ((x + y) % 16) < 4;
      const lightness = stripe ? 20 : 0;
      // Gradient from top to bottom (slightly darker at bottom)
      const gradientDarken = Math.floor((y / height) * 30);
      const pr = Math.min(255, Math.max(0, r + lightness - gradientDarken));
      const pg = Math.min(255, Math.max(0, g + lightness - gradientDarken));
      const pb = Math.min(255, Math.max(0, b + lightness - gradientDarken));
      rawData.push(pr, pg, pb, 255);
    }
  }

  const rawBytes = new Uint8Array(rawData);
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

// ── Helpers ────────────────────────────────────────────────────────

function forgeSha1(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  // Process in chunks to avoid stack overflow with large binary data
  const CHUNK = 8192;
  for (let i = 0; i < data.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, data.length);
    let str = "";
    for (let j = i; j < end; j++) str += String.fromCharCode(data[j]);
    md.update(str);
  }
  return md.digest().toHex();
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

async function extractCardCode(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("card_code");
  if (fromQuery) return fromQuery;
  if (req.method !== "POST") return null;
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  const body = await req.json().catch(() => ({}));
  return typeof body?.card_code === "string" ? body.card_code : null;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const bytes = forge.util.decode64(base64);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i);
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
  if (!signerKey || certs.length === 0) throw new Error("Cannot extract signing material from .p12");
  const signerCert =
    certs.find((c) => c?.publicKey?.n && signerKey?.n && c.publicKey.n.compareTo(signerKey.n) === 0) ||
    certs.find((c) => { const cn = c?.subject?.getField?.("CN")?.value; return typeof cn === "string" && cn.includes("Pass Type ID"); }) ||
    certs[0];
  return { signerCert, signerKey, certificateChain: certs.filter((c) => c !== signerCert) };
}

function hexToRgb(hex: string): string {
  const n = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#6B46C1";
  return `rgb(${parseInt(n.slice(1, 3), 16)}, ${parseInt(n.slice(3, 5), 16)}, ${parseInt(n.slice(5, 7), 16)})`;
}
