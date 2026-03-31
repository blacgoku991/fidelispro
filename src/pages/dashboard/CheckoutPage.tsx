import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle, Loader2, Zap, Crown, Check,
  ArrowRight, LayoutDashboard, RefreshCw,
} from "lucide-react";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripePlans";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PLANS: { key: PlanKey; Icon: React.ElementType; gradient: string }[] = [
  { key: "starter", Icon: Zap,   gradient: "from-violet-500 to-purple-600" },
  { key: "pro",     Icon: Crown, gradient: "from-amber-400 to-orange-500"  },
];

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { business, loading: authLoading } = useAuth();

  const planParam = searchParams.get("plan") as PlanKey | null;
  const checkoutSuccess = searchParams.get("checkout");

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(
    planParam && STRIPE_PLANS[planParam] ? planParam : "pro"
  );
  // null = sélecteur visible | string = redirection en cours vers Stripe
  const [redirecting, setRedirecting] = useState<PlanKey | null>(null);
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlan  = (business as any)?.subscription_plan as PlanKey | null;
  const isActive     = (business as any)?.subscription_status === "active";
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error || !data?.url) throw new Error(error?.message || data?.error || "Impossible d'accéder au portail");
      window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erreur portail Stripe");
    }
    setPortalLoading(false);
  };

  useEffect(() => {
    if (planParam && STRIPE_PLANS[planParam]) setSelectedPlan(planParam);
  }, [planParam]);

  // ── Lancer le checkout Stripe hosted ───────────────────────────────────
  const startCheckout = async (plan: PlanKey) => {
    setError(null);
    setRedirecting(plan);
    setCheckoutStarted(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("create-checkout", {
        body: { plan },
      });
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error);
      if (!data?.url) throw new Error("URL de paiement manquante");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du checkout");
      setRedirecting(null);
      setCheckoutStarted(false);
    }
  };

  // ── Écran succès ────────────────────────────────────────────────────────
  if (checkoutSuccess === "success") {
    return (
      <DashboardLayout title="Paiement réussi" subtitle="Votre abonnement est activé">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto text-center py-16 space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">Merci ! 🎉</h2>
            <p className="text-muted-foreground mt-2">
              Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités.
            </p>
          </div>
          <Button
            onClick={() => window.location.replace("/dashboard")}
            className="bg-gradient-primary text-primary-foreground rounded-xl gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Accéder au tableau de bord
          </Button>
        </motion.div>
      </DashboardLayout>
    );
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Abonnement" subtitle="Chargement...">
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Choisissez votre plan"
      subtitle="Paiement sécurisé · Sans engagement · Résiliable à tout moment"
      headerAction={
        checkoutStarted ? (
          <Button
            variant="ghost"
            onClick={() => { setCheckoutStarted(false); setRedirecting(null); setError(null); }}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" /> Changer de plan
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate("/dashboard/settings")} className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
        )
      }
    >
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Already subscribed banner */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium">
                Vous êtes déjà abonné au plan{" "}
                <span className="font-bold">{currentPlan ? STRIPE_PLANS[currentPlan]?.name : "actif"}</span>.
                Pour modifier votre abonnement, utilisez le portail Stripe.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => window.location.replace("/dashboard")}
              className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-2"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Redirection en cours ─────────────────────────────────── */}
          {checkoutStarted && !error ? (
            <motion.div
              key="redirecting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-5"
            >
              <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
              <div className="text-center">
                <p className="font-display font-semibold text-lg">
                  Redirection vers Stripe…
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Plan {STRIPE_PLANS[selectedPlan].name} — {STRIPE_PLANS[selectedPlan].price}€/mois
                </p>
              </div>
            </motion.div>

          ) : (
            /* ── Sélecteur de plans ──────────────────────────────────── */
            <motion.div
              key="plans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center">
                  {error} — <button className="underline" onClick={() => setError(null)}>Réessayer</button>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                {PLANS.map(({ key, Icon, gradient }) => {
                  const plan    = STRIPE_PLANS[key];
                  const isCurrent  = isActive && currentPlan === key;
                  const isSelected = selectedPlan === key;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: key === "starter" ? 0 : 0.07 }}
                      onClick={() => { if (!isActive) setSelectedPlan(key); }}
                      className={[
                        "relative rounded-2xl border-2 p-6 transition-all duration-200",
                        !isActive ? "cursor-pointer" : "cursor-default",
                        isSelected && !isActive
                          ? "border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/10"
                          : "border-border/50 bg-card hover:border-border",
                        isCurrent ? "ring-2 ring-emerald-500/30" : "",
                      ].join(" ")}
                    >
                      {/* Badge */}
                      {(isCurrent || key === "pro") && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge
                            className={
                              isCurrent
                                ? "bg-emerald-500 text-white px-3 py-0.5 text-xs border-0"
                                : "bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-0.5 text-xs border-0"
                            }
                          >
                            {isCurrent ? "✓ Plan actuel" : "⭐ Populaire"}
                          </Badge>
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {key === "starter" ? "Pour démarrer" : "Croissance rapide"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold text-3xl">{plan.price}€</p>
                          <p className="text-xs text-muted-foreground">/mois</p>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2.5 mb-6">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2.5 text-sm">
                            <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                              key === "pro"
                                ? "bg-amber-400/20 text-amber-500"
                                : "bg-violet-500/20 text-violet-500"
                            }`}>
                              <Check className="w-2.5 h-2.5" />
                            </span>
                            <span className={f === "Tout Starter +" ? "font-medium" : "text-muted-foreground"}>
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {isActive ? (
                        isCurrent ? (
                          <Button disabled variant="outline"
                            className="w-full rounded-xl h-11 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Abonnement actif
                          </Button>
                        ) : (
                          <Button
                            onClick={openPortal}
                            disabled={portalLoading}
                            className={`w-full rounded-xl h-11 ${
                              key === "pro"
                                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90 border-0"
                                : "border border-border"
                            }`}
                            variant={key === "pro" ? "default" : "outline"}
                          >
                            {portalLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : key === "pro" ? (
                              <><span>Passer au plan Pro</span><ArrowRight className="w-4 h-4 ml-2" /></>
                            ) : (
                              "Réduire au Starter"
                            )}
                          </Button>
                        )
                      ) : (
                        <Button
                          onClick={(e) => { e.stopPropagation(); startCheckout(key); }}
                          disabled={!!redirecting}
                          className={`w-full rounded-xl h-11 ${
                            isSelected
                              ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 border-0"
                              : "border border-border bg-card text-foreground hover:bg-muted"
                          }`}
                          variant={isSelected ? "default" : "outline"}
                        >
                          {redirecting === key ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirection…</>
                          ) : isSelected ? (
                            <><span>Continuer avec {plan.name}</span><ArrowRight className="w-4 h-4 ml-2" /></>
                          ) : (
                            `Sélectionner ${plan.name}`
                          )}
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground">
          🔒 Paiement 100% sécurisé par Stripe · Carte bancaire · Apple Pay · Google Pay · Résiliable à tout moment
        </p>
      </div>
    </DashboardLayout>
  );
};

export default CheckoutPage;
