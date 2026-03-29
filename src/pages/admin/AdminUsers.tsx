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
import { adminSidebarItems } from "@/lib/sidebarItems";
import { Search, Shield, Building2 } from "lucide-react";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { loading, role, logout } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && role !== "super_admin") navigate("/dashboard");
  }, [loading, role, navigate]);

  useEffect(() => {
    if (role !== "super_admin") return;
    fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    // Get profiles with their roles and businesses
    const [profilesRes, rolesRes, bizRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("businesses").select("id, name, owner_id"),
    ]);

    const roles = (rolesRes.data || []).reduce((acc: Record<string, string>, r: any) => {
      acc[r.user_id] = r.role;
      return acc;
    }, {});

    const biz = (bizRes.data || []).reduce((acc: Record<string, string>, b: any) => {
      acc[b.owner_id] = b.name;
      return acc;
    }, {});

    const merged = (profilesRes.data || []).map((p: any) => ({
      ...p,
      role: roles[p.id] || "unknown",
      businessName: biz[p.id] || null,
    }));

    setUsers(merged);
  };

  const filtered = users.filter((u) =>
    !search ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-display font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{users.length} utilisateur(s)</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom ou email..." className="pl-10 rounded-xl" />
        </div>

        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={u.role === "super_admin"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }>
                      {u.role === "super_admin" ? (
                        <><Shield className="w-3 h-3 mr-1" /> Super Admin</>
                      ) : (
                        <><Building2 className="w-3 h-3 mr-1" /> Commerçant</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.businessName || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
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

export default AdminUsers;
