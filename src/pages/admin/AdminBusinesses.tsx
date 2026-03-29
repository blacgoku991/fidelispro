import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { Search, Eye, Ban, CheckCircle, Clock, Users, QrCode, Gift, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

const AdminBusinesses = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [bizStats, setBizStats] = useState<any>(null);

  useEffect(() => { fetchBusinesses(); }, []);

  const fetchBusinesses = async () => {
    const { data } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
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
    const newDate = new Date(); newDate.setDate(newDate.getDate() + days);
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
    setBizStats({ customers: custRes.count || 0, cards: cardsRes.count || 0, totalScans: scansRes.count || 0 });
  };

  const exportCSV = () => {
    const headers = ["Nom", "Catégorie", "Ville", "Plan", "Statut", "Géofencing", "Créé le"];
    const rows = filtered.map((b) => [
      b.name, b.category, b.city || "", b.subscription_plan, b.subscription_status,
      b.geofence_enabled ? "Oui" : "Non", new Date(b.created_at).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `entreprises_${new Date().toISOString().split("T")[0]}.csv`; link.click();
  };

  const filtered = businesses.filter((b) => {
    const matchSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase()) || b.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.subscription_status === statusFilter;
    const matchPlan = planFilter === "all" || b.subscription_plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  return (
    <AdminLayout title="Gestion des entreprises"
      subtitle={`${businesses.length} entreprise(s) • ${filtered.length} affichée(s)`}
      headerAction={
        <Button variant="outline" className="rounded-xl gap-2 text-xs" onClick={exportCSV}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      }>

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
              <TableHead>Stripe</TableHead>
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
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => extendTrial(biz.id, 7)}>+7j</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => extendTrial(biz.id, 30)}>+30j</Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {biz.stripe_subscription_id ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">Lié</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Non lié</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(biz.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewBizDetails(biz)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/admin/businesses/${biz.id}`)}>
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

      {/* Quick view Dialog */}
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
                  <p className="text-[10px] text-muted-foreground">Scans</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl text-xs"
                  onClick={() => { setSelectedBiz(null); navigate(`/admin/businesses/${selectedBiz.id}`); }}>
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
    </AdminLayout>
  );
};

export default AdminBusinesses;
