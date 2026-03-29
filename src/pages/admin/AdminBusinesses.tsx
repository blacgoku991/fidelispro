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
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard, Building2, Users, Settings, Search,
} from "lucide-react";
import { toast } from "sonner";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Vue d'ensemble", path: "/admin" },
  { icon: Building2, label: "Entreprises", path: "/admin/businesses" },
  { icon: Users, label: "Utilisateurs", path: "/admin/users" },
  { icon: Settings, label: "Configuration", path: "/admin/settings" },
];

const AdminBusinesses = () => {
  const navigate = useNavigate();
  const { loading, role, logout } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState("");

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
    await supabase.from("businesses").update({ subscription_plan: plan }).eq("id", id);
    toast.success("Plan mis à jour");
    fetchBusinesses();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("businesses").update({ subscription_status: status }).eq("id", id);
    toast.success("Statut mis à jour");
    fetchBusinesses();
  };

  const filtered = businesses.filter((b) =>
    b.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || role !== "super_admin") {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={sidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} />

        <h1 className="text-2xl font-display font-bold mb-2">Gestion des entreprises</h1>
        <p className="text-muted-foreground text-sm mb-6">{businesses.length} entreprise(s)</p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-10 rounded-xl" />
        </div>

        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Géofencing</TableHead>
                <TableHead>Créée le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((biz) => (
                <TableRow key={biz.id}>
                  <TableCell>
                    <p className="font-medium">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.city || "—"}</p>
                  </TableCell>
                  <TableCell>{biz.category}</TableCell>
                  <TableCell>
                    <Select value={biz.subscription_plan} onValueChange={(v) => updatePlan(biz.id, v)}>
                      <SelectTrigger className="w-32 rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trialing">Essai</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="past_due">Impayé</SelectItem>
                        <SelectItem value="canceled">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={biz.geofence_enabled ? "default" : "secondary"}>
                      {biz.geofence_enabled ? `${biz.geofence_radius}m` : "Non"}
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

export default AdminBusinesses;
