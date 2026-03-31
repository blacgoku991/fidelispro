import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, string> = {
  starter: "price_1TGQcwFQlLT8Im0J1OI53niu",
  pro: "price_1TGQdDFQlLT8Im0J7YQ9OWuG",
  enterprise: "price_1TGQdVFQlLT8Im0JMB3Y4hmT",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan, ui_mode } = await req.json();
    const priceId = PLANS[plan];
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

    const origin = req.headers.get("origin") || "https://fidelispro.lovable.app";

    // Embedded mode: return client_secret instead of URL
    if (ui_mode === "embedded") {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded",
        return_url: `${origin}/setup?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        subscription_data: {
          metadata: { user_id: user.id, plan },
        },
        metadata: { user_id: user.id, plan },
      });

      return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Default: hosted mode (redirect)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard/settings?checkout=success`,
      cancel_url: `${origin}/dashboard/settings?checkout=canceled`,
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
