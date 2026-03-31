import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch card + customer + business
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
    const pointsToReward = (card.max_points || 10) - (card.current_points || 0);

    // Generate a Google Wallet "Save to Google Wallet" link
    // Using the JWT-less approach with a direct save URL
    const loyaltyObject = {
      id: `fidelispro.${card.id}`,
      classId: `fidelispro.${business.id}`,
      loyaltyPoints: {
        balance: {
          int: card.current_points || 0,
        },
        label: business.loyalty_type === "stamps" ? "Tampons" : "Points",
      },
      barcode: {
        type: "QR_CODE",
        value: card.card_code || card.id,
        alternateText: card.card_code || card.id,
      },
      accountId: customer?.id || "unknown",
      accountName: customer?.full_name || "Client",
      heroImage: business.logo_url ? {
        sourceUri: { uri: business.logo_url },
        contentDescription: { defaultValue: { language: "fr", value: business.name } },
      } : undefined,
      hexBackgroundColor: business.primary_color || "#7c3aed",
      state: "ACTIVE",
    };

    const loyaltyClass = {
      id: `fidelispro.${business.id}`,
      issuerName: business.name,
      programName: `Fidélité ${business.name}`,
      programLogo: business.logo_url ? {
        sourceUri: { uri: business.logo_url },
        contentDescription: { defaultValue: { language: "fr", value: business.name } },
      } : undefined,
      hexBackgroundColor: business.primary_color || "#7c3aed",
      reviewStatus: "UNDER_REVIEW",
    };

    // Create a JWT for the save link (unsigned - for demo/test purposes)
    // In production, you'd sign this with your Google Cloud service account
    const payload = {
      iss: "noreply@fidelispro.fr",
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyClasses: [loyaltyClass],
        loyaltyObjects: [loyaltyObject],
      },
      origins: ["https://fidelispro.vercel.app"],
    };

    // Base64url encode the JWT parts (unsigned for now)
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const body = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const jwt = `${header}.${body}.`;

    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    return new Response(JSON.stringify({ 
      success: true, 
      saveUrl,
      card: {
        points: card.current_points || 0,
        maxPoints: card.max_points || 10,
        customerName: customer?.full_name || "Client",
        businessName: business.name,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error generating Google Wallet pass:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
