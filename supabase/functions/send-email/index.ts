import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_COLOR = "#7C3AED";
const ACCENT_COLOR = "#F59E0B";

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_COLOR},#5b21b6);padding:32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">FidéliPro</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);">Votre programme de fidélité digital</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:11px;color:#999;">© 2026 FidéliPro — Tous droits réservés</p>
            <p style="margin:4px 0 0;font-size:11px;color:#999;">Vous recevez cet email car vous avez créé un compte FidéliPro.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeTemplate(businessName: string, email: string): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1a1a2e;">Bienvenue sur FidéliPro ! 🎉</h1>
    <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
      Votre compte commerçant est créé. Vous pouvez maintenant configurer votre programme de fidélité et commencer à fidéliser vos clients.
    </p>
    <div style="background:#f5f3ff;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${BRAND_COLOR};">Commerce enregistré</p>
      <p style="margin:0;font-size:18px;font-weight:800;color:#1a1a2e;">${businessName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#666;">${email}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${["Scanner vos clients avec le QR code", "Créer vos récompenses personnalisées", "Envoyer des campagnes push ciblées", "Analyser vos statistiques en temps réel"].map(f =>
        `<tr><td style="padding:4px 0;"><span style="color:${ACCENT_COLOR};font-size:16px;margin-right:8px;">✦</span><span style="font-size:14px;color:#444;">${f}</span></td></tr>`
      ).join("")}
    </table>
    <a href="https://fidelispro.vercel.app/dashboard" style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#5b21b6);color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      Accéder à mon dashboard →
    </a>
  `;
  return {
    subject: `Bienvenue sur FidéliPro, ${businessName} !`,
    html: baseTemplate(`Bienvenue sur FidéliPro`, body),
  };
}

function paymentSucceededTemplate(businessName: string, email: string, plan: string | null, amount: number | null): { subject: string; html: string } {
  const planLabel = plan === "starter" ? "Starter — 29€/mois" : plan === "pro" ? "Pro — 79€/mois" : plan === "enterprise" ? "Enterprise — 199€/mois" : "Abonnement";
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#d1fae5;border-radius:50%;font-size:32px;margin-bottom:12px;">✓</div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1a1a2e;">Paiement confirmé !</h1>
      <p style="margin:0;color:#666;font-size:15px;">Votre abonnement FidéliPro est maintenant actif.</p>
    </div>
    <div style="background:#f5f3ff;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#888;">Commerce</td>
          <td style="font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;">${businessName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#888;padding-top:8px;">Plan</td>
          <td style="font-size:14px;font-weight:700;color:${BRAND_COLOR};text-align:right;padding-top:8px;">${planLabel}</td>
        </tr>
        ${amount ? `<tr>
          <td style="font-size:13px;color:#888;padding-top:8px;">Montant</td>
          <td style="font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;padding-top:8px;">${amount.toFixed(2)} €</td>
        </tr>` : ""}
        <tr>
          <td style="font-size:13px;color:#888;padding-top:8px;">Date</td>
          <td style="font-size:14px;color:#1a1a2e;text-align:right;padding-top:8px;">${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</td>
        </tr>
      </table>
    </div>
    <a href="https://fidelispro.vercel.app/setup" style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#5b21b6);color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      Configurer mon programme →
    </a>
  `;
  return {
    subject: `Confirmation de paiement — FidéliPro ${planLabel}`,
    html: baseTemplate("Confirmation de paiement", body),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { type, user_id, plan, amount } = await req.json();

    if (!user_id) throw new Error("user_id required");

    // Get user email and business name
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    const email = authUser?.user?.email;
    if (!email) throw new Error("User email not found");

    const { data: biz } = await supabase
      .from("businesses")
      .select("name")
      .eq("owner_id", user_id)
      .maybeSingle();

    const businessName = (biz as any)?.name || "Votre commerce";

    let emailPayload: { subject: string; html: string };
    if (type === "welcome") {
      emailPayload = welcomeTemplate(businessName, email);
    } else if (type === "payment_succeeded") {
      emailPayload = paymentSucceededTemplate(businessName, email, plan, amount);
    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FidéliPro <noreply@fidelispro.fr>",
        to: [email],
        subject: emailPayload.subject,
        html: emailPayload.html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Resend error");

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
