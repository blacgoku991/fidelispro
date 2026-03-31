import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Functions that depend on Stripe secrets and need redeployment
const FUNCTIONS_TO_REDEPLOY = [
  "create-checkout",
  "stripe-webhook",
  "check-subscription",
  "customer-portal",
  "manage-stripe-plans",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // ── Auth : super_admin uniquement ────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) throw new Error("Non authentifié");

    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) throw new Error("Non authentifié");

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Accès réservé aux super admins");

    // ── Lire le body ─────────────────────────────────────────────────────
    const { stripe_public_key, stripe_secret_key, stripe_webhook_secret } = await req.json();

    const projectRef = Deno.env.get("SUPABASE_PROJECT_REF") || "piuaelsbocjtpdwzykfe";
    const accessToken = Deno.env.get("SUPABASE_ACCESS_TOKEN");
    if (!accessToken) throw new Error("SUPABASE_ACCESS_TOKEN non configuré dans les secrets");

    const results: Record<string, string> = {};

    // ── 1. Clé publique → site_settings (lisible par le frontend) ────────
    if (stripe_public_key?.trim()) {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "stripe_public_key", value: stripe_public_key.trim() }, { onConflict: "key" });
      if (error) throw new Error(`Erreur sauvegarde stripe_public_key: ${error.message}`);
      results.stripe_public_key = "saved";
    }

    // ── 2. Secrets backend → Supabase Management API ─────────────────────
    const secretsToUpdate: { name: string; value: string }[] = [];
    if (stripe_secret_key?.trim()) {
      secretsToUpdate.push({ name: "STRIPE_SECRET_KEY", value: stripe_secret_key.trim() });
    }
    if (stripe_webhook_secret?.trim()) {
      secretsToUpdate.push({ name: "STRIPE_WEBHOOK_SECRET", value: stripe_webhook_secret.trim() });
    }

    if (secretsToUpdate.length > 0) {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/secrets`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(secretsToUpdate),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Management API error (${res.status}): ${errText}`);
      }

      secretsToUpdate.forEach(s => { results[s.name] = "updated"; });
    }

    // ── 3. Redéploiement des fonctions concernées ────────────────────────
    const redeployResults: Record<string, string> = {};
    for (const slug of FUNCTIONS_TO_REDEPLOY) {
      try {
        // Récupérer la config actuelle de la fonction
        const configRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/functions/${slug}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!configRes.ok) { redeployResults[slug] = "skip (not found)"; continue; }

        // Déclencher le redéploiement via PATCH (force restart)
        const patchRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/functions/${slug}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ verify_jwt: false }),
          }
        );
        redeployResults[slug] = patchRes.ok ? "restarted" : `error ${patchRes.status}`;
      } catch {
        redeployResults[slug] = "error";
      }
    }

    return new Response(
      JSON.stringify({ ok: true, results, redeploy: redeployResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[update-stripe-secrets] ERROR:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
