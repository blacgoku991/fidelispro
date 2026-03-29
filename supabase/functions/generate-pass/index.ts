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
  const iconPng = decodeBase64ToBytes(ICON_PNG_BASE64);
  const icon2xPng = decodeBase64ToBytes(ICON_2X_PNG_BASE64);

  const bgColor = hexToRgb(business.primary_color || "#6B46C1");
  const level = (customer?.level || "bronze").toLowerCase();
  const pointsCurrent = card.current_points || 0;
  const pointsMax = card.max_points || 10;
  const pointsToReward = pointsMax - pointsCurrent;
  const levelEmoji = level === "gold" ? "⭐" : level === "silver" ? "🥈" : "🥉";
  const levelLabel = level.toUpperCase();

  // webServiceURL for PassKit registration
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
    // PassKit web service for automatic updates
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
          value: `${pointsCurrent}/${pointsMax}`,
          textAlignment: "PKTextAlignmentRight",
          ...(card.wallet_change_message ? { changeMessage: card.wallet_change_message } : {}),
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
          key: "progress",
          label: "PROGRESSION",
          value: `${pointsCurrent} / ${pointsMax}`,
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      auxiliaryFields: [
        {
          key: "rewards",
          label: "RÉCOMPENSES",
          value: `${card.rewards_earned || 0} obtenues`,
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

  return zip.generateAsync({ type: "uint8array" });
}

// ── Helpers ────────────────────────────────────────────────────────

function forgeSha1(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(forge.util.binary.raw.encode(data));
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
