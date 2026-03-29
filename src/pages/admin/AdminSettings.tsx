import { AdminLayout } from "@/components/admin/AdminLayout";
import { STRIPE_PLANS } from "@/lib/stripePlans";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Settings2, Info } from "lucide-react";

const AdminSettings = () => {
  return (
    <AdminLayout title="Configuration" subtitle="Paramètres globaux de la plateforme">
      <div className="max-w-2xl space-y-6">

        {/* Plans & Pricing */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Plans & Tarifs Stripe
          </h3>
          <div className="space-y-3">
            {Object.entries(STRIPE_PLANS).map(([key, plan]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/20">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{plan.name}</p>
                    {"popular" in plan && plan.popular && (
                      <Badge className="bg-primary/10 text-primary text-[10px]">Populaire</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.features.slice(0, 3).join(" • ")}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{plan.price_id}</p>
                </div>
                <p className="font-display font-bold text-lg">{plan.price}€<span className="text-xs text-muted-foreground font-normal">/mois</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* Trial settings */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" /> Période d'essai
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Durée par défaut</p>
              <p className="text-xs text-muted-foreground">Appliquée aux nouvelles inscriptions</p>
            </div>
            <p className="font-display font-bold">14 jours</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Renouvellement automatique</p>
              <p className="text-xs text-muted-foreground">Géré par Stripe Subscriptions</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Activé</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Relance avant expiration</p>
              <p className="text-xs text-muted-foreground">Email automatique Stripe 3j avant</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Activé</Badge>
          </div>
        </div>

        {/* Platform info */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Informations plateforme
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>1.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pass Type ID</span><span className="font-mono text-xs">pass.app.lovable.fidelispro</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Apple Team ID</span><span className="font-mono text-xs">9642GYNCU9</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode Stripe</span><span className="font-mono text-xs">Test</span></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
