import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminSidebarItems } from "@/lib/sidebarItems";
import { toast } from "sonner";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { loading, role, logout } = useAuth();

  useEffect(() => {
    if (!loading && role !== "super_admin") navigate("/dashboard");
  }, [loading, role, navigate]);

  if (loading || role !== "super_admin") {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
        <MobileHeader onLogout={logout} items={adminSidebarItems} />

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Configuration</h1>
          <p className="text-muted-foreground text-sm">Paramètres globaux de la plateforme</p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Plans & Pricing */}
          <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
            <h3 className="font-display font-semibold">Plans & Tarifs</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-sm">Starter</p>
                  <p className="text-xs text-muted-foreground">Fonctionnalités de base</p>
                </div>
                <p className="font-display font-bold">29€/mois</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-sm">Pro</p>
                  <p className="text-xs text-muted-foreground">Analytics, Notifications, Wallet</p>
                </div>
                <p className="font-display font-bold">79€/mois</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-sm">Enterprise</p>
                  <p className="text-xs text-muted-foreground">Toutes les features</p>
                </div>
                <p className="font-display font-bold">199€/mois</p>
              </div>
            </div>
          </div>

          {/* Trial settings */}
          <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
            <h3 className="font-display font-semibold">Période d'essai</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Durée par défaut</p>
                <p className="text-xs text-muted-foreground">Appliqué aux nouvelles inscriptions</p>
              </div>
              <p className="font-display font-bold">14 jours</p>
            </div>
          </div>

          {/* Platform info */}
          <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
            <h3 className="font-display font-semibold">Informations plateforme</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>1.0.0</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pass Type ID</span><span className="font-mono text-xs">pass.app.lovable.fidelispro</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Apple Team ID</span><span className="font-mono text-xs">9642GYNCU9</span></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
