import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard, ExternalLink, AlertTriangle, RefreshCw, Zap, Crown, Shield, Check, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripePlans";
import { motion } from "framer-motion";

const planIcons: Record<string, React.ElementType> = { starter: Zap, pro: Crown, enterprise: Shield };
const planColors: Record<string, string> = {
  starter: "from-blue-500 to-cyan-500",
  pro: "from-violet-500 to-purple-600",
  enterprise: "from-amber-500 to-orange-500",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active:   { label: "Actif",     color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  inactive: { label: "Inactif",   color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  past_due: { label: "Impayé",    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  canceled: { label: "Annulé",    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  trialing: { label: "Essai",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
};

const AbonnementPage = () => {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const plan = (business as any)?.subscription_plan as PlanKey | null;
  const status = (business as any)?.subscription_status as string | null;
  const planData = plan ? STRIPE_PLANS[plan] : null;
  const statusInfo = status ? (statusConfig[status] || statusConfig.inactive) : statusConfig.inactive;
  const Icon = plan ? (planIcons[plan] || CreditCard) : CreditCard;

  const openPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setPortalLoading(false);
    if (error || !data?.url) {
      toast.error("Impossible d'accéder au portail de facturation");
      return;
    }
    window.open(data.url, "_blank");
  };

  const cancelSubscription = async () => {
    setCanceling(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setCanceling(false);
    setCancelDialogOpen(false);
    if (error || !data?.url) {
      toast.error("Erreur lors de l'annulation");
      return;
    }
    // Redirect to portal where user can cancel
    window.location.href = data.url;
  };

  return (
    <DashboardLayout title="Abonnement" subtitle="Gérez votre plan et vos paiements">
      <div className="max-w-2xl space-y-6">

        {/* Current plan card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Plan actuel</h2>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan ? planColors[plan] : "from-gray-400 to-gray-500"} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-display font-bold">{planData?.name ?? "Aucun plan"}</h3>
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {planData ? `${planData.price}€/mois` : "Aucun abonnement actif"}
              </p>
            </div>
            {planData && (
              <p className="text-3xl font-display font-bold">{planData.price}€<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
            )}
          </div>

          {planData && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground mb-2">Inclus dans votre plan</p>
              <div className="grid grid-cols-2 gap-1.5">
                {planData.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Actions</h2>

          <Button
            onClick={openPortal}
            disabled={portalLoading}
            className="w-full justify-start h-12 rounded-xl bg-gradient-primary text-primary-foreground gap-3"
          >
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Gérer mon abonnement (portail Stripe)
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/checkout?plan=${plan || "pro"}`)}
            className="w-full justify-start h-12 rounded-xl gap-3"
          >
            <RefreshCw className="w-4 h-4" />
            Changer de plan
          </Button>

          {status === "active" && (
            <Button
              variant="ghost"
              onClick={() => setCancelDialogOpen(true)}
              className="w-full justify-start h-12 rounded-xl gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle className="w-4 h-4" />
              Annuler mon abonnement
            </Button>
          )}

          {(status === "inactive" || status === "canceled" || status === "past_due") && (
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/checkout?plan=${plan || "pro"}`)}
              className="w-full justify-start h-12 rounded-xl gap-3 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            >
              <CreditCard className="w-4 h-4" />
              Réactiver mon abonnement
            </Button>
          )}
        </motion.div>

        {/* Payment history via portal */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Historique des paiements</h2>
          <div className="text-center py-8 space-y-3">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">L'historique complet de vos factures est disponible dans le portail Stripe.</p>
            <Button variant="outline" onClick={openPortal} disabled={portalLoading} className="gap-2 rounded-xl">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Voir mes factures
            </Button>
          </div>
        </motion.div>

      </div>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Annuler l'abonnement
            </DialogTitle>
            <DialogDescription>
              Vous allez être redirigé vers le portail Stripe pour annuler votre abonnement.
              Votre accès restera actif jusqu'à la fin de la période en cours.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="rounded-xl">
              Garder mon abonnement
            </Button>
            <Button
              variant="destructive"
              onClick={cancelSubscription}
              disabled={canceling}
              className="rounded-xl gap-2"
            >
              {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continuer vers Stripe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AbonnementPage;
