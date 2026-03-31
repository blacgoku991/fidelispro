import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth : vérifier que l'appelant possède le business ────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) return json({ error: "Non authentifié" }, 401);

    // Appel interne (service_role) → bypass ownership check
    const isInternal = token === sbKey;

    const supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

    let verifiedBusinessId: string | null = null;

    const body = await req.json();
    const { business_id, message, change_message } = body;

    if (!business_id) return json({ error: "business_id required" }, 400);

    if (isInternal) {
      verifiedBusinessId = business_id;
    } else {
      // Valider le JWT utilisateur
      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData?.user) return json({ error: "Token invalide" }, 401);

      // Vérifier que l'utilisateur possède ce business
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", business_id)
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (!biz) return json({ error: "Commerce introuvable ou accès refusé" }, 403);
      verifiedBusinessId = biz.id;
    }

    // ── Envoi Apple Wallet push ───────────────────────────────────────────
    let walletSent = 0;
    try {
      const wr = await fetch(`${sbUrl}/functions/v1/wallet-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sbKey}`,
        },
        body: JSON.stringify({
          business_id: verifiedBusinessId,
          action_type: "campaign",
          change_message: change_message || message,
        }),
      });
      const walletResult = await wr.json();
      walletSent = walletResult.pushed || 0;
    } catch (e) {
      console.error("Wallet push error:", e);
    }

    return json({ wallet: walletSent, webpush: 0 });
  } catch (err) {
    console.error("send-notifications error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
