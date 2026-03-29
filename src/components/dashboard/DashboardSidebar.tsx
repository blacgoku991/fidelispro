import { CreditCard, LogOut, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  onLogout: () => void;
}

export function DashboardSidebar({ items, onLogout }: DashboardSidebarProps) {
  const { role } = useAuth();
  const isAdmin = role === "super_admin";
  const isAdminPanel = items.some(i => i.path.startsWith("/admin"));

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border/50 p-6 hidden lg:flex flex-col z-50">
      <div className="flex items-center gap-2.5 mb-8">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          isAdminPanel ? "bg-purple-600" : "bg-gradient-primary"
        )}>
          {isAdminPanel ? (
            <Shield className="w-4 h-4 text-white" />
          ) : (
            <CreditCard className="w-4 h-4 text-primary-foreground" />
          )}
        </div>
        <div>
          <span className="text-lg font-display font-bold">FidéliPro</span>
          {isAdminPanel && <span className="text-[10px] text-purple-500 font-medium ml-1">ADMIN</span>}
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin" || item.path === "/dashboard"}
            className={({ isActive }) =>
              cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? isAdminPanel ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        {/* Switch between admin and merchant panels */}
        {isAdmin && !isAdminPanel && (
          <NavLink to="/admin"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-500 hover:bg-purple-500/10 transition-colors mt-4 border-t border-border/30 pt-4">
            <Shield className="w-4 h-4" />
            Panel Admin
          </NavLink>
        )}
        {isAdminPanel && (
          <NavLink to="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors mt-4 border-t border-border/30 pt-4">
            <CreditCard className="w-4 h-4" />
            Panel Commerçant
          </NavLink>
        )}
      </nav>

      <Button
        variant="ghost"
        onClick={onLogout}
        className="justify-start gap-3 text-muted-foreground hover:text-destructive"
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </Button>
    </aside>
  );
}
