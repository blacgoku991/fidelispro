import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { merchant_id } = await req.json().catch(() => ({}));

    // Determine which businesses to process
    let businesses: any[] = [];
    if (merchant_id) {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, email")
        .eq("id", merchant_id)
        .limit(1);
      businesses = data || [];
    } else {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, email")
        .eq("subscription_status", "active");
      businesses = data || [];
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const results = [];

    for (const biz of businesses) {
      // New clients in the last 7 days
      const { count: newClientsCount } = await supabase
        .from("customer_cards")
        .select("*", { count: "exact", head: true })
        .eq("business_id", biz.id)
        .gte("created_at", sevenDaysAgo);

      // Scans (points_history) in the last 7 days
      const { count: scansCount } = await supabase
        .from("points_history")
        .select("*", { count: "exact", head: true })
        .eq("business_id", biz.id)
        .gte("created_at", sevenDaysAgo);

      // Inactive clients (no scan in 30+ days)
      const { data: allCards } = await supabase
        .from("customer_cards")
        .select("id, last_visit")
        .eq("business_id", biz.id);

      const inactiveCount = (allCards || []).filter((c: any) => {
        if (!c.last_visit) return true;
        return new Date(c.last_visit) < new Date(thirtyDaysAgo);
      }).length;

      // Best day of week from scans (last 30 days)
      const { data: recentScans } = await supabase
        .from("points_history")
        .select("created_at")
        .eq("business_id", biz.id)
        .gte("created_at", thirtyDaysAgo);

      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const dayCounts = new Array(7).fill(0);
      for (const scan of recentScans || []) {
        const d = new Date(scan.created_at).getDay();
        dayCounts[d]++;
      }
      const bestDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
      const bestDay = dayCounts[bestDayIndex] > 0 ? dayNames[bestDayIndex] : null;

      const digestData = {
        merchant_id: biz.id,
        merchant_name: biz.name,
        period: "7 derniers jours",
        new_clients: newClientsCount ?? 0,
        scans: scansCount ?? 0,
        inactive_clients: inactiveCount,
        best_day: bestDay,
        generated_at: now.toISOString(),
      };

      // Log to digest_logs
      await supabase.from("digest_logs").insert({
        merchant_id: biz.id,
        data: digestData,
      });

      results.push(digestData);
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
