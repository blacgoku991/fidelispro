import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { businessSidebarItems } from "@/lib/sidebarItems";
import {
  Users, TrendingUp, QrCode,
  Crown, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, loading, business, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ clients: 0, returnRate: 0, scansToday: 0, rewardsGiven: 0 });

  useEffect(() => {
    if (!business) return;
    const fetchStats = async () => {
      const { count: clientCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id);

      const { count: rewardCount } = await supabase
        .from("customer_cards")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .gt("rewards_earned", 0);

      const today = new Date().toISOString().split("T")[0];
      const { count: scansCount } = await supabase
        .from("points_history")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .gte("created_at", today);

      setStats({
        clients: clientCount || 0,
        returnRate: clientCount ? Math.min(Math.round(((rewardCount || 0) / clientCount) * 100), 100) : 0,
        scansToday: scansCount || 0,
        rewardsGiven: rewardCount || 0,
      });
    };
    fetchStats();
  }, [business]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const businessName = business?.name || user?.user_metadata?.business_name || "Mon Commerce";

  const statCards = [
    { label: "Clients actifs", value: stats.clients, icon: Users, change: "+0%" },
    { label: "Taux de retour", value: `${stats.returnRate}%`, icon: TrendingUp, change: "+0%" },
    { label: "Scans aujourd'hui", value: stats.scansToday, icon: QrCode, change: "+0%" },
    { label: "Récompenses données", value: stats.rewardsGiven, icon: Crown, change: "+0%" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={businessSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} items={businessSidebarItems} />

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">
            Bonjour, {businessName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Voici un aperçu de votre activité
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <StatsCard key={stat.label} {...stat} index={i} />
          ))}
        </div>

        {/* Analytics charts */}
        {business && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h2 className="text-lg font-display font-semibold mb-4">Scans (14 jours)</h2>
              <AnalyticsChart businessId={business.id} type="scans" />
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h2 className="text-lg font-display font-semibold mb-4">Nouveaux clients (14 jours)</h2>
              <AnalyticsChart businessId={business.id} type="customers" />
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h2 className="text-lg font-display font-semibold mb-4">Votre carte de fidélité</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Personnalisez et partagez votre carte avec vos clients.
            </p>
            <div className="flex justify-center">
              <LoyaltyCard
                businessName={businessName}
                customerName="Aperçu client"
                points={5}
                maxPoints={business?.max_points_per_card || 10}
                level="gold"
                cardId={`business-${user?.id?.slice(0, 8) || "demo"}`}
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent" />
              Actions rapides
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => navigate("/dashboard/scanner")} className="h-20 rounded-2xl bg-gradient-primary text-primary-foreground flex flex-col gap-1">
                <QrCode className="w-6 h-6" />
                <span className="text-sm">Scanner</span>
              </Button>
              <Button onClick={() => navigate("/dashboard/qrcode")} variant="outline" className="h-20 rounded-2xl flex flex-col gap-1">
                <QrCode className="w-6 h-6" />
                <span className="text-sm">QR Vitrine</span>
              </Button>
              <Button onClick={() => navigate("/dashboard/campaigns")} variant="outline" className="h-20 rounded-2xl flex flex-col gap-1">
                <Crown className="w-6 h-6" />
                <span className="text-sm">Campagne</span>
              </Button>
              <Button onClick={() => navigate("/dashboard/clients")} variant="outline" className="h-20 rounded-2xl flex flex-col gap-1">
                <Users className="w-6 h-6" />
                <span className="text-sm">Clients</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
