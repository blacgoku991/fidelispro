import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { adminSidebarItems } from "@/lib/sidebarItems";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export function AdminLayout({ children, title, subtitle, headerAction }: AdminLayoutProps) {
  const { logout } = useAuth();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} onLogout={logout} />
        <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
          <MobileHeader onLogout={logout} items={adminSidebarItems} />
          <div className="flex items-start justify-between mb-6 gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
