import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { adminSidebarItems } from "@/lib/sidebarItems";
import { ArrowLeft, Users, QrCode, Gift, Crown, MapPin, Smartphone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AdminBusinessDetail = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { loading, role, logout } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState({ customers: 0, cards: 0, scans: 0, rewards: 0, walletInstalls: 0 });

  useEffect(() => {
    if (!loading && role !== "super_admin") navigate("/dashboard");
  }, [loading, role, navigate]);

  useEffect(() => {
    if (role !== "super_admin" || !businessId) return;
    fetchData();
  }, [role, businessId]);

  const fetchData = async () => {
    if (!businessId) return;
    
    const [bizRes, custRes, cardsRes, scansRes, walletRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
      supabase.from("customers").select("*, customer_cards(*)").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("customer_cards").select("*", { count: "exact", head: true }).eq("business_id", businessId),
      supabase.from("points_history").select("*", { count: "exact", head: true }).eq("business_id", businessId),
      supabase.from("wallet_registrations").select("*", { count: "exact", head: true }).eq("business_id", businessId),
    ]);

    if (bizRes.data) setBusiness(bizRes.data);
    if (custRes.data) setCustomers(custRes.data);

    const rewardCount = (custRes.data || []).reduce((sum: number, c: any) => {
      return sum + (c.customer_cards || []).reduce((s: number, cc: any) => s + (cc.rewards_earned || 0), 0);
    }, 0);

    setStats({
      customers: custRes.data?.length || 0,
      cards: cardsRes.count || 0,
      scans: scansRes.count || 0,
      rewards: rewardCount,
      walletInstalls: walletRes.count || 0,
    });
  };

  const updatePlan = async (plan: string) => {
    if (!businessId) return;
    await supabase.from("businesses").update({ subscription_plan: plan as any }).eq("id", businessId);
    toast.success("Plan mis à jour");
    fetchData();
  };

  const updateStatus = async (status: string) => {
    if (!businessId) return;
    await supabase.from("businesses").update({ subscription_status: status as any }).eq("id", businessId);
    toast.success("Statut mis à jour");
    fetchData();
  };

  if (loading || role !== "super_admin" || !business) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const statCards = [
    { icon: Users, label: "Clients", value: stats.customers },
    { icon: QrCode, label: "Scans total", value: stats.scans },
    { icon: Gift, label: "Récompenses", value: stats.rewards },
    { icon: Smartphone, label: "Wallet installs", value: stats.walletInstalls },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
        <MobileHeader onLogout={logout} items={adminSidebarItems} />

        <Button variant="ghost" className="mb-4 gap-2 text-sm" onClick={() => navigate("/admin/businesses")}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          {business.logo_url ? (
            <img src={business.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {business.name?.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{business.name}</h1>
            <p className="text-muted-foreground text-sm">{business.category} • {business.city || "—"}</p>
            <div className="flex gap-2 mt-2">
              <Badge className={
                business.subscription_status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                business.subscription_status === "trialing" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }>{business.subscription_status}</Badge>
              <Badge variant="outline">{business.subscription_plan}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={business.subscription_plan} onValueChange={updatePlan}>
              <SelectTrigger className="w-28 rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={business.subscription_status} onValueChange={updateStatus}>
              <SelectTrigger className="w-28 rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="trialing">Essai</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
                <SelectItem value="past_due">Impayé</SelectItem>
                <SelectItem value="canceled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-card border border-border/40 p-5 shadow-sm">
                <Icon className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Business info */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-3">
            <h3 className="font-display font-semibold text-sm mb-3">Informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Adresse</span><span>{business.address || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{business.phone || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Site web</span><span>{business.website || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type fidélité</span><span className="capitalize">{business.loyalty_type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Max points</span><span>{business.max_points_per_card}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Créé le</span><span>{new Date(business.created_at).toLocaleDateString("fr-FR")}</span></div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-3">
            <h3 className="font-display font-semibold text-sm mb-3">Features activées</h3>
            <div className="flex flex-wrap gap-2">
              {business.feature_wallet && <Badge>Wallet</Badge>}
              {business.feature_analytics && <Badge>Analytics</Badge>}
              {business.feature_notifications && <Badge>Notifications</Badge>}
              {business.feature_gamification && <Badge>Gamification</Badge>}
              {business.feature_customer_scoring && <Badge>Scoring</Badge>}
              {business.feature_special_events && <Badge>Événements</Badge>}
              {business.geofence_enabled && <Badge><MapPin className="w-3 h-3 mr-1" /> Géofencing ({business.geofence_radius}m)</Badge>}
            </div>
            {business.trial_ends_at && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fin d'essai :</span>
                <span className="font-medium">{new Date(business.trial_ends_at).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Customers table */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/40">
            <h3 className="font-display font-semibold text-sm">Clients ({customers.length})</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Visites</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead>Dernière visite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.slice(0, 50).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{c.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{c.email || c.phone || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">{c.level}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{c.total_points || 0}</TableCell>
                  <TableCell>{c.total_visits || 0}</TableCell>
                  <TableCell>{c.current_streak || 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString("fr-FR") : "—"}
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

export default AdminBusinessDetail;
