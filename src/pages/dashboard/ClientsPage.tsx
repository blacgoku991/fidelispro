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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Star, Crown, Flame, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const levelIcons = { bronze: Star, silver: Crown, gold: Crown };
const levelColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-100 text-slate-700",
  gold: "bg-yellow-100 text-yellow-800",
};

const ClientsPage = () => {
  const { user, business } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCustomers = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("customers")
      .select("*, customer_cards(*)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    if (data) setCustomers(data);
  };

  useEffect(() => { fetchCustomers(); }, [business]);

  const handleAddCustomer = async () => {
    if (!newName.trim() || !business) { toast.error("Le nom est requis"); return; }
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({ business_id: business.id, full_name: newName.trim(), email: newEmail.trim() || null, phone: newPhone.trim() || null })
      .select()
      .single();
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    await supabase.from("customer_cards").insert({
      customer_id: customer.id,
      business_id: business.id,
      max_points: business.max_points_per_card || 10,
    });
    toast.success("Client ajouté !");
    setAddOpen(false);
    setNewName(""); setNewEmail(""); setNewPhone("");
    fetchCustomers();
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!business) return;
    setDeleting(customerId);

    // 1. Deactivate all cards (so scanner rejects them)
    await supabase
      .from("customer_cards")
      .update({ is_active: false, wallet_change_message: "❌ Cette carte n'est plus valide." })
      .eq("customer_id", customerId)
      .eq("business_id", business.id);

    // 2. Try to push wallet update so the card shows as invalid on iPhone
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/wallet-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          customer_id: customerId,
          action_type: "card_deactivated",
          change_message: "❌ Cette carte n'est plus valide.",
        }),
      });
    } catch { /* non-blocking */ }

    // 3. Delete the customer (cascading FK will delete cards too)
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId)
      .eq("business_id", business.id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success(`${customerName} supprimé`, { description: "Sa carte de fidélité est désormais invalide." });
      fetchCustomers();
    }
    setDeleting(null);
  };

  const filtered = customers.filter((c) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Clients"
      subtitle={`${customers.length} client(s) enregistré(s)`}
      headerAction={
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jean@email.com" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="rounded-xl" />
              </div>
              <Button onClick={handleAddCustomer} className="w-full bg-gradient-primary text-primary-foreground rounded-xl">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client..." className="pl-10 rounded-xl" />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Visites</TableHead>
              <TableHead className="hidden sm:table-cell">Streak</TableHead>
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
                  className="border-b transition-colors hover:bg-muted/50"
                >
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
                  <TableCell className="hidden sm:table-cell">
                    {customer.current_streak > 0 ? (
                      <span className="flex items-center gap-1 text-accent text-sm">
                        <Flame className="w-3 h-3" /> {customer.current_streak}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString("fr-FR") : "Jamais"}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={deleting === customer.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer {customer.full_name} ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. La carte de fidélité sera <strong>désactivée définitivement</strong> — 
                            si le client la scanne, elle sera refusée. Son historique de points sera également supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCustomer(customer.id, customer.full_name || "Client")}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Aucun client trouvé</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default ClientsPage;
