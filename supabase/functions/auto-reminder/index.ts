// Edge function: Auto-reminder for inactive customers
// Checks customers who haven't scanned their card in X days and sends push notifications

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[AUTO-REMINDER] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Can be called for a specific business or for all businesses
    let targetBusinessId: string | null = null;
    try {
      const body = await req.json();
      targetBusinessId = body.business_id || null;
    } catch {
      // No body = process all businesses
    }

    // Fetch businesses with auto_reminder_enabled
    let bizQuery = supabase
      .from("businesses")
      .select("id, name, auto_reminder_days, auto_reminder_enabled, reward_alert_threshold, max_points_per_card, loyalty_type")
      .eq("auto_reminder_enabled", true);

    if (targetBusinessId) {
      bizQuery = bizQuery.eq("id", targetBusinessId);
    }

    const { data: businesses, error: bizErr } = await bizQuery;
    if (bizErr) throw new Error(`Failed to fetch businesses: ${bizErr.message}`);
    if (!businesses || businesses.length === 0) {
      log("No businesses with auto_reminder_enabled");
      return jsonResponse({ success: true, processed: 0 });
    }

    log("Processing businesses", { count: businesses.length });

    let totalReminders = 0;
    let totalRewardAlerts = 0;

    for (const biz of businesses) {
      const reminderDays = biz.auto_reminder_days || 7;
      const rewardThreshold = biz.reward_alert_threshold || 2;
      const maxPoints = biz.max_points_per_card || 10;
      const unitLabel = biz.loyalty_type === "stamps" ? "tampons" : "points";
      const projectUrl = Deno.env.get("SUPABASE_URL")!
      // Find inactive customers (last_visit_at older than X days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - reminderDays);

      const { data: inactiveCustomers } = await supabase
        .from("customers")
        .select("id, full_name, last_visit_at, total_visits")
        .eq("business_id", biz.id)
        .lt("last_visit_at", cutoffDate.toISOString())
        .not("last_visit_at", "is", null);

      if (inactiveCustomers && inactiveCustomers.length > 0) {
        log("Inactive customers found", { business: biz.name, count: inactiveCustomers.length });

        for (const customer of inactiveCustomers) {
          // Check if we already sent a reminder recently (avoid spam)
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);

          const { count: recentReminders } = await supabase
            .from("notifications_log")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", customer.id)
            .eq("business_id", biz.id)
            .eq("type", "win_back")
            .gte("sent_at", oneDayAgo.toISOString());

          if ((recentReminders || 0) > 0) continue;

          const daysSince = Math.floor((Date.now() - new Date(customer.last_visit_at!).getTime()) / (1000 * 60 * 60 * 24));
          const message = `👋 ${customer.full_name || "Cher client"}, ça fait ${daysSince} jours ! Vos ${unitLabel} vous attendent chez ${biz.name}.`;

          // Send wallet push
          try {
            await fetch(`${projectUrl}/functions/v1/wallet-push`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({
                business_id: biz.id,
                customer_id: customer.id,
                action_type: "reminder",
                change_message: message,
              }),
            });
          } catch (pushErr) {
            log("Push failed (non-blocking)", { customer: customer.id, error: String(pushErr) });
          }

          // Log the notification
          await supabase.from("notifications_log").insert({
            business_id: biz.id,
            customer_id: customer.id,
            type: "win_back" as any,
            title: biz.name,
            message,
            delivery_status: "sent",
          });

          totalReminders++;
        }
      }

      // Reward proximity alerts — customers close to earning a reward
      const { data: closeToReward } = await supabase
        .from("customer_cards")
        .select("id, customer_id, current_points, max_points, customers(full_name)")
        .eq("business_id", biz.id)
        .eq("is_active", true)
        .gte("current_points", maxPoints - rewardThreshold)
        .lt("current_points", maxPoints);

      if (closeToReward && closeToReward.length > 0) {
        for (const card of closeToReward) {
          const remaining = (card.max_points || maxPoints) - (card.current_points || 0);
          const customerName = (card.customers as any)?.full_name || "Cher client";

          // Check recent alert
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

          const { count: recentAlerts } = await supabase
            .from("notifications_log")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", card.customer_id)
            .eq("business_id", biz.id)
            .eq("type", "points_reminder")
            .gte("sent_at", twoDaysAgo.toISOString());

          if ((recentAlerts || 0) > 0) continue;

          const rewardMsg = `⭐ ${customerName}, plus que ${remaining} ${unitLabel} pour votre récompense chez ${biz.name} !`;

          try {
            await fetch(`${projectUrl}/functions/v1/wallet-push`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({
                business_id: biz.id,
                customer_id: card.customer_id,
                action_type: "reminder",
                change_message: rewardMsg,
              }),
            });
          } catch { /* non-blocking */ }

          await supabase.from("notifications_log").insert({
            business_id: biz.id,
            customer_id: card.customer_id,
            type: "points_reminder" as any,
            title: biz.name,
            message: rewardMsg,
            delivery_status: "sent",
          });

          totalRewardAlerts++;
        }
      }
    }

    log("Done", { totalReminders, totalRewardAlerts });

    return jsonResponse({
      success: true,
      businesses_processed: businesses.length,
      reminders_sent: totalReminders,
      reward_alerts_sent: totalRewardAlerts,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return jsonResponse({ error: msg }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
