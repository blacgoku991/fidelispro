import { CreditCard, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border/50 p-6 hidden lg:flex flex-col z-50">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-display font-bold">FidéliPro</span>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
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
