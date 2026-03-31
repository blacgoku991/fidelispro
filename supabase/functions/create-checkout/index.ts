import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fallback Price IDs (env vars ou hardcodé)
const FALLBACK_PLANS: Record<string, string> = {
  starter:    Deno.env.get("STRIPE_PRICE_STARTER")    || "price_1TGQcwFQlLT8Im0J1OI53niu",
  pro:        Deno.env.get("STRIPE_PRICE_PRO")        || "price_1TGQdDFQlLT8Im0J7YQ9OWuG",
  enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE") || "price_1TGQdVFQlLT8Im0JMB3Y4hmT",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Service role client pour lire site_settings
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan } = await req.json();

    // Lire le Price ID depuis site_settings en priorité
    const { data: settingRow } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", `stripe_price_${plan}`)
      .maybeSingle();

    const priceId = (settingRow?.value && settingRow.value.trim())
      ? settingRow.value.trim()
      : FALLBACK_PLANS[plan];

    if (!priceId) throw new Error(`Invalid plan: ${plan}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Hosted mode (redirect vers Stripe)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: "https://fidelispro.vercel.app/setup?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://fidelispro.vercel.app/payment",
      payment_method_types: ["card"],
      subscription_data: {
        metadata: { user_id: user.id, plan },
      },
      metadata: { user_id: user.id, plan },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
