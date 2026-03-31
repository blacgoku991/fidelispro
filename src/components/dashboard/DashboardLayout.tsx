import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SubscriptionGuard } from "@/components/dashboard/SubscriptionGuard";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { businessSidebarItems } from "@/lib/sidebarItems";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export function DashboardLayout({ children, title, subtitle, headerAction }: DashboardLayoutProps) {
  const { loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={businessSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 min-h-screen flex flex-col">
        <MobileHeader onLogout={logout} items={businessSidebarItems} />

        {/* Page header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground text-sm mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <SubscriptionGuard>
            {children}
          </SubscriptionGuard>
        </div>
      </main>
    </div>
  );
}
