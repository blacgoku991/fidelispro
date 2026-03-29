import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import {
  Users, TrendingUp, QrCode, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user, business } = useAuth();
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

  const businessName = business?.name || user?.user_metadata?.business_name || "Mon Commerce";

  const statCards = [
    { label: "Clients actifs", value: stats.clients, icon: Users, color: "from-primary/10 to-primary/5 text-primary" },
    { label: "Taux de retour", value: `${stats.returnRate}%`, icon: TrendingUp, color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600" },
    { label: "Scans aujourd'hui", value: stats.scansToday, icon: QrCode, color: "from-accent/10 to-accent/5 text-accent" },
    { label: "Récompenses", value: stats.rewardsGiven, icon: Crown, color: "from-amber-500/10 to-amber-500/5 text-amber-600" },
  ];

  const quickActions = [
    { label: "Scanner", icon: QrCode, path: "/dashboard/scanner", primary: true },
    { label: "Clients", icon: Users, path: "/dashboard/clients" },
    { label: "Campagne", icon: Crown, path: "/dashboard/campaigns" },
  ];

  return (
    <DashboardLayout
      title={`Bonjour, ${businessName} 👋`}
      subtitle="Voici un aperçu de votre activité"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-4 rounded-2xl bg-card border border-border/50"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-display font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {quickActions.map((action) => (
          <Button
            key={action.path}
            onClick={() => navigate(action.path)}
            variant={action.primary ? "default" : "outline"}
            className={`rounded-xl gap-2 shrink-0 ${action.primary ? "bg-gradient-primary text-primary-foreground" : ""}`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Charts */}
      {business && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Scans — 14 derniers jours</h2>
            <AnalyticsChart businessId={business.id} type="scans" />
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Nouveaux clients — 14 derniers jours</h2>
            <AnalyticsChart businessId={business.id} type="customers" />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
