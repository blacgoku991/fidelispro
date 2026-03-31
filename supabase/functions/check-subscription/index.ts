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

const log = (step: string, details?: any) =>
  console.log(`[CHECK-SUB] ${step}${details ? ` — ${JSON.stringify(details)}` : ""}`);

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
    log("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });

    // Lire session_id depuis le body (optionnel)
    let sessionId: string | null = null;
    try {
      const body = await req.json();
      sessionId = body?.session_id ?? null;
    } catch { /* pas de body */ }

    let customerId: string | null = null;
    let activeSub: Stripe.Subscription | null = null;
    let plan: string | null = null;

    // ── Voie 1 : résolution directe via checkout session_id ───────────────
    if (sessionId) {
      log("Looking up checkout session", { sessionId });
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"],
        });
        customerId = session.customer as string | null;
        const sub = session.subscription as Stripe.Subscription | null;
        if (sub && (sub.status === "active" || sub.status === "trialing")) {
          activeSub = sub;
          const productId = sub.items.data[0]?.price?.product as string;
          plan = PRODUCT_TO_PLAN[productId] ?? sub.metadata?.plan ?? "starter";
          log("Active sub via session", { subId: sub.id, plan, status: sub.status });
        } else {
          log("Session sub not active yet", { status: sub?.status });
        }
      } catch (err) {
        log("Session lookup failed", { err: String(err) });
      }
    }

    // ── Voie 2 : lookup par email client ─────────────────────────────────
    if (!activeSub) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        log("No Stripe customer found");
        return new Response(JSON.stringify({ subscribed: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      customerId = customers.data[0].id;
      log("Found customer", { customerId });

      // Vérifier active ET trialing
      const [activeSubs, trialSubs] = await Promise.all([
        stripe.subscriptions.list({ customer: customerId, status: "active",   limit: 1 }),
        stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 }),
      ]);

      const allSubs = [...activeSubs.data, ...trialSubs.data];
      if (allSubs.length > 0) {
        activeSub = allSubs[0];
        const productId = activeSub.items.data[0]?.price?.product as string;
        plan = PRODUCT_TO_PLAN[productId] ?? activeSub.metadata?.plan ?? "starter";
        log("Active sub via customer", { subId: activeSub.id, plan, status: activeSub.status });
      }
    }

    // ── Si abonnement actif trouvé → sync DB immédiatement ───────────────
    if (activeSub && customerId) {
      const { data: bizData } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (bizData) {
        const { error: updateErr } = await supabaseAdmin.from("businesses").update({
          subscription_status: activeSub.status === "trialing" ? "trialing" : "active",
          subscription_plan: plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: activeSub.id,
        }).eq("id", bizData.id);

        if (updateErr) log("DB update error", { err: updateErr.message });
        else log("DB synced", { plan, status: activeSub.status });
      }

      const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
      return new Response(JSON.stringify({
        subscribed: true,
        plan,
        subscription_end: subscriptionEnd,
        stripe_subscription_id: activeSub.id,
        stripe_status: activeSub.status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Pas d'abonnement actif — vérifier past_due ────────────────────────
    if (customerId) {
      const pastDueSubs = await stripe.subscriptions.list({
        customer: customerId, status: "past_due", limit: 1,
      });
      if (pastDueSubs.data.length > 0) {
        const sub = pastDueSubs.data[0];
        const productId = sub.items.data[0]?.price?.product as string;
        const pastPlan = PRODUCT_TO_PLAN[productId] ?? "starter";

        const { data: bizData } = await supabaseAdmin
          .from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
        if (bizData) {
          await supabaseAdmin.from("businesses").update({
            subscription_status: "past_due",
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
          }).eq("id", bizData.id);
        }
        log("Subscription past_due");
        return new Response(JSON.stringify({ subscribed: false, stripe_status: "past_due", plan: pastPlan }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    log("No active subscription");
    return new Response(JSON.stringify({ subscribed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
