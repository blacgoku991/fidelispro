import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { business } = useAuth();

  if (!business) return <>{children}</>;

  const status = business.subscription_status;
  const isBlocked = status === "canceled" || status === "inactive" || status === "past_due";

  // Check trial expiration
  const trialExpired = status === "trialing" && business.trial_ends_at && new Date(business.trial_ends_at) < new Date();

  if (!isBlocked && !trialExpired) return <>{children}</>;

  const message = trialExpired
    ? "Votre période d'essai est terminée. Souscrivez à un abonnement pour continuer."
    : status === "past_due"
    ? "Votre paiement est en retard. Mettez à jour vos informations de paiement."
    : status === "canceled"
    ? "Votre abonnement a été annulé. Réabonnez-vous pour réactiver votre compte."
    : "Votre compte est inactif. Souscrivez à un abonnement pour continuer.";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold mb-2">Compte suspendu</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/50 text-left space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Ce qui est désactivé :</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Scanner de cartes de fidélité</li>
            <li>• Ajout de nouveaux clients</li>
            <li>• Envoi de campagnes</li>
            <li>• Personnalisation des cartes</li>
          </ul>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2 w-full">
          <CreditCard className="w-4 h-4" /> Gérer mon abonnement
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Vos données sont conservées et seront restaurées dès la réactivation.
        </p>
      </div>
    </div>
  );
}
