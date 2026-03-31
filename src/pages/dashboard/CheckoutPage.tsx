import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle, Loader2, Zap, Crown, Check,
  ArrowRight, LayoutDashboard,
} from "lucide-react";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripePlans";
import { motion, AnimatePresence } from "framer-motion";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ||
  "pk_test_51TFvKzFQlLT8Im0JFlVZADj2QIjmXQGFQVmWXt4uLlsO7cjrwI1rv8wbZVEzo7HRNjf40I664nDV2vOKZhnTIXjb00s1qkdukH"
);

const PLANS: { key: PlanKey; Icon: React.ElementType; gradient: string; accent: string }[] = [
  { key: "starter", Icon: Zap, gradient: "from-violet-500 to-purple-600", accent: "violet" },
  { key: "pro",     Icon: Crown, gradient: "from-amber-400 to-orange-500", accent: "amber"  },
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
  const [showCheckout, setShowCheckout] = useState(false);

  const currentPlan = (business as any)?.subscription_plan as PlanKey | null;
  const subscriptionStatus = (business as any)?.subscription_status as string | null;
  const isActive = subscriptionStatus === "active";

  // Auto-select plan from URL param
  useEffect(() => {
    if (planParam && STRIPE_PLANS[planParam]) setSelectedPlan(planParam);
  }, [planParam]);

  // Success screen
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
        <Button variant="ghost" onClick={() => navigate("/dashboard/settings")} className="gap-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
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

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {PLANS.map(({ key, Icon, gradient }) => {
            const plan = STRIPE_PLANS[key];
            const isCurrent = isActive && currentPlan === key;
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
                {/* Popular / Plan actuel badge */}
                {(isCurrent || (key === "pro" && !isCurrent)) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      className={
                        isCurrent
                          ? "bg-emerald-500 text-white px-3 py-0.5 text-xs"
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
                    <Button
                      disabled
                      className="w-full rounded-xl h-11 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      variant="outline"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Abonnement actif
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        // Redirect to Stripe portal for plan change
                        supabase.functions.invoke("customer-portal").then(({ data }) => {
                          if (data?.url) window.open(data.url, "_blank");
                        });
                      }}
                      className={`w-full rounded-xl h-11 ${
                        key === "pro"
                          ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90"
                          : "bg-card border border-border hover:bg-muted"
                      }`}
                      variant={key === "pro" ? "default" : "outline"}
                    >
                      {key === "pro" ? (
                        <>Passer au plan Pro <ArrowRight className="w-4 h-4 ml-2" /></>
                      ) : (
                        <>Réduire au Starter</>
                      )}
                    </Button>
                  )
                ) : (
                  <Button
                    onClick={() => {
                      setSelectedPlan(key);
                      setShowCheckout(true);
                    }}
                    className={`w-full rounded-xl h-11 ${
                      isSelected
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                        : "bg-card border border-border hover:bg-muted text-foreground"
                    }`}
                    variant={isSelected ? "default" : "outline"}
                  >
                    {isSelected ? (
                      <>Continuer avec {plan.name} <ArrowRight className="w-4 h-4 ml-2" /></>
                    ) : (
                      <>Sélectionner {plan.name}</>
                    )}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Embedded Stripe Checkout — only when not active */}
        <AnimatePresence>
          {!isActive && showCheckout && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="rounded-2xl border border-border/50 overflow-hidden bg-card"
            >
              <div className="px-6 pt-5 pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold">
                      Plan {STRIPE_PLANS[selectedPlan].name} — {STRIPE_PLANS[selectedPlan].price}€/mois
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Paiement sécurisé par Stripe · Carte bancaire · Apple Pay · Google Pay</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs rounded-xl"
                    onClick={() => setShowCheckout(false)}
                  >
                    Changer de plan
                  </Button>
                </div>
              </div>
              <EmbeddedCheckoutWrapper plan={selectedPlan} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust signals */}
        <p className="text-center text-xs text-muted-foreground">
          🔒 Paiement 100% sécurisé par Stripe · Données chiffrées · Résiliable à tout moment depuis votre espace
        </p>
      </div>
    </DashboardLayout>
  );
};

function EmbeddedCheckoutWrapper({ plan }: { plan: PlanKey }) {
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { plan, ui_mode: "embedded" },
    });
    if (error) {
      setError(error.message || "Erreur lors de la création du checkout");
      throw error;
    }
    if (data?.error) {
      setError(data.error);
      throw new Error(data.error);
    }
    return data.clientSecret;
  }, [plan]);

  if (error) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={() => { setError(null); window.location.reload(); }}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
      <EmbeddedCheckout className="min-h-[400px]" />
    </EmbeddedCheckoutProvider>
  );
}

export default CheckoutPage;
