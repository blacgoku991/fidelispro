import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/badge";
import { adminSidebarItems } from "@/lib/sidebarItems";
import { Building2, Users, TrendingUp, Crown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, role, logout } = useAuth();
  const [stats, setStats] = useState({
    businesses: 0, customers: 0, scansToday: 0, scansWeek: 0,
    activeSubscriptions: 0, trialSubscriptions: 0, expiredSubscriptions: 0,
    totalCards: 0,
  });
  const [recentBusinesses, setRecentBusinesses] = useState<any[]>([]);
  const [topBusinesses, setTopBusinesses] = useState<any[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loading && role !== "super_admin") navigate("/dashboard");
  }, [loading, role, navigate]);

  useEffect(() => {
    if (role !== "super_admin") return;
    fetchAll();
  }, [role]);

  const fetchAll = async () => {
    const [bizRes, custRes, cardsRes, scansRes, bizListRes] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("customer_cards").select("*", { count: "exact", head: true }),
      supabase.from("points_history").select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().split("T")[0]),
      supabase.from("businesses").select("*").order("created_at", { ascending: false }),
    ]);

    const allBiz = bizListRes.data || [];

    // Plan breakdown
    const plans: Record<string, number> = {};
    let active = 0, trial = 0, expired = 0;
    allBiz.forEach((b: any) => {
      const plan = b.subscription_plan || "starter";
      plans[plan] = (plans[plan] || 0) + 1;
      if (b.subscription_status === "active") active++;
      else if (b.subscription_status === "trialing") trial++;
      else expired++;
    });

    setPlanBreakdown(plans);
    setRecentBusinesses(allBiz.slice(0, 10));

    // Fetch customer counts per business for top businesses
    const { data: custByBiz } = await supabase
      .from("customers")
      .select("business_id");
    
    const bizCounts: Record<string, number> = {};
    (custByBiz || []).forEach((c: any) => {
      bizCounts[c.business_id] = (bizCounts[c.business_id] || 0) + 1;
    });
    
    const top = allBiz
      .map((b: any) => ({ ...b, customerCount: bizCounts[b.id] || 0 }))
      .sort((a: any, b: any) => b.customerCount - a.customerCount)
      .slice(0, 5);
    setTopBusinesses(top);

    // Week scans
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: weekScans } = await supabase.from("points_history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    setStats({
      businesses: bizRes.count || 0,
      customers: custRes.count || 0,
      scansToday: scansRes.count || 0,
      scansWeek: weekScans || 0,
      activeSubscriptions: active,
      trialSubscriptions: trial,
      expiredSubscriptions: expired,
      totalCards: cardsRes.count || 0,
    });
  };

  if (loading || role !== "super_admin") {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const statCards = [
    { label: "Entreprises", value: stats.businesses, icon: Building2 },
    { label: "Clients totaux", value: stats.customers, icon: Users },
    { label: "Scans aujourd'hui", value: stats.scansToday, icon: TrendingUp },
    { label: "Cartes actives", value: stats.totalCards, icon: Crown },
  ];

  const mrrEstimate = (planBreakdown["starter"] || 0) * 29 + (planBreakdown["pro"] || 0) * 79 + (planBreakdown["enterprise"] || 0) * 199;

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
        <MobileHeader onLogout={logout} items={adminSidebarItems} />

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Super Admin 🛡️</h1>
          <p className="text-muted-foreground text-sm">Vue d'ensemble de la plateforme</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => <StatsCard key={s.label} {...s} index={i} />)}
        </div>

        {/* Revenue & Subscriptions Row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* MRR Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">MRR estimé</p>
            <p className="text-3xl font-display font-bold">{mrrEstimate}€</p>
            <p className="text-xs text-muted-foreground mt-2">
              Basé sur {stats.businesses} entreprise(s) active(s)
            </p>
          </motion.div>

          {/* Subscription breakdown */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Abonnements</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Actifs</span>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{stats.activeSubscriptions}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Essai</span>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{stats.trialSubscriptions}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Expirés/Annulés</span>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{stats.expiredSubscriptions}</Badge>
              </div>
            </div>
          </motion.div>

          {/* Plans breakdown */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Plans</p>
            <div className="space-y-2">
              {Object.entries(planBreakdown).map(([plan, count]) => (
                <div key={plan} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{plan}</span>
                  <span className="font-display font-bold">{count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Top businesses & Recent */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top businesses by clients */}
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/40">
              <h2 className="font-display font-semibold text-sm">🏆 Top entreprises</h2>
            </div>
            <div className="divide-y divide-border/30">
              {topBusinesses.map((biz, i) => (
                <div key={biz.id} className="flex items-center gap-3 p-4 hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/businesses/${biz.id}`)}>
                  <span className="text-lg font-bold text-muted-foreground/50 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-sm">{biz.customerCount}</p>
                    <p className="text-[10px] text-muted-foreground">clients</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent businesses */}
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/40">
              <h2 className="font-display font-semibold text-sm">📋 Entreprises récentes</h2>
            </div>
            <div className="divide-y divide-border/30">
              {recentBusinesses.map((biz) => (
                <div key={biz.id} className="flex items-center gap-3 p-4 hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/businesses/${biz.id}`)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.city || "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{biz.subscription_plan}</Badge>
                  <Badge className={
                    biz.subscription_status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]" :
                    biz.subscription_status === "trialing" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]" :
                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]"
                  }>
                    {biz.subscription_status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity info */}
        <div className="mt-8 rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Activité cette semaine</p>
          <p className="text-3xl font-display font-bold">{stats.scansWeek} scans</p>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
