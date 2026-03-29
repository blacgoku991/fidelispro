import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { adminSidebarItems } from "@/lib/sidebarItems";
import { Search, Eye, Ban, CheckCircle, Clock, Users, QrCode, Gift, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AdminBusinesses = () => {
  const navigate = useNavigate();
  const { loading, role, logout } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [bizStats, setBizStats] = useState<any>(null);

  useEffect(() => {
    if (!loading && role !== "super_admin") navigate("/dashboard");
  }, [loading, role, navigate]);

  useEffect(() => {
    if (role !== "super_admin") return;
    fetchBusinesses();
  }, [role]);

  const fetchBusinesses = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBusinesses(data);
  };

  const updatePlan = async (id: string, plan: string) => {
    await supabase.from("businesses").update({ subscription_plan: plan as any }).eq("id", id);
    toast.success("Plan mis à jour");
    fetchBusinesses();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("businesses").update({ subscription_status: status as any }).eq("id", id);
    toast.success("Statut mis à jour");
    fetchBusinesses();
  };

  const extendTrial = async (id: string, days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    await supabase.from("businesses").update({
      trial_ends_at: newDate.toISOString(),
      subscription_status: "trialing" as any,
    }).eq("id", id);
    toast.success(`Essai prolongé de ${days} jours`);
    fetchBusinesses();
  };

  const viewBizDetails = async (biz: any) => {
    setSelectedBiz(biz);
    const [custRes, cardsRes, scansRes] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
      supabase.from("customer_cards").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
      supabase.from("points_history").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
    ]);
    setBizStats({
      customers: custRes.count || 0,
      cards: cardsRes.count || 0,
      totalScans: scansRes.count || 0,
    });
  };

  const filtered = businesses.filter((b) => {
    const matchSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase()) || b.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.subscription_status === statusFilter;
    const matchPlan = planFilter === "all" || b.subscription_plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

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

        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">Gestion des entreprises</h1>
          <p className="text-muted-foreground text-sm">{businesses.length} entreprise(s) • {filtered.length} affichée(s)</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-10 rounded-xl" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="trialing">Essai</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
              <SelectItem value="past_due">Impayé</SelectItem>
              <SelectItem value="canceled">Annulé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les plans</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Essai</TableHead>
                <TableHead>Géofencing</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((biz) => {
                const trialDaysLeft = biz.trial_ends_at ? Math.max(0, Math.ceil((new Date(biz.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;
                return (
                  <TableRow key={biz.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {biz.logo_url ? (
                          <img src={biz.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {biz.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{biz.name}</p>
                          <p className="text-xs text-muted-foreground">{biz.city || "—"} • {biz.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={biz.subscription_plan} onValueChange={(v) => updatePlan(biz.id, v)}>
                        <SelectTrigger className="w-28 rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={biz.subscription_status} onValueChange={(v) => updateStatus(biz.id, v)}>
                        <SelectTrigger className="w-28 rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="trialing">Essai</SelectItem>
                          <SelectItem value="inactive">Inactif</SelectItem>
                          <SelectItem value="past_due">Impayé</SelectItem>
                          <SelectItem value="canceled">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {biz.subscription_status === "trialing" ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> {trialDaysLeft}j
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                            onClick={() => extendTrial(biz.id, 7)}>+7j</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                            onClick={() => extendTrial(biz.id, 30)}>+30j</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={biz.geofence_enabled ? "default" : "secondary"} className="text-[10px]">
                        {biz.geofence_enabled ? `${biz.geofence_radius}m` : "Non"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(biz.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewBizDetails(biz)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => window.open(`/b/${biz.id}`, "_blank")}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Business Detail Dialog */}
        <Dialog open={!!selectedBiz} onOpenChange={() => { setSelectedBiz(null); setBizStats(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedBiz?.logo_url ? (
                  <img src={selectedBiz.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selectedBiz?.name?.charAt(0)}
                  </div>
                )}
                {selectedBiz?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedBiz && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-secondary/50 text-center">
                    <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="font-bold text-lg">{bizStats?.customers ?? "..."}</p>
                    <p className="text-[10px] text-muted-foreground">Clients</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 text-center">
                    <QrCode className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="font-bold text-lg">{bizStats?.cards ?? "..."}</p>
                    <p className="text-[10px] text-muted-foreground">Cartes</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 text-center">
                    <Gift className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="font-bold text-lg">{bizStats?.totalScans ?? "..."}</p>
                    <p className="text-[10px] text-muted-foreground">Scans total</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Catégorie</span><span>{selectedBiz.category}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ville</span><span>{selectedBiz.city || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{selectedBiz.phone || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type fidélité</span><span className="capitalize">{selectedBiz.loyalty_type}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Max points/carte</span><span>{selectedBiz.max_points_per_card}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Géofencing</span>
                    <Badge variant={selectedBiz.geofence_enabled ? "default" : "secondary"}>
                      {selectedBiz.geofence_enabled ? `Oui (${selectedBiz.geofence_radius}m)` : "Non"}
                    </Badge>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Wallet</span>
                    <Badge variant={selectedBiz.feature_wallet ? "default" : "secondary"}>
                      {selectedBiz.feature_wallet ? "Activé" : "Non"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => { setSelectedBiz(null); navigate(`/admin/businesses/${selectedBiz.id}`); }}>
                    Voir en détail
                  </Button>
                  {selectedBiz.subscription_status !== "active" ? (
                    <Button className="flex-1 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => { updateStatus(selectedBiz.id, "active"); setSelectedBiz(null); }}>
                      <CheckCircle className="w-3 h-3" /> Réactiver
                    </Button>
                  ) : (
                    <Button variant="destructive" className="flex-1 rounded-xl text-xs gap-1"
                      onClick={() => { updateStatus(selectedBiz.id, "inactive"); setSelectedBiz(null); }}>
                      <Ban className="w-3 h-3" /> Suspendre
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminBusinesses;
