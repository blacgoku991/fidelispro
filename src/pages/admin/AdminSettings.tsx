import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard, Info, Loader2, Eye, EyeOff, Save,
  CheckCircle2, AlertTriangle, KeyRound, Zap,
} from "lucide-react";
import { STRIPE_PLANS } from "@/lib/stripePlans";
import { toast } from "sonner";

const PLAN_KEYS = ["starter", "pro", "enterprise"] as const;

async function fetchSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("site_settings").select("key, value").in("key", [
    "plan_starter_name", "plan_starter_price",
    "plan_pro_name",     "plan_pro_price",
    "stripe_product_starter", "stripe_product_pro",
    "stripe_price_starter",   "stripe_price_pro",
    "stripe_public_key",
  ]);
  const cfg: Record<string, string> = {};
  data?.forEach(r => { cfg[r.key] = r.value; });
  return cfg;
}

function stripeMode(pk: string): "live" | "test" | null {
  if (pk.startsWith("pk_live_")) return "live";
  if (pk.startsWith("pk_test_")) return "test";
  return null;
}

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: fetchSettings,
  });

  // Stripe keys form
  const [publicKey,  setPublicKey]  = useState("");
  const [secretKey,  setSecretKey]  = useState("");
  const [webhookSec, setWebhookSec] = useState("");
  const [showSk,     setShowSk]     = useState(false);
  const [showWh,     setShowWh]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveResult, setSaveResult] = useState<"ok" | "error" | null>(null);

  const effectivePk = publicKey || cfg?.stripe_public_key || import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";
  const mode = stripeMode(effectivePk);

  const handleSave = async () => {
    if (!publicKey && !secretKey && !webhookSec) {
      toast.error("Remplissez au moins un champ");
      return;
    }
    if (publicKey && !publicKey.startsWith("pk_")) {
      toast.error("La clé publique doit commencer par pk_test_ ou pk_live_");
      return;
    }
    if (secretKey && !secretKey.startsWith("sk_")) {
      toast.error("La clé secrète doit commencer par sk_test_ ou sk_live_");
      return;
    }
    if (webhookSec && !webhookSec.startsWith("whsec_")) {
      toast.error("Le secret webhook doit commencer par whsec_");
      return;
    }

    setSaving(true);
    setSaveResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("update-stripe-secrets", {
        body: {
          stripe_public_key: publicKey || undefined,
          stripe_secret_key: secretKey || undefined,
          stripe_webhook_secret: webhookSec || undefined,
        },
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      setSaveResult("ok");
      toast.success("Clés Stripe mises à jour");
      setSecretKey("");
      setWebhookSec("");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (err: any) {
      setSaveResult("error");
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
    setSaving(false);
  };

  return (
    <AdminLayout title="Configuration" subtitle="Paramètres globaux de la plateforme">
      <div className="max-w-2xl space-y-6">

        {/* ── Clés API Stripe ──────────────────────────────────────────── */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" /> Clés API Stripe
            </h3>
            {mode && (
              <Badge className={
                mode === "live"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }>
                {mode === "live" ? "🟢 Mode Live" : "🟡 Mode Test"}
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {/* Clé publique */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Clé publique (STRIPE_PUBLIC_KEY)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={publicKey}
                  onChange={e => setPublicKey(e.target.value)}
                  placeholder={cfg?.stripe_public_key
                    ? `Actuelle : ${cfg.stripe_public_key.slice(0, 18)}…`
                    : "pk_test_… ou pk_live_…"}
                  className="font-mono text-sm rounded-xl"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Stockée dans site_settings — lue par le frontend
              </p>
            </div>

            {/* Clé secrète */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Clé secrète (STRIPE_SECRET_KEY)
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSk ? "text" : "password"}
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value)}
                  placeholder="sk_test_… ou sk_live_…"
                  className="font-mono text-sm rounded-xl"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => setShowSk(v => !v)}
                  type="button"
                >
                  {showSk ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mise à jour dans les Supabase Secrets (non visible après envoi)
              </p>
            </div>

            {/* Webhook secret */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Webhook Secret (STRIPE_WEBHOOK_SECRET)
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showWh ? "text" : "password"}
                  value={webhookSec}
                  onChange={e => setWebhookSec(e.target.value)}
                  placeholder="whsec_…"
                  className="font-mono text-sm rounded-xl"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => setShowWh(v => !v)}
                  type="button"
                >
                  {showWh ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mise à jour dans les Supabase Secrets (non visible après envoi)
              </p>
            </div>
          </div>

          {/* Résultat */}
          {saveResult === "ok" && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Clés mises à jour — les fonctions Edge utilisent les nouvelles valeurs
            </div>
          )}
          {saveResult === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Erreur lors de la mise à jour. Vérifiez que SUPABASE_ACCESS_TOKEN est configuré dans les secrets.
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Les fonctions concernées sont redémarrées automatiquement
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-primary text-primary-foreground rounded-xl gap-2 h-9"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* ── Plans & Tarifs ────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Plans & Tarifs Stripe
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {PLAN_KEYS.map((key) => {
                const fallback = STRIPE_PLANS[key];
                const name    = (key !== "enterprise" && cfg?.[`plan_${key}_name`])      || fallback.name;
                const price   = (key !== "enterprise" && cfg?.[`plan_${key}_price`])     || String(fallback.price);
                const priceId = (key !== "enterprise" && cfg?.[`stripe_price_${key}`])   || fallback.price_id;
                const prodId  = (key !== "enterprise" && cfg?.[`stripe_product_${key}`]) || fallback.product_id;
                const isFromDb = key !== "enterprise" && !!cfg?.[`stripe_price_${key}`];

                return (
                  <div key={key} className="p-4 rounded-xl bg-secondary/30 border border-border/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{name}</p>
                        {"popular" in fallback && fallback.popular && (
                          <Badge className="bg-primary/10 text-primary text-[10px]">Populaire</Badge>
                        )}
                        {isFromDb ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">site_settings</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">hardcodé</Badge>
                        )}
                      </div>
                      <p className="font-display font-bold text-lg">
                        {price}€<span className="text-xs text-muted-foreground font-normal">/mois</span>
                      </p>
                    </div>
                    <div className="space-y-1 text-[11px] font-mono text-muted-foreground/70">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground/50 w-20 shrink-0">Price ID</span>
                        <span className={isFromDb ? "text-primary/80" : ""}>{priceId || "—"}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground/50 w-20 shrink-0">Product ID</span>
                        <span>{prodId || "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Pour modifier les prix, utilisez la page <span className="font-medium">Plans & Tarifs</span>.
          </p>
        </div>

        {/* ── Infos plateforme ──────────────────────────────────────────── */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Informations plateforme
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>1.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pass Type ID</span><span className="font-mono text-xs">pass.app.fidelispro</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Apple Team ID</span><span className="font-mono text-xs">9642GYNCU9</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode Stripe</span>
              <span className={`font-mono text-xs font-medium ${mode === "live" ? "text-emerald-600" : "text-amber-600"}`}>
                {mode === "live" ? "Live" : "Test"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
