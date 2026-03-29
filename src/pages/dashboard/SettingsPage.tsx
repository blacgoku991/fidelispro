import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, CreditCard, Users, QrCode, Bell, Settings, Palette,
  Shield, Crown,
} from "lucide-react";
import { toast } from "sonner";

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "Cartes", path: "/dashboard/cards" },
  { icon: Users, label: "Clients", path: "/dashboard/clients" },
  { icon: QrCode, label: "Scanner", path: "/dashboard/scanner" },
  { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
  { icon: Palette, label: "Personnalisation", path: "/dashboard/customize" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

const planLabels: Record<string, string> = {
  starter: "Starter — 29€/mois",
  pro: "Pro — 79€/mois",
  enterprise: "Enterprise — Sur devis",
};

const SettingsPage = () => {
  const { user, loading, business, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (user) setEmail(user.email || "");
  }, [user]);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour");
      setNewPassword("");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={sidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} />

        <h1 className="text-2xl font-display font-bold mb-2">Paramètres</h1>
        <p className="text-muted-foreground text-sm mb-8">Gérez votre compte et votre abonnement</p>

        <div className="space-y-6 max-w-2xl">
          <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Compte
            </h2>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="rounded-xl bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 caractères" className="rounded-xl" />
            </div>
            <Button onClick={handleUpdatePassword} className="rounded-xl">Mettre à jour le mot de passe</Button>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" /> Abonnement
            </h2>
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/10 text-primary">{business?.subscription_plan || "starter"}</Badge>
              <Badge variant="outline">{business?.subscription_status || "trialing"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {planLabels[business?.subscription_plan || "starter"]}
            </p>
            {business?.trial_ends_at && (
              <p className="text-xs text-muted-foreground">
                Essai gratuit jusqu'au {new Date(business.trial_ends_at).toLocaleDateString("fr-FR")}
              </p>
            )}
            <Button variant="outline" className="rounded-xl">
              Gérer l'abonnement
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
