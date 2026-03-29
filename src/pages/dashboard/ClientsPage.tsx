import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { businessSidebarItems } from "@/lib/sidebarItems";
import {
  Plus, Search, Star, Crown, Flame,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const levelIcons = { bronze: Star, silver: Crown, gold: Crown };
const levelColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-100 text-slate-700",
  gold: "bg-yellow-100 text-yellow-800",
};

const ClientsPage = () => {
  const { user, loading, business, logout } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const fetchCustomers = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("customers")
      .select("*, customer_cards(*)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    if (data) setCustomers(data);
  };

  useEffect(() => {
    fetchCustomers();
  }, [business]);

  const handleAddCustomer = async () => {
    if (!newName.trim() || !business) {
      toast.error("Le nom est requis");
      return;
    }
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({ business_id: business.id, full_name: newName.trim(), email: newEmail.trim() || null, phone: newPhone.trim() || null })
      .select()
      .single();
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    
    // Auto-create card
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

  const filtered = customers.filter((c) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={businessSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Clients</h1>
            <p className="text-sm text-muted-foreground">{customers.length} client(s) enregistré(s)</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Ajouter un client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau client</DialogTitle>
              </DialogHeader>
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
                <Button onClick={handleAddCustomer} className="w-full bg-gradient-primary text-primary-foreground rounded-xl">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="pl-10 rounded-xl"
          />
        </div>

        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
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
              {filtered.map((customer, i) => {
                const LevelIcon = levelIcons[customer.level as keyof typeof levelIcons] || Star;
                return (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.full_name || "Sans nom"}</p>
                        <p className="text-xs text-muted-foreground">{customer.email || customer.phone || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${levelColors[customer.level] || ""}`}>
                        <LevelIcon className="w-3 h-3" />
                        {customer.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{customer.total_points}</TableCell>
                    <TableCell>{customer.total_visits}</TableCell>
                    <TableCell>
                      {customer.current_streak > 0 && (
                        <span className="flex items-center gap-1 text-accent">
                          <Flame className="w-3 h-3" /> {customer.current_streak}
                        </span>
                      )}
                      {customer.current_streak === 0 && "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.last_visit_at
                        ? new Date(customer.last_visit_at).toLocaleDateString("fr-FR")
                        : "Jamais"}
                    </TableCell>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Aucun client trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default ClientsPage;
