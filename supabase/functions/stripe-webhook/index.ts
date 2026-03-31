import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", msg);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  console.log("Stripe event:", event.type);

  try {
    switch (event.type) {
      // New subscription created — immediately reflect active/trialing status
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = sub.metadata?.plan;
        const customerId = sub.customer as string;
        if (userId) {
          const mappedStatus = sub.status === "active" ? "active"
            : sub.status === "trialing" ? "trialing"
            : "inactive";
          await supabase.from("businesses").update({
            subscription_status: mappedStatus,
            ...(plan ? { subscription_plan: plan } : {}),
            stripe_subscription_id: sub.id,
            stripe_customer_id: customerId,
          }).eq("owner_id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = sub.metadata?.plan;
        const status = sub.status; // active | past_due | canceled | trialing | ...

        if (userId) {
          await supabase.from("businesses").update({
            subscription_status: status === "active" ? "active"
              : status === "past_due" ? "past_due"
              : status === "canceled" ? "canceled"
              : status === "trialing" ? "trialing"
              : "inactive",
            ...(plan ? { subscription_plan: plan } : {}),
            stripe_subscription_id: sub.id,
          }).eq("owner_id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await supabase.from("businesses").update({
            subscription_status: "canceled",
          }).eq("owner_id", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          // Find user by stripe_customer_id
          const { data: biz } = await supabase
            .from("businesses")
            .select("id, owner_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (biz) {
            await supabase.from("businesses").update({
              subscription_status: "past_due",
            }).eq("id", biz.id);
          } else {
            // Fallback: find via customer email
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            if (customer.email) {
              const { data: user } = await supabase.auth.admin.getUserByEmail(customer.email);
              if (user?.user) {
                await supabase.from("businesses").update({
                  subscription_status: "past_due",
                }).eq("owner_id", user.user.id);
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        // Find business by stripe_customer_id or subscription metadata
        let bizId: string | null = null;
        let userId: string | null = null;

        const { data: biz } = await supabase
          .from("businesses")
          .select("id, owner_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (biz) {
          bizId = biz.id;
          userId = biz.owner_id;
        } else {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          if (customer.email) {
            const { data: authUser } = await supabase.auth.admin.getUserByEmail(customer.email);
            if (authUser?.user) {
              userId = authUser.user.id;
              const { data: foundBiz } = await supabase
                .from("businesses")
                .select("id")
                .eq("owner_id", userId)
                .maybeSingle();
              if (foundBiz) bizId = foundBiz.id;
            }
          }
        }

        if (bizId) {
          // Get plan from subscription
          let plan: string | null = null;
          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            plan = sub.metadata?.plan ?? null;
            // Store stripe_customer_id and stripe_subscription_id
            await supabase.from("businesses").update({
              subscription_status: "active",
              ...(plan ? { subscription_plan: plan } : {}),
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            }).eq("id", bizId);
          } else {
            await supabase.from("businesses").update({
              subscription_status: "active",
            }).eq("id", bizId);
          }

          // Send confirmation email
          if (userId) {
            await supabase.functions.invoke("send-email", {
              body: {
                type: "payment_succeeded",
                user_id: userId,
                plan,
                amount: invoice.amount_paid ? invoice.amount_paid / 100 : null,
              },
            });
          }
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook handler error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
