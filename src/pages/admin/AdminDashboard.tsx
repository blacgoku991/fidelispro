import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { adminSidebarItems } from "@/lib/sidebarItems";
import { Building2, Users, TrendingUp, Crown } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, role, logout } = useAuth();
  const [stats, setStats] = useState({ businesses: 0, customers: 0, scansToday: 0, revenue: 0 });
  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && role !== "super_admin") {
      navigate("/dashboard");
    }
  }, [loading, role, navigate]);

  useEffect(() => {
    if (role !== "super_admin") return;
    const fetchData = async () => {
      const { count: bizCount } = await supabase.from("businesses").select("*", { count: "exact", head: true });
      const { count: custCount } = await supabase.from("customers").select("*", { count: "exact", head: true });
      const today = new Date().toISOString().split("T")[0];
      const { count: scansCount } = await supabase.from("points_history").select("*", { count: "exact", head: true }).gte("created_at", today);

      setStats({
        businesses: bizCount || 0,
        customers: custCount || 0,
        scansToday: scansCount || 0,
        revenue: 0,
      });

      const { data: bizList } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (bizList) setBusinesses(bizList);
    };
    fetchData();
  }, [role]);

  if (loading || role !== "super_admin") {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const statCards = [
    { label: "Entreprises", value: stats.businesses, icon: Building2 },
    { label: "Clients totaux", value: stats.customers, icon: Users },
    { label: "Scans aujourd'hui", value: stats.scansToday, icon: TrendingUp },
    { label: "Revenus MRR", value: `${stats.revenue}€`, icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} />

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Super Admin 🛡️</h1>
          <p className="text-muted-foreground text-sm">Vue d'ensemble de la plateforme</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => <StatsCard key={s.label} {...s} index={i} />)}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-display font-semibold">Entreprises récentes</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créée le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((biz) => (
                <TableRow key={biz.id}>
                  <TableCell>
                    <p className="font-medium">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.category}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{biz.subscription_plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      biz.subscription_status === "active" ? "bg-emerald-100 text-emerald-800" :
                      biz.subscription_status === "trialing" ? "bg-blue-100 text-blue-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {biz.subscription_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(biz.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
