import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, Crown, CreditCard, Download, BarChart3, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Area, AreaChart } from "recharts";
import { STRIPE_PLANS } from "@/lib/stripePlans";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    businesses: 0, customers: 0, scansToday: 0, scansWeek: 0, scansMonth: 0,
    activeSubscriptions: 0, expiredSubscriptions: 0,
    totalCards: 0, walletInstalls: 0, newBizThisMonth: 0,
  });
  const [recentBusinesses, setRecentBusinesses] = useState<any[]>([]);
  const [topBusinesses, setTopBusinesses] = useState<any[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<Record<string, number>>({});
  const [scansTrend, setScansTrend] = useState<any[]>([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [bizRes, custRes, cardsRes, scansRes, bizListRes, walletRes] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("customer_cards").select("*", { count: "exact", head: true }),
      supabase.from("points_history").select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().split("T")[0]),
      supabase.from("businesses").select("*").order("created_at", { ascending: false }),
      supabase.from("wallet_registrations").select("*", { count: "exact", head: true }),
    ]);

    const allBiz = bizListRes.data || [];
    const plans: Record<string, number> = {};
    let active = 0, expired = 0;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    let newBizThisMonth = 0;

    allBiz.forEach((b: any) => {
      const plan = b.subscription_plan || "starter";
      plans[plan] = (plans[plan] || 0) + 1;
      if (b.subscription_status === "active") active++;
      else expired++;
      if (new Date(b.created_at) >= monthStart) newBizThisMonth++;
    });

    setPlanBreakdown(plans);
    setRecentBusinesses(allBiz.slice(0, 8));

    // 12-month growth data
    const monthlyData: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      const count = allBiz.filter((b: any) => {
        const bd = new Date(b.created_at);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
      }).length;
      monthlyData.push({ date: label, inscriptions: count });
    }
    setMonthlyGrowth(monthlyData);

    // Scans trend (last 7 days)
    const scansArr: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const { count } = await supabase.from("points_history")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dayStr)
        .lt("created_at", new Date(d.getTime() + 86400000).toISOString().split("T")[0]);
      scansArr.push({
        date: d.toLocaleDateString("fr-FR", { weekday: "short" }),
        scans: count || 0,
      });
    }
    setScansTrend(scansArr);

    // Customer counts per business
    const { data: custByBiz } = await supabase.from("customers").select("business_id");
    const bizCounts: Record<string, number> = {};
    (custByBiz || []).forEach((c: any) => { bizCounts[c.business_id] = (bizCounts[c.business_id] || 0) + 1; });
    const top = allBiz.map((b: any) => ({ ...b, customerCount: bizCounts[b.id] || 0 }))
      .sort((a: any, b: any) => b.customerCount - a.customerCount).slice(0, 5);
    setTopBusinesses(top);

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: weekScans } = await supabase.from("points_history")
      .select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString());

    const { count: monthScans } = await supabase.from("points_history")
      .select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString());

    setStats({
      businesses: bizRes.count || 0, customers: custRes.count || 0,
      scansToday: scansRes.count || 0, scansWeek: weekScans || 0, scansMonth: monthScans || 0,
      activeSubscriptions: active, expiredSubscriptions: expired,
      totalCards: cardsRes.count || 0, walletInstalls: walletRes.count || 0,
      newBizThisMonth,
    });
  };

  const exportExcel = async () => {
    const { data: biz } = await supabase.from("businesses").select("*");
    if (!biz) return;
    const headers = ["Nom", "Catégorie", "Ville", "Plan", "Statut", "Créé le"];
    const rows = biz.map((b: any) => [
      b.name, b.category, b.city || "", b.subscription_plan, b.subscription_status,
      new Date(b.created_at).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fidelispro_entreprises_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const mrrEstimate = (planBreakdown["starter"] || 0) * STRIPE_PLANS.starter.price
    + (planBreakdown["pro"] || 0) * STRIPE_PLANS.pro.price
    + (planBreakdown["enterprise"] || 0) * STRIPE_PLANS.enterprise.price;

  const pieData = Object.entries(planBreakdown).map(([plan, count]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1), value: count,
  }));

  const statCards = [
    { label: "Entreprises", value: stats.businesses, icon: Building2 },
    { label: "Clients totaux", value: stats.customers, icon: Users },
    { label: "Scans ce mois", value: stats.scansMonth, icon: TrendingUp },
    { label: "Cartes actives", value: stats.totalCards, icon: Crown },
  ];

  return (
    <AdminLayout title="Super Admin 🛡️" subtitle="Vue d'ensemble de la plateforme"
      headerAction={
        <Button variant="outline" className="rounded-xl gap-2 text-xs" onClick={exportExcel}>
          <Download className="w-4 h-4" /> Exporter CSV
        </Button>
      }>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => <StatsCard key={s.label} {...s} index={i} />)}
      </div>

      {/* Revenue & Subscriptions Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">MRR estimé</p>
          <p className="text-3xl font-display font-bold">{mrrEstimate.toLocaleString("fr-FR")}€</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
              {stats.activeSubscriptions} actifs
            </Badge>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Ce mois-ci</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Nouveaux marchands</span>
              <Badge className="bg-primary/10 text-primary">{stats.newBizThisMonth}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Scans plateforme</span>
              <Badge variant="outline">{stats.scansMonth}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Wallet installs</span>
              <Badge variant="outline">{stats.walletInstalls}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Expirés / Annulés</span>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]">{stats.expiredSubscriptions}</Badge>
            </div>
          </div>
        </motion.div>

        {/* Plans pie chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Répartition plans</p>
          {pieData.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={55} innerRadius={30} strokeWidth={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune donnée</p>
          )}
          <div className="flex gap-3 mt-2 justify-center flex-wrap">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Scans Trend */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scans — 7 derniers jours</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scansTrend}>
                <defs>
                  <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Area type="monotone" dataKey="scans" stroke="hsl(var(--primary))" fill="url(#scanGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 12-month Growth */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Croissance marchands — 12 mois</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Bar dataKey="inscriptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Top businesses & Recent */}
      <div className="grid lg:grid-cols-2 gap-6">
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
                  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]"
                }>{biz.subscription_status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
