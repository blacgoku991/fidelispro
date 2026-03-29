import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { QrCameraScanner } from "@/components/dashboard/QrCameraScanner";
import { ScanResultPopup } from "@/components/dashboard/ScanResultPopup";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, TrendingUp, QrCode, Crown, CheckCircle, Sparkles, Search, Star, Download, Copy, ExternalLink, Printer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const levelColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-100 text-slate-700",
  gold: "bg-yellow-100 text-yellow-800",
};

const Dashboard = () => {
  const { user, business } = useAuth();
  const [stats, setStats] = useState({ clients: 0, returnRate: 0, scansToday: 0, rewardsGiven: 0 });

  // Scanner state
  const [cardCode, setCardCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [todayScans, setTodayScans] = useState(0);

  // Popup state
  const [popup, setPopup] = useState<{
    open: boolean;
    type: "success" | "reward" | "error";
    title: string;
    message: string;
    details?: string;
  }>({ open: false, type: "success", title: "", message: "" });

  // Clients state
  const [customers, setCustomers] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    if (!business) return;
    fetchStats();
    fetchCustomers();
  }, [business]);

  const fetchStats = async () => {
    if (!business) return;
    const { count: clientCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id);

    const { count: rewardCount } = await supabase
      .from("customer_cards")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gt("rewards_earned", 0);

    const today = new Date().toISOString().split("T")[0];
    const { count: scansCount } = await supabase
      .from("points_history")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("created_at", today);

    setStats({
      clients: clientCount || 0,
      returnRate: clientCount ? Math.min(Math.round(((rewardCount || 0) / clientCount) * 100), 100) : 0,
      scansToday: scansCount || 0,
      rewardsGiven: rewardCount || 0,
    });
  };

  const fetchCustomers = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("customers")
      .select("*, customer_cards(*)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setCustomers(data);
  };

  // ── Scanner logic ─────────────────────────────────────────

  const processCardCode = async (code: string) => {
    if (!code.trim() || !business || !user) return;
    setScanning(true);
    setScannerPaused(true);

    const { data: card, error: cardError } = await supabase
      .from("customer_cards")
      .select("*, customers(*)")
      .eq("card_code", code.trim())
      .eq("business_id", business.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!card || cardError) {
      setPopup({
        open: true,
        type: "error",
        title: "Carte introuvable",
        message: "Ce code ne correspond à aucune carte active.",
      });
      setScanning(false);
      return;
    }

    const newPoints = (card.current_points || 0) + 1;
    const rewardEarned = newPoints >= (card.max_points || 10);
    const customer = card.customers;

    const changeMsg = rewardEarned
      ? `🎁 Récompense débloquée chez ${business.name} !`
      : `+1 point chez ${business.name} ! Vous avez ${newPoints} points.`;

    await supabase
      .from("customer_cards")
      .update({
        current_points: rewardEarned ? 0 : newPoints,
        rewards_earned: rewardEarned ? (card.rewards_earned || 0) + 1 : card.rewards_earned,
        wallet_change_message: changeMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id);

    // Wallet push
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/wallet-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          customer_id: customer.id,
          action_type: "points_increment",
          change_message: changeMsg,
        }),
      });
    } catch (walletErr) {
      console.warn("Wallet push failed (non-blocking):", walletErr);
    }

    // Update customer stats
    const newStreak = (customer.current_streak || 0) + 1;
    await supabase
      .from("customers")
      .update({
        total_points: (customer.total_points || 0) + 1,
        total_visits: (customer.total_visits || 0) + 1,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, customer.longest_streak || 0),
        last_visit_at: new Date().toISOString(),
        level: (customer.total_points || 0) + 1 >= 50 ? "gold" : (customer.total_points || 0) + 1 >= 20 ? "silver" : "bronze",
      })
      .eq("id", customer.id);

    await supabase.from("points_history").insert({
      customer_id: customer.id,
      business_id: business.id,
      card_id: card.id,
      points_added: 1,
      action: "scan",
      scanned_by: user.id,
    });

    setLastScan({
      customerName: customer.full_name,
      points: rewardEarned ? 0 : newPoints,
      maxPoints: card.max_points || 10,
      rewardEarned,
    });

    setTodayScans((p) => p + 1);
    setCardCode("");
    setScanning(false);
    fetchStats();

    if (rewardEarned) {
      setPopup({
        open: true,
        type: "reward",
        title: "🎉 Récompense débloquée !",
        message: `${customer.full_name} a gagné sa récompense !`,
        details: "Le compteur de points a été remis à zéro.",
      });
    } else {
      setPopup({
        open: true,
        type: "success",
        title: `+1 point ajouté !`,
        message: `${customer.full_name} — ${newPoints}/${card.max_points || 10} points`,
      });
    }
  };

  const handleManualScan = () => {
    processCardCode(cardCode);
  };

  const handleCameraScan = (code: string) => {
    processCardCode(code);
  };

  // ── Render ────────────────────────────────────────────────

  const businessName = business?.name || user?.user_metadata?.business_name || "Mon Commerce";

  const filteredCustomers = customers.filter((c) =>
    !clientSearch || (c.full_name || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || "").includes(clientSearch)
  );

  const statCards = [
    { label: "Clients actifs", value: stats.clients, icon: Users, color: "from-primary/10 to-primary/5 text-primary" },
    { label: "Taux de retour", value: `${stats.returnRate}%`, icon: TrendingUp, color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600" },
    { label: "Scans aujourd'hui", value: stats.scansToday + todayScans, icon: QrCode, color: "from-accent/10 to-accent/5 text-accent" },
    { label: "Récompenses", value: stats.rewardsGiven, icon: Crown, color: "from-amber-500/10 to-amber-500/5 text-amber-600" },
  ];

  return (
    <DashboardLayout
      title={`Bonjour, ${businessName} 👋`}
      subtitle="Voici un aperçu de votre activité"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-4 rounded-2xl bg-card border border-border/50"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-display font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs: Scanner / Clients / Campagne */}
      <Tabs defaultValue="scanner" className="space-y-4">
        <TabsList className="bg-secondary/50 rounded-xl p-1 h-auto">
          <TabsTrigger value="scanner" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <QrCode className="w-3.5 h-3.5" /> Scanner
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card">
            <Users className="w-3.5 h-3.5" /> Clients
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card">
            <TrendingUp className="w-3.5 h-3.5" /> Statistiques
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card">
            <QrCode className="w-3.5 h-3.5" /> QR Vitrine
          </TabsTrigger>
        </TabsList>

        {/* ── SCANNER TAB ── */}
        <TabsContent value="scanner">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Camera + manual input */}
            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-5">
              <div className="text-center">
                <h2 className="font-display font-semibold text-sm">Scanner une carte</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Utilisez la caméra ou entrez le code manuellement
                </p>
              </div>

              {/* Camera scanner */}
              <QrCameraScanner onScan={handleCameraScan} disabled={scanning} paused={scannerPaused} />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground">ou entrez le code</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Manual input */}
              <div className="flex gap-2 max-w-[280px] mx-auto">
                <Input
                  value={cardCode}
                  onChange={(e) => setCardCode(e.target.value)}
                  placeholder="Code carte..."
                  className="rounded-xl text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                />
                <Button
                  onClick={handleManualScan}
                  disabled={scanning || !cardCode.trim()}
                  className="bg-gradient-primary text-primary-foreground rounded-xl px-4 shrink-0"
                >
                  {scanning ? "..." : "OK"}
                </Button>
              </div>
            </div>

            {/* Results panel */}
            <div className="space-y-4">
              {/* Last scan info */}
              {lastScan && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-card border border-border/50"
                >
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" /> Dernier scan
                  </h3>
                  <p className="font-display font-semibold text-base">{lastScan.customerName}</p>
                  <div className="mt-3 w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${(lastScan.points / lastScan.maxPoints) * 100}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {lastScan.points}/{lastScan.maxPoints} points
                  </p>
                  {lastScan.rewardEarned && (
                    <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-2 text-sm font-bold text-accent">
                      🎉 Récompense gagnée !
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* Today's scans count */}
              <div className="p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.scansToday + todayScans}</p>
                  <p className="text-xs text-muted-foreground">Scans aujourd'hui</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── CLIENTS TAB ── */}
        <TabsContent value="clients">
          <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Rechercher un client..."
                  className="pl-9 rounded-xl text-sm"
                />
              </div>
              <span className="text-xs text-muted-foreground">{filteredCustomers.length} client(s)</span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun client trouvé</p>
              ) : (
                filteredCustomers.map((c) => {
                  const card = c.customer_cards?.[0];
                  const level = c.level || "bronze";
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {(c.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name || "Sans nom"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.email || c.phone || "Pas de contact"}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] ${levelColors[level]}`}>
                        {level}
                      </Badge>
                      {card && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {card.current_points || 0}/{card.max_points || 10}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── STATS TAB ── */}
        <TabsContent value="stats">
          {business && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-card border border-border/50">
                <h2 className="text-sm font-medium text-muted-foreground mb-4">Scans — 14 derniers jours</h2>
                <AnalyticsChart businessId={business.id} type="scans" />
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border/50">
                <h2 className="text-sm font-medium text-muted-foreground mb-4">Nouveaux clients — 14 derniers jours</h2>
                <AnalyticsChart businessId={business.id} type="customers" />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── QR VITRINE TAB ── */}
        <TabsContent value="qrcode">
          {business && <QrVitrineSection business={business} />}
        </TabsContent>
      </Tabs>

      {/* Scan result popup */}
      <ScanResultPopup
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        details={popup.details}
        onClose={() => {
          setPopup((p) => ({ ...p, open: false }));
          setScannerPaused(false);
        }}
      />
    </DashboardLayout>
  );
};

// ── QR Vitrine Section ──────────────────────────────────────────
function QrVitrineSection({ business }: { business: any }) {
  const publicUrl = `${window.location.origin}/b/${business.id}`;

  const downloadQR = () => {
    const svg = document.getElementById("vitrine-qr-svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    canvas.width = 800; canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 800, 800);
      ctx.drawImage(img, 0, 0, 800, 800);
      const a = document.createElement("a");
      a.download = `qr-${business.name.replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Lien copié !");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="p-6 rounded-2xl bg-card border border-border/50 flex flex-col items-center space-y-5">
        <h2 className="font-display font-semibold text-sm self-start">Votre QR Code vitrine</h2>
        <div
          id="qr-printable"
          className="relative p-8 rounded-3xl flex flex-col items-center gap-4"
          style={{
            background: `linear-gradient(145deg, ${business.primary_color}12 0%, ${business.secondary_color || business.primary_color}08 100%)`,
            border: `2px solid ${business.primary_color}20`,
          }}
        >
          {business.logo_url && (
            <img src={business.logo_url} alt={business.name} className="w-12 h-12 rounded-xl object-cover" />
          )}
          <div className="p-4 bg-background rounded-2xl shadow-sm">
            <QRCodeSVG
              id="vitrine-qr-svg"
              value={publicUrl}
              size={200}
              level="H"
              includeMargin={false}
              fgColor={business.primary_color || "#6B46C1"}
            />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-sm">{business.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Scannez pour votre carte de fidélité</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={downloadQR} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Télécharger PNG
          </Button>
          <Button onClick={copyLink} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" /> Copier le lien
          </Button>
          <Button
            onClick={() => {
              const printContent = document.getElementById("qr-printable");
              if (!printContent) return;
              const w = window.open("", "_blank");
              if (!w) return;
              w.document.write(`<!DOCTYPE html><html><head><title>QR Code - ${business.name}</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;}</style></head><body>${printContent.outerHTML}</body></html>`);
              w.document.close();
              w.focus();
              w.print();
            }}
            variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
          <h2 className="font-display font-semibold text-sm">Comment ça marche</h2>
          {[
            { emoji: "🖨️", title: "Imprimez ou affichez le QR", desc: "Vitrine, comptoir, menu, flyer..." },
            { emoji: "📱", title: "Le client scanne", desc: "Appareil photo ou application QR" },
            { emoji: "🎉", title: "Carte créée en 10 sec", desc: "Inscription instantanée et gratuite" },
          ].map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-xl">{s.emoji}</span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-3">
          <h2 className="font-display font-semibold text-sm">Lien direct</h2>
          <p className="text-xs text-muted-foreground">Partagez ce lien sur vos réseaux sociaux ou votre site web.</p>
          <div className="flex items-center gap-2">
            <code className="text-[11px] bg-secondary px-3 py-2 rounded-xl flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{publicUrl}</code>
            <Button size="icon" variant="outline" className="rounded-xl h-9 w-9 shrink-0" onClick={copyLink}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="outline" className="rounded-xl h-9 w-9 shrink-0" onClick={() => window.open(publicUrl, "_blank")}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
