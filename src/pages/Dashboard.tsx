import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import {
  CreditCard,
  Users,
  TrendingUp,
  QrCode,
  Bell,
  LogOut,
  BarChart3,
  Settings,
  Crown,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const stats = [
  { label: "Clients actifs", value: "0", icon: Users, change: "+0%" },
  { label: "Taux de retour", value: "0%", icon: TrendingUp, change: "+0%" },
  { label: "Scans aujourd'hui", value: "0", icon: QrCode, change: "+0%" },
  { label: "Récompenses données", value: "0", icon: Crown, change: "+0%" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
      else setUser(session.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const businessName = user?.user_metadata?.business_name || "Mon Commerce";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border/50 p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold">FidéliPro</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { icon: BarChart3, label: "Dashboard", active: true },
            { icon: CreditCard, label: "Cartes", active: false },
            { icon: Users, label: "Clients", active: false },
            { icon: QrCode, label: "Scanner", active: false },
            { icon: Bell, label: "Notifications", active: false },
            { icon: Settings, label: "Paramètres", active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="justify-start gap-3 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 p-6 lg:p-8">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">FidéliPro</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">
            Bonjour, {businessName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Voici un aperçu de votre activité
          </p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-5 rounded-2xl bg-card border border-border/50 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-emerald-600 font-medium">{stat.change}</span>
              </div>
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Card preview + quick scan */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h2 className="text-lg font-display font-semibold mb-4">Votre carte de fidélité</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Personnalisez et partagez votre carte avec vos clients.
            </p>
            <div className="flex justify-center">
              <LoyaltyCard
                businessName={businessName}
                customerName="Aperçu client"
                points={5}
                maxPoints={10}
                level="gold"
                cardId={`business-${user?.id?.slice(0, 8) || "demo"}`}
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent" />
              Scan rapide
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Scannez le QR code de vos clients pour ajouter des points instantanément.
            </p>
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 h-48 rounded-2xl bg-secondary flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground/30" />
              </div>
              <Button className="bg-gradient-primary text-primary-foreground rounded-xl hover:opacity-90 px-8">
                Ouvrir le scanner
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
