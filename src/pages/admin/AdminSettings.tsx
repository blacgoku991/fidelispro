import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Settings2, Info, Loader2 } from "lucide-react";
import { STRIPE_PLANS } from "@/lib/stripePlans";

const PLAN_KEYS = ["starter", "pro", "enterprise"] as const;

async function fetchPlanSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("site_settings").select("key, value").in("key", [
    "plan_starter_name", "plan_starter_price",
    "plan_pro_name",     "plan_pro_price",
    "stripe_product_starter", "stripe_product_pro",
    "stripe_price_starter",   "stripe_price_pro",
  ]);
  const cfg: Record<string, string> = {};
  data?.forEach(r => { cfg[r.key] = r.value; });
  return cfg;
}

const AdminSettings = () => {
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["admin-plan-settings"],
    queryFn: fetchPlanSettings,
  });

  return (
    <AdminLayout title="Configuration" subtitle="Paramètres globaux de la plateforme">
      <div className="max-w-2xl space-y-6">

        {/* Plans & Pricing */}
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
                // Lire depuis site_settings en priorité, fallback sur STRIPE_PLANS
                const name     = (key !== "enterprise" && cfg?.[`plan_${key}_name`])    || fallback.name;
                const price    = (key !== "enterprise" && cfg?.[`plan_${key}_price`])   || String(fallback.price);
                const priceId  = (key !== "enterprise" && cfg?.[`stripe_price_${key}`]) || fallback.price_id;
                const prodId   = (key !== "enterprise" && cfg?.[`stripe_product_${key}`]) || fallback.product_id;
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

        {/* Platform info */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Informations plateforme
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>1.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pass Type ID</span><span className="font-mono text-xs">pass.app.fidelispro</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Apple Team ID</span><span className="font-mono text-xs">9642GYNCU9</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode Stripe</span><span className="font-mono text-xs">Test</span></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
