import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripePlans";
import { motion } from "framer-motion";

const stripePromise = loadStripe("pk_test_51TFvKzFQlLT8Im0JFlVZADj2QIjmXQGFQVmWXt4uLlsO7cjrwI1rv8wbZVEzo7HRNjf40I664nDV2vOKZhnTIXjb00s1qkdukH");

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const plan = searchParams.get("plan") as PlanKey | null;
  const checkoutSuccess = searchParams.get("checkout");

  // Success state
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
            <p className="text-muted-foreground mt-2">Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités.</p>
          </div>
          <Button
            onClick={() => navigate("/dashboard/settings")}
            className="bg-gradient-primary text-primary-foreground rounded-xl"
          >
            Retour aux paramètres
          </Button>
        </motion.div>
      </DashboardLayout>
    );
  }

  if (!plan || !STRIPE_PLANS[plan]) {
    return (
      <DashboardLayout title="Checkout" subtitle="Plan invalide">
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">Plan non trouvé.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/settings")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const selectedPlan = STRIPE_PLANS[plan];

  return (
    <DashboardLayout
      title={`Souscrire à ${selectedPlan.name}`}
      subtitle={`${selectedPlan.price}€/mois — Paiement sécurisé par Stripe`}
      headerAction={
        <Button variant="ghost" onClick={() => navigate("/dashboard/settings")} className="gap-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
      }
    >
      <div className="max-w-3xl mx-auto">
        {/* Plan summary */}
        <div className="mb-6 p-4 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg">{selectedPlan.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{selectedPlan.features.slice(0, 3).join(" • ")}</p>
            </div>
            <p className="font-display font-bold text-2xl">{selectedPlan.price}€<span className="text-sm text-muted-foreground font-normal">/mois</span></p>
          </div>
        </div>

        {/* Embedded Checkout */}
        <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
          <EmbeddedCheckoutWrapper plan={plan} />
        </div>
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
