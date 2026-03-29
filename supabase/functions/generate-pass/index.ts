import { createClient } from "npm:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";
import JSZip from "npm:jszip@3.10.1";

const REQUIRED_PASS_TYPE_ID = "pass.app.lovable.fidelispro";

// Minimal 29x29 icon PNG (valid)
const ICON_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAYAAABWk2cPAAAAgklEQVR4nGPkF9f6z0BnwERvCwfMUhZcEh9eXL1LqeECEtrK2MSx+pQaFuIzhxE9ISErxOVSUi1EN4eJWIWkAmT96D7GGryUWkjInJGTZUYtHbV01NJRS0ctHSSW0rrlgGIpvoqXEgvR61WM5go1LEQG2CryAWk5YPUprcHgSb20BgDttTV1QCPBRwAAAABJRU5ErkJggg==";

const ICON_2X_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAYAAADhu0ooAAAA7ElEQVR4nO2aOxLCMAxECUMPHenp4P5HoaSn5AZJReMJjj7Bclb7eo/1Zh2lkIbz9T4dEnCMLqAVFEWDomikET15Dn/ez9dWhUi4jI+b9exg+Y+2FiyxCKufbrSktQZxoj0ILiFNN00zEiVaS9PTIDR4a1gV/XVBK8ESaz2mpxsl6bm7KtprA1pirVZ1opFpempI03UpigZF0aAoGhRFg6JoUBQNiqJBUTQoigZF0aAoGhRFI80guCraw/hByl+maZGpWu/mIFhzUSTcYShQ7xn1kqz2k0kzCDZtjn2BX5HbI2maEUXRoCgaaURn7+ldg7yB9K8AAAAASUVORK5CYII=";

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
    const cardCode = await extractCardCode(req);
    if (!cardCode) {
      return new Response(JSON.stringify({ error: "card_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamId = requireEnv("APPLE_TEAM_ID").trim();
    const p12Base64 = requireEnv("APPLE_P12_BASE64");
    const p12Password = requireEnv("APPLE_P12_PASSWORD");

    if (!/^[A-Z0-9]{10}$/.test(teamId)) {
      throw new Error("APPLE_TEAM_ID invalide");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const { signerCert, signerKey, certificateChain } = extractSigningMaterial(
      p12Base64,
      p12Password
    );

    const iconPng = decodeBase64ToBytes(ICON_PNG_BASE64);
    const icon2xPng = decodeBase64ToBytes(ICON_2X_PNG_BASE64);

    // Always use business colors (matching the web preview card)
    const bgColor = hexToRgb(business.primary_color || "#6B46C1");
    const fgColor = "rgb(255, 255, 255)";
    const lblColor = "rgb(255, 255, 255)";

    const level = (customer?.level || "bronze").toLowerCase();
    const pointsCurrent = card.current_points || 0;
    const pointsMax = card.max_points || 10;
    const pointsToReward = pointsMax - pointsCurrent;
    const levelEmoji = level === "gold" ? "⭐" : level === "silver" ? "🥈" : "🥉";
    const levelLabel = level.toUpperCase();

    // Build pass.json — fields mirror the web LoyaltyCard preview exactly
    const passJson: any = {
      formatVersion: 1,
      passTypeIdentifier: REQUIRED_PASS_TYPE_ID,
      serialNumber: card.id,
      teamIdentifier: teamId,
      organizationName: business.name,
      description: `Carte de fidélité ${business.name}`,
      logoText: business.name,
      foregroundColor: fgColor,
      backgroundColor: bgColor,
      labelColor: lblColor,
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
        // Top-right: points display like "5/10" (matches preview card)
        headerFields: [
          {
            key: "points",
            label: "POINTS",
            value: `${pointsCurrent}/${pointsMax}`,
            textAlignment: "PKTextAlignmentRight",
          },
        ],
        // Large center: customer name (matches preview "Aperçu client")
        primaryFields: [
          {
            key: "name",
            label: "CLIENT",
            value: customer?.full_name || "Client",
          },
        ],
        // Row below: statut + progression (matches preview middle row)
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
        // Bottom row: rewards + next (matches preview auxiliary info)
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

    // Build manifest
    const manifest: Record<string, string> = {
      "pass.json": forgeSha1(passJsonBytes),
      "icon.png": forgeSha1(iconPng),
      "icon@2x.png": forgeSha1(icon2xPng),
    };
    const manifestStr = JSON.stringify(manifest);
    const manifestBytes = new TextEncoder().encode(manifestStr);

    // Create PKCS#7 signed data
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(manifestStr, "utf8");
    p7.addCertificate(signerCert);
    for (const cert of certificateChain) {
      p7.addCertificate(cert);
    }
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

    const signatureAsn1 = p7.toAsn1();
    const signatureDer = forge.asn1.toDer(signatureAsn1).getBytes();
    const signatureBytes = new Uint8Array(signatureDer.length);
    for (let i = 0; i < signatureDer.length; i++) {
      signatureBytes[i] = signatureDer.charCodeAt(i);
    }

    // Build .pkpass ZIP
    const zip = new JSZip();
    zip.file("pass.json", passJsonBytes);
    zip.file("manifest.json", manifestBytes);
    zip.file("signature", signatureBytes);
    zip.file("icon.png", iconPng);
    zip.file("icon@2x.png", icon2xPng);

    const pkpassBuffer = await zip.generateAsync({ type: "uint8array" });

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
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  const body = await req.json().catch(() => ({}));
  return typeof body?.card_code === "string" ? body.card_code : null;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const bytes = forge.util.decode64(base64);
  const output = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    output[i] = bytes.charCodeAt(i);
  }
  return output;
}

function extractSigningMaterial(p12Base64: string, p12Password: string) {
  const p12Der = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

  let signerKey: any = null;
  const certs: any[] = [];

  for (const safeContents of p12.safeContents) {
    for (const safeBag of safeContents.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
        certs.push(safeBag.cert);
      }
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag && safeBag.key) {
        signerKey = safeBag.key;
      }
    }
  }

  if (!signerKey || certs.length === 0) {
    throw new Error("Impossible d'extraire la clé/certificat du fichier .p12");
  }

  const signerCert =
    certs.find((cert) => certMatchesPrivateKey(cert, signerKey)) ||
    certs.find((cert) => hasPassTypeCommonName(cert)) ||
    certs[0];

  const certificateChain = certs.filter((cert) => cert !== signerCert);

  return { signerCert, signerKey, certificateChain };
}

function certMatchesPrivateKey(cert: any, key: any): boolean {
  if (!cert?.publicKey?.n || !key?.n) return false;
  return cert.publicKey.n.compareTo(key.n) === 0;
}

function hasPassTypeCommonName(cert: any): boolean {
  const cn = cert?.subject?.getField?.("CN")?.value;
  return typeof cn === "string" && cn.includes("Pass Type ID");
}

function hexToRgb(hex: string): string {
  const normalized = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#6B46C1";
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
