import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_UEuRDMQSWVTnoL: "starter",
  prod_UEuSxVTVVLAifJ: "pro",
  prod_UEuSC2IkdrsKfV: "enterprise",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Auth failed");

    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check trialing
    const trialingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });

    const allSubs = [...subscriptions.data, ...trialingSubs.data];
    const hasActiveSub = allSubs.length > 0;

    let plan = null;
    let subscriptionEnd = null;
    let stripeSubId = null;
    let stripeStatus = null;

    if (hasActiveSub) {
      const sub = allSubs[0];
      stripeSubId = sub.id;
      stripeStatus = sub.status;
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      const productId = sub.items.data[0].price.product as string;
      plan = PRODUCT_TO_PLAN[productId] || "starter";
      logStep("Active subscription", { subId: sub.id, plan, status: sub.status });

      // Sync to businesses table
      const { data: bizData } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (bizData) {
        await supabaseAdmin.from("businesses").update({
          subscription_status: sub.status === "trialing" ? "trialing" : "active",
          subscription_plan: plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
        }).eq("id", bizData.id);
        logStep("Synced to businesses table");
      }
    } else {
      // Check for past_due or canceled
      const pastDueSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "past_due",
        limit: 1,
      });

      if (pastDueSubs.data.length > 0) {
        stripeStatus = "past_due";
        const sub = pastDueSubs.data[0];
        const productId = sub.items.data[0].price.product as string;
        plan = PRODUCT_TO_PLAN[productId] || "starter";

        const { data: bizData } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (bizData) {
          await supabaseAdmin.from("businesses").update({
            subscription_status: "past_due",
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
          }).eq("id", bizData.id);
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      subscription_end: subscriptionEnd,
      stripe_subscription_id: stripeSubId,
      stripe_status: stripeStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
