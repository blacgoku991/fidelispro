import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as forge from "https://esm.sh/node-forge@1.3.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function sha1Hex(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(forge.util.binary.raw.encode(data));
  return md.digest().toHex();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { card_code } = await req.json();
    if (!card_code) {
      return new Response(JSON.stringify({ error: "card_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch card + customer + business
    const { data: card, error: cardErr } = await supabase
      .from("customer_cards")
      .select("*, customers(*)")
      .eq("card_code", card_code)
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
    const passTypeId = Deno.env.get("APPLE_PASS_TYPE_ID")!;
    const teamId = Deno.env.get("APPLE_TEAM_ID")!;
    const p12Base64 = Deno.env.get("APPLE_P12_BASE64")!;
    const p12Password = Deno.env.get("APPLE_P12_PASSWORD")!;

    // Build pass.json
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      serialNumber: card.id,
      teamIdentifier: teamId,
      organizationName: business.name,
      description: `Carte de fidélité ${business.name}`,
      logoText: business.name,
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: hexToRgb(business.primary_color || "#6B46C1"),
      labelColor: "rgb(255, 255, 255)",
      barcode: {
        message: card.card_code,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
      },
      storeCard: {
        headerFields: [
          {
            key: "points",
            label: "POINTS",
            value: `${card.current_points || 0}/${card.max_points || 10}`,
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
            label: "NIVEAU",
            value: (customer?.level || "bronze").toUpperCase(),
          },
          {
            key: "rewards",
            label: "RÉCOMPENSES",
            value: `${card.rewards_earned || 0}`,
          },
        ],
        backFields: [
          {
            key: "info",
            label: "À propos",
            value: `Carte de fidélité ${business.name}. ${business.reward_description || ""}`,
          },
        ],
      },
    };

    const passJsonBytes = new TextEncoder().encode(JSON.stringify(passJson));

    // Build manifest
    const manifest: Record<string, string> = {
      "pass.json": sha1Hex(passJsonBytes),
    };
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));

    // Sign manifest with PKCS#7
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

    // Extract cert and key
    let signerCert: forge.pki.Certificate | null = null;
    let signerKey: forge.pki.PrivateKey | null = null;

    for (const safeContents of p12.safeContents) {
      for (const safeBag of safeContents.safeBags) {
        if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
          signerCert = safeBag.cert;
        }
        if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag && safeBag.key) {
          signerKey = safeBag.key;
        }
      }
    }

    if (!signerCert || !signerKey) {
      return new Response(
        JSON.stringify({ error: "Could not extract cert/key from p12" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create PKCS#7 signed data
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(
      forge.util.binary.raw.encode(manifestBytes)
    );
    p7.addCertificate(signerCert);
    p7.addSigner({
      key: signerKey,
      certificate: signerCert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date(),
        },
      ],
    });
    p7.sign({ detached: true });

    const signatureDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const signatureBytes = new Uint8Array(
      [...signatureDer].map((c) => c.charCodeAt(0))
    );

    // Build .pkpass ZIP
    const zip = new JSZip();
    zip.file("pass.json", passJsonBytes);
    zip.file("manifest.json", manifestBytes);
    zip.file("signature", signatureBytes);

    const pkpassBuffer = await zip.generateAsync({ type: "uint8array" });

    return new Response(pkpassBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${card.card_code}.pkpass"`,
      },
    });
  } catch (err) {
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

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
