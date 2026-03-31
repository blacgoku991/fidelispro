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
        <main className="lg:ml-64 min-h-screen flex flex-col">
          <MobileHeader onLogout={logout} items={adminSidebarItems} />

          {/* Page header */}
          <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
                {subtitle && <p className="text-muted-foreground text-sm mt-0.5 truncate">{subtitle}</p>}
              </div>
              {headerAction && <div className="shrink-0">{headerAction}</div>}
            </div>
          </div>

          {/* Page content */}
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
