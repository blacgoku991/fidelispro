import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTIONS_TO_RESTART = ["generate-pass", "wallet-push", "wallet-webservice"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // ── Auth : super_admin uniquement ────────────────────────────────────────
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

    // ── Lire le body ─────────────────────────────────────────────────────────
    const { apple_team_id, apple_pass_type_id, apple_p12_base64, apple_p12_password } = await req.json();

    const projectRef = Deno.env.get("SUPABASE_PROJECT_REF") || "piuaelsbocjtpdwzykfe";
    const accessToken = Deno.env.get("MGMT_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MGMT_ACCESS_TOKEN non configuré dans les secrets");

    // ── Envoyer les secrets via Management API ────────────────────────────────
    const secretsToUpdate: { name: string; value: string }[] = [];
    if (apple_team_id?.trim())     secretsToUpdate.push({ name: "APPLE_TEAM_ID",     value: apple_team_id.trim() });
    if (apple_pass_type_id?.trim()) secretsToUpdate.push({ name: "APPLE_PASS_TYPE_ID", value: apple_pass_type_id.trim() });
    if (apple_p12_base64?.trim())  secretsToUpdate.push({ name: "APPLE_P12_BASE64",  value: apple_p12_base64.trim() });
    if (apple_p12_password?.trim()) secretsToUpdate.push({ name: "APPLE_P12_PASSWORD", value: apple_p12_password.trim() });

    if (secretsToUpdate.length === 0) throw new Error("Aucun champ à sauvegarder");

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

    const results: Record<string, string> = {};
    secretsToUpdate.forEach((s) => { results[s.name] = "updated"; });

    // ── Redémarrer les fonctions concernées ───────────────────────────────────
    const redeployResults: Record<string, string> = {};
    for (const slug of FUNCTIONS_TO_RESTART) {
      try {
        const configRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/functions/${slug}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!configRes.ok) { redeployResults[slug] = "skip (not found)"; continue; }

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
    console.error("[update-apple-wallet-secrets] ERROR:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
