import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Star, Crown, Flame, Trash2, Copy, Mail, Phone, Calendar, Award, Download, Send, Filter } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const levelIcons = { bronze: Star, silver: Crown, gold: Crown };
const levelColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  silver: "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
};

type LevelFilter = "all" | "bronze" | "silver" | "gold";

const ClientsPage = () => {
  const { user, business } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clientHistory, setClientHistory] = useState<Record<string, any[]>>({});

  const fetchCustomers = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("customers").select("*, customer_cards(*)").eq("business_id", business.id).order("created_at", { ascending: false });
    if (data) setCustomers(data);
  };

  const fetchHistory = async (customerId: string) => {
    if (clientHistory[customerId]) return;
    const { data } = await supabase
      .from("points_history").select("*").eq("customer_id", customerId).eq("business_id", business!.id).order("created_at", { ascending: false }).limit(20);
    if (data) setClientHistory(prev => ({ ...prev, [customerId]: data }));
  };

  useEffect(() => { fetchCustomers(); }, [business]);

  const handleAddCustomer = async () => {
    if (!newName.trim() || !business) { toast.error("Le nom est requis"); return; }
    const { data: customer, error } = await supabase
      .from("customers").insert({ business_id: business.id, full_name: newName.trim(), email: newEmail.trim() || null, phone: newPhone.trim() || null }).select().single();
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    await supabase.from("customer_cards").insert({ customer_id: customer.id, business_id: business.id, max_points: business.max_points_per_card || 10 });
    toast.success("Client ajouté !");
    setAddOpen(false);
    setNewName(""); setNewEmail(""); setNewPhone("");
    fetchCustomers();
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!business) return;
    setDeleting(customerId);
    await supabase.from("customer_cards").update({ is_active: false, wallet_change_message: "❌ Cette carte n'est plus valide." }).eq("customer_id", customerId).eq("business_id", business.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/wallet-push`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: business.id, customer_id: customerId, action_type: "card_deactivated", change_message: "❌ Cette carte n'est plus valide." }) });
    } catch { /* non-blocking */ }
    const { error } = await supabase.from("customers").delete().eq("id", customerId).eq("business_id", business.id);
    if (error) toast.error("Erreur lors de la suppression");
    else { toast.success(`${customerName} supprimé`); fetchCustomers(); }
    setDeleting(null);
  };

  const exportCSV = () => {
    const rows = [["Nom", "Email", "Téléphone", "Niveau", "Points", "Visites", "Streak", "Dernière visite", "Date inscription"]];
    filtered.forEach(c => {
      rows.push([
        c.full_name || "", c.email || "", c.phone || "", c.level || "bronze",
        String(c.total_points || 0), String(c.total_visits || 0), String(c.current_streak || 0),
        c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString("fr-FR") : "",
        new Date(c.created_at).toLocaleDateString("fr-FR"),
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clients-${business?.name || "export"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export CSV téléchargé");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };

  const hasStreakData = customers.some(c => (c.current_streak || 0) > 0);

  const filtered = customers.filter((c) => {
    const matchSearch = c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || c.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <DashboardLayout
      title="Clients"
      subtitle={`${customers.length} client(s) enregistré(s)`}
      headerAction={
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} variant="outline" className="rounded-xl gap-2 text-xs">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2"><Label>Nom complet *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont" className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jean@email.com" className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Téléphone</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="rounded-xl" /></div>
                <Button onClick={handleAddCustomer} className="w-full bg-gradient-primary text-primary-foreground rounded-xl">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client..." className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "bronze", "silver", "gold"] as LevelFilter[]).map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${levelFilter === level ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
            >
              {level === "all" ? "Tous" : level === "bronze" ? "🥉 Bronze" : level === "silver" ? "🥈 Silver" : "⭐ Gold"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <span className="text-sm font-medium">{selectedIds.size} sélectionné(s)</span>
          <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs">
            <Link to="/dashboard/campaigns">
              <Send className="w-3.5 h-3.5" /> Envoyer une notification
            </Link>
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Visites</TableHead>
              {hasStreakData && <TableHead className="hidden sm:table-cell">Streak</TableHead>}
              <TableHead className="hidden sm:table-cell">Dernière visite</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer, i) => {
              const LevelIcon = levelIcons[customer.level as keyof typeof levelIcons] || Star;
              return (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => { setSelected(customer); fetchHistory(customer.id); }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(customer.id)}
                      onCheckedChange={() => toggleSelect(customer.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{customer.full_name || "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground">{customer.email || customer.phone || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={`gap-1 text-[11px] ${levelColors[customer.level] || ""}`}>
                      <LevelIcon className="w-3 h-3" />
                      {customer.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-sm">{customer.total_points}</TableCell>
                  <TableCell className="text-sm">{customer.total_visits}</TableCell>
                  {hasStreakData && (
                    <TableCell className="hidden sm:table-cell">
                      {customer.current_streak > 0 ? (
                        <span className="flex items-center gap-1 text-accent text-sm"><Flame className="w-3 h-3" /> {customer.current_streak}</span>
                      ) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString("fr-FR") : "Jamais"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={deleting === customer.id}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer {customer.full_name} ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. La carte sera <strong>désactivée définitivement</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id, customer.full_name || "Client")} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={hasStreakData ? 8 : 7} className="text-center py-12 text-muted-foreground">Aucun client trouvé</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (() => {
            const card = selected.customer_cards?.[0];
            const history = clientHistory[selected.id] || [];
            const copyField = (val: string, label: string) => { navigator.clipboard.writeText(val); toast.success(`${label} copié`); };
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-lg">{selected.full_name || "Client"}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-5">
                  <div className="space-y-3">
                    {selected.email && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-2 text-sm min-w-0"><Mail className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{selected.email}</span></div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyField(selected.email, "Email")}><Copy className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                    {selected.phone && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-2 text-sm min-w-0"><Phone className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{selected.phone}</span></div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyField(selected.phone, "Téléphone")}><Copy className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-secondary/50 text-center">
                      <p className="text-xl font-display font-bold">{selected.total_points || 0}</p>
                      <p className="text-[11px] text-muted-foreground">Points</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 text-center">
                      <p className="text-xl font-display font-bold">{selected.total_visits || 0}</p>
                      <p className="text-[11px] text-muted-foreground">Visites</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 text-center">
                      <p className="text-xl font-display font-bold flex items-center justify-center gap-1">{selected.current_streak || 0} <Flame className="w-4 h-4 text-accent" /></p>
                      <p className="text-[11px] text-muted-foreground">Streak</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 text-center">
                      <p className="text-xl font-display font-bold capitalize">{selected.level || "bronze"}</p>
                      <p className="text-[11px] text-muted-foreground">Niveau</p>
                    </div>
                  </div>

                  {card && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Carte de fidélité</p>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                        <div className="text-sm font-mono">{card.card_code || "—"}</div>
                        {card.card_code && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyField(card.card_code, "Code carte")}><Copy className="w-3.5 h-3.5" /></Button>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Award className="w-3 h-3" />
                        {card.current_points}/{card.max_points} points • {card.rewards_earned || 0} récompense(s)
                      </div>
                      <Badge variant={card.is_active ? "default" : "destructive"} className="text-[10px]">{card.is_active ? "Active" : "Désactivée"}</Badge>
                    </div>
                  )}

                  {/* History */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historique des passages</p>
                    <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                      {history.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Aucun passage enregistré</p>
                      ) : (
                        history.map((h: any) => (
                          <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <span className="font-medium">+{h.points_added} point{h.points_added > 1 ? "s" : ""}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {new Date(h.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="w-3 h-3" />Inscrit le {new Date(selected.created_at).toLocaleDateString("fr-FR")}</div>
                    {selected.last_visit_at && <div className="flex items-center gap-2"><Calendar className="w-3 h-3" />Dernière visite : {new Date(selected.last_visit_at).toLocaleDateString("fr-FR")}</div>}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"><Trash2 className="w-4 h-4" /> Supprimer ce client</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer {selected.full_name} ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { handleDeleteCustomer(selected.id, selected.full_name || "Client"); setSelected(null); }} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default ClientsPage;
