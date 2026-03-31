import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Zap, Loader2, CheckCircle2 } from "lucide-react";

const PLAN_KEYS = ["starter", "pro"] as const;

interface PlanForm {
  name: string;
  price: string;
  features: string; // JSON array as multiline textarea (one feature per line)
  stripe_product: string;
  stripe_price: string;
}

const DEFAULTS: Record<string, PlanForm> = {
  starter: { name: "Starter", price: "29", features: "", stripe_product: "", stripe_price: "" },
  pro:     { name: "Pro",     price: "59", features: "", stripe_product: "", stripe_price: "" },
};

async function fetchSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("site_settings").select("key, value").in("key", [
    "plan_starter_name", "plan_starter_price", "plan_starter_features",
    "plan_pro_name",     "plan_pro_price",     "plan_pro_features",
    "stripe_product_starter", "stripe_product_pro",
    "stripe_price_starter",   "stripe_price_pro",
  ]);
  const cfg: Record<string, string> = {};
  data?.forEach(r => { cfg[r.key] = r.value; });
  return cfg;
}

function featuresFromJson(json: string | undefined): string {
  if (!json) return "";
  try { return (JSON.parse(json) as string[]).join("\n"); } catch { return json; }
}

function featuresToJson(text: string): string {
  const arr = text.split("\n").map(l => l.trim()).filter(Boolean);
  return JSON.stringify(arr);
}

const AdminPlans = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [forms, setForms] = useState<Record<string, PlanForm>>({ ...DEFAULTS });
  const [initialized, setInitialized] = useState(false);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["admin-plan-settings"],
    queryFn: fetchSettings,
    onSuccess: (data) => {
      if (!initialized) {
        setForms({
          starter: {
            name:            data.plan_starter_name    || "Starter",
            price:           data.plan_starter_price   || "29",
            features:        featuresFromJson(data.plan_starter_features),
            stripe_product:  data.stripe_product_starter || "",
            stripe_price:    data.stripe_price_starter   || "",
          },
          pro: {
            name:            data.plan_pro_name        || "Pro",
            price:           data.plan_pro_price       || "59",
            features:        featuresFromJson(data.plan_pro_features),
            stripe_product:  data.stripe_product_pro   || "",
            stripe_price:    data.stripe_price_pro     || "",
          },
        });
        setInitialized(true);
      }
    },
  } as any);

  const setField = (plan: string, field: keyof PlanForm, value: string) => {
    setForms(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: value } }));
  };

  const savePlan = async (plan: "starter" | "pro") => {
    const f = forms[plan];
    const priceNum = parseInt(f.price);
    if (!f.name.trim() || isNaN(priceNum) || priceNum <= 0) {
      toast.error("Nom et prix requis (prix > 0)");
      return;
    }

    // Check if price changed — if so, call manage-stripe-plans to create new Stripe price
    const oldPrice = cfg?.[`plan_${plan}_price`];
    const oldName  = cfg?.[`plan_${plan}_name`];
    const hasStripeProduct = !!(cfg?.[`stripe_product_${plan}`]);

    setSaving(plan);
    try {
      if (hasStripeProduct && (String(priceNum) !== oldPrice || f.name !== oldName)) {
        // Update via Stripe API
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await supabase.functions.invoke("manage-stripe-plans", {
          body: { action: "update_price", plan, price: priceNum, name: f.name },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.error) throw new Error(res.error.message);
        toast.success(`Plan ${f.name} mis à jour sur Stripe`);
      } else {
        // Just update site_settings directly
        const rows = [
          { key: `plan_${plan}_name`,  value: f.name },
          { key: `plan_${plan}_price`, value: String(priceNum) },
        ];
        for (const r of rows) {
          await supabase.from("site_settings").upsert(r, { onConflict: "key" });
        }
      }

      // Always save features
      if (f.features.trim()) {
        await supabase.from("site_settings").upsert(
          { key: `plan_${plan}_features`, value: featuresToJson(f.features) },
          { onConflict: "key" }
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-plan-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Modifications enregistrées");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  const createStripeProducts = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await supabase.functions.invoke("manage-stripe-plans", {
        body: { action: "create_products" },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.error) throw new Error(res.error.message);
      await queryClient.invalidateQueries({ queryKey: ["admin-plan-settings"] });
      setInitialized(false); // re-init forms with new IDs
      toast.success("Produits Stripe créés et Price IDs sauvegardés !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur Stripe");
    } finally {
      setCreating(false);
    }
  };

  const starterHasStripe = !!(cfg?.stripe_price_starter);
  const proHasStripe     = !!(cfg?.stripe_price_pro);

  return (
    <AdminLayout
      title="Plans & Tarifs"
      subtitle="Modifiez les prix et créez les produits Stripe"
      headerAction={
        <Button
          onClick={createStripeProducts}
          disabled={creating}
          className="gap-2 bg-gradient-primary text-primary-foreground rounded-xl"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {starterHasStripe && proHasStripe ? "Recréer les prix Stripe" : "Créer les produits Stripe"}
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          {PLAN_KEYS.map(plan => {
            const f = forms[plan];
            const hasStripe = !!(cfg?.[`stripe_price_${plan}`]);
            return (
              <div key={plan} className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-lg capitalize">{plan}</h3>
                  {hasStripe ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Stripe OK
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Pas encore sur Stripe</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Nom du plan</Label>
                  <Input
                    value={f.name}
                    onChange={e => setField(plan, "name", e.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prix mensuel (€)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={f.price}
                      onChange={e => setField(plan, "price", e.target.value)}
                      className="rounded-xl h-10 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€/mois</span>
                  </div>
                  {hasStripe && (
                    <p className="text-xs text-muted-foreground">
                      Changer le prix créera un nouveau Price ID Stripe et archivera l'ancien.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Fonctionnalités <span className="text-muted-foreground text-xs">(une par ligne)</span></Label>
                  <Textarea
                    value={f.features}
                    onChange={e => setField(plan, "features", e.target.value)}
                    placeholder={"Scanner QR\nGestion clients\nCartes de fidélité"}
                    rows={5}
                    className="rounded-xl resize-none text-sm"
                  />
                </div>

                {hasStripe && (
                  <div className="space-y-1 p-3 rounded-xl bg-muted/40 text-xs font-mono text-muted-foreground">
                    <div className="truncate">Product: {cfg?.[`stripe_product_${plan}`]}</div>
                    <div className="truncate">Price:   {cfg?.[`stripe_price_${plan}`]}</div>
                  </div>
                )}

                <Button
                  onClick={() => savePlan(plan)}
                  disabled={saving === plan}
                  className="w-full rounded-xl gap-2"
                >
                  {saving === plan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPlans;
