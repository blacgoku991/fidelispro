import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { QrCameraScanner } from "@/components/dashboard/QrCameraScanner";
import { ScanResultPopup } from "@/components/dashboard/ScanResultPopup";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, TrendingUp, QrCode, Crown, Sparkles, Search,
  Download, Copy, ExternalLink, Printer, Flame, Gift, Eye,
  Mail, Phone, History, ChevronDown, ChevronUp, MapPin, Radar,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const levelConfig: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  bronze: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", label: "Bronze", emoji: "🥉" },
  silver: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-300", label: "Silver", emoji: "🥈" },
  gold: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", label: "Gold", emoji: "⭐" },
};

const Dashboard = () => {
  const { user, business } = useAuth();
  const { permissions, requestNotifications, requestGeolocation } = usePermissions();
  const [permissionsDismissed, setPermissionsDismissed] = useState(false);
  const [stats, setStats] = useState({ clients: 0, returnRate: 0, scansToday: 0, rewardsGiven: 0 });

  // Scanner
  const [cardCode, setCardCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [todayScans, setTodayScans] = useState(0);

  // Popup
  const [popup, setPopup] = useState<{
    open: boolean;
    type: "success" | "reward" | "error";
    title: string;
    message: string;
    details?: string;
  }>({ open: false, type: "success", title: "", message: "" });

  // Clients
  const [customers, setCustomers] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<Record<string, any[]>>({});

  // Client detail dialog
  const [selectedClient, setSelectedClient] = useState<any>(null);

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

  const fetchClientHistory = async (customerId: string) => {
    if (clientHistory[customerId]) return;
    const { data } = await supabase
      .from("points_history")
      .select("*")
      .eq("customer_id", customerId)
      .eq("business_id", business!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setClientHistory(prev => ({ ...prev, [customerId]: data }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
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
      setPopup({ open: true, type: "error", title: "Carte introuvable", message: "Ce code ne correspond à aucune carte active." });
      setScanning(false);
      return;
    }

    // Respect loyalty_type settings
    const loyaltyType = business.loyalty_type || "points";
    const pointsToAdd = business.points_per_visit || 1;
    const maxPts = card.max_points || business.max_points_per_card || 10;

    const newPoints = (card.current_points || 0) + pointsToAdd;
    const rewardEarned = newPoints >= maxPts;
    const customer = card.customers;

    // Build label based on loyalty type
    const unitLabel = loyaltyType === "stamps" ? "tampon" : "point";
    const unitLabelPlural = loyaltyType === "stamps" ? "tampons" : "points";
    const addedLabel = pointsToAdd > 1 ? `+${pointsToAdd} ${unitLabelPlural}` : `+1 ${unitLabel}`;

    const changeMsg = rewardEarned
      ? `🎁 Récompense débloquée chez ${business.name} !`
      : `${addedLabel} chez ${business.name} ! ${loyaltyType === "stamps" ? `${newPoints}/${maxPts} tampons` : `${newPoints}/${maxPts} points`}.`;

    await supabase.from("customer_cards").update({
      current_points: rewardEarned ? 0 : newPoints,
      rewards_earned: rewardEarned ? (card.rewards_earned || 0) + 1 : card.rewards_earned,
      wallet_change_message: changeMsg,
      updated_at: new Date().toISOString(),
    }).eq("id", card.id);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/wallet-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: business.id, customer_id: customer.id, action_type: "points_increment", change_message: changeMsg }),
      });
    } catch { /* non-blocking */ }

    const newStreak = (customer.current_streak || 0) + 1;
    await supabase.from("customers").update({
      total_points: (customer.total_points || 0) + pointsToAdd,
      total_visits: (customer.total_visits || 0) + 1,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, customer.longest_streak || 0),
      last_visit_at: new Date().toISOString(),
      level: (customer.total_points || 0) + pointsToAdd >= 50 ? "gold" : (customer.total_points || 0) + pointsToAdd >= 20 ? "silver" : "bronze",
    }).eq("id", customer.id);

    await supabase.from("points_history").insert({
      customer_id: customer.id, business_id: business.id, card_id: card.id,
      points_added: pointsToAdd, action: "scan", scanned_by: user.id,
    });

    setLastScan({
      customerName: customer.full_name,
      points: rewardEarned ? 0 : newPoints,
      maxPoints: maxPts,
      rewardEarned,
      loyaltyType,
    });
    setTodayScans((p) => p + 1);
    setCardCode("");
    setScanning(false);
    fetchStats();

    if (rewardEarned) {
      setPopup({ open: true, type: "reward", title: "🎉 Récompense débloquée !", message: `${customer.full_name} a gagné sa récompense !`, details: "Le compteur a été remis à zéro." });
    } else {
      setPopup({ open: true, type: "success", title: `${addedLabel} !`, message: `${customer.full_name} — ${newPoints}/${maxPts} ${unitLabelPlural}` });
    }
  };

  // ── Render ────────────────────────────────────────────────
  const businessName = business?.name || user?.user_metadata?.business_name || "Mon Commerce";
  const filteredCustomers = customers.filter((c) =>
    !clientSearch || (c.full_name || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || "").includes(clientSearch)
  );

  const statCards = [
    { label: "Clients", value: stats.clients, icon: Users, gradient: "from-primary to-primary/70" },
    { label: "Retour", value: `${stats.returnRate}%`, icon: TrendingUp, gradient: "from-emerald-500 to-emerald-400" },
    { label: "Scans", value: stats.scansToday + todayScans, icon: QrCode, gradient: "from-accent to-amber-400" },
    { label: "Récompenses", value: stats.rewardsGiven, icon: Gift, gradient: "from-rose-500 to-pink-400" },
  ];

  return (
    <DashboardLayout title={`Bonjour, ${businessName} 👋`} subtitle="Voici un aperçu de votre activité">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${stat.gradient} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity`} />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-display font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Permission banner */}
      {!permissionsDismissed && (permissions.notifications !== "granted" || permissions.geolocation !== "granted") && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Activez les permissions pour une meilleure expérience</p>
            <p className="text-xs text-muted-foreground mt-0.5">Notifications push et géolocalisation pour vos clients</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {permissions.notifications !== "granted" && (
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5" onClick={requestNotifications}>
                🔔 Notifications
              </Button>
            )}
            {permissions.geolocation !== "granted" && (
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5" onClick={requestGeolocation}>
                📍 Localisation
              </Button>
            )}
            <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => setPermissionsDismissed(true)}>
              ✕
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="scanner" className="space-y-6">
        <TabsList className="bg-card border border-border/40 rounded-2xl p-1.5 h-auto shadow-sm w-full sm:w-auto">
          <TabsTrigger value="scanner" className="rounded-xl gap-2 px-4 py-2.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <QrCode className="w-4 h-4" /> Scanner
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-xl gap-2 px-4 py-2.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Users className="w-4 h-4" /> Clients
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl gap-2 px-4 py-2.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <TrendingUp className="w-4 h-4" /> Stats
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="rounded-xl gap-2 px-4 py-2.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Eye className="w-4 h-4" /> Vitrine
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ SCANNER ═══════════════ */}
        <TabsContent value="scanner">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Camera — takes 3 cols */}
            <div className="lg:col-span-3 rounded-3xl bg-card border border-border/40 p-6 lg:p-8 space-y-6 shadow-sm">
              <div>
                <h2 className="font-display font-bold text-lg tracking-tight">Scanner une carte</h2>
                <p className="text-sm text-muted-foreground mt-1">Pointez la caméra vers le QR code du client</p>
              </div>

              <QrCameraScanner onScan={(code) => processCardCode(code)} disabled={scanning} paused={scannerPaused} />

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">ou code manuel</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-3 max-w-sm mx-auto">
                <Input
                  value={cardCode}
                  onChange={(e) => setCardCode(e.target.value)}
                  placeholder="Entrez le code carte..."
                  className="rounded-xl h-11 text-sm bg-secondary/50 border-border/40"
                  onKeyDown={(e) => e.key === "Enter" && processCardCode(cardCode)}
                />
                <Button
                  onClick={() => processCardCode(cardCode)}
                  disabled={scanning || !cardCode.trim()}
                  className="bg-gradient-primary text-primary-foreground rounded-xl h-11 px-6 font-semibold shrink-0 shadow-md hover:shadow-lg transition-shadow"
                >
                  Valider
                </Button>
              </div>
            </div>

            {/* Side panel — 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              {/* Today stats mini */}
              <div className="rounded-2xl bg-card border border-border/40 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-display font-bold tracking-tight">{stats.scansToday + todayScans}</p>
                    <p className="text-xs text-muted-foreground font-medium">Scans aujourd'hui</p>
                  </div>
                </div>
              </div>

              {/* Last scan */}
              <AnimatePresence mode="wait">
                {lastScan ? (
                  <motion.div
                    key={`scan-${lastScan.customerName}-${lastScan.points}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="rounded-2xl bg-card border border-border/40 p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dernier scan</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(lastScan.customerName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-sm truncate">{lastScan.customerName}</p>
                        <p className="text-xs text-muted-foreground">{lastScan.points}/{lastScan.maxPoints} {lastScan.loyaltyType === "stamps" ? "tampons" : "points"}</p>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((lastScan.points / lastScan.maxPoints) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    {lastScan.rewardEarned && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20">
                        <Gift className="w-4 h-4 text-accent" />
                        <p className="text-xs font-semibold text-accent">Récompense débloquée !</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-scan"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl border border-dashed border-border/60 p-8 text-center"
                  >
                    <QrCode className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aucun scan pour le moment</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Scannez une carte pour commencer</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick tips */}
              <div className="rounded-2xl bg-secondary/30 border border-border/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Astuce</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  La caméra détecte automatiquement le QR code. Gardez la carte bien éclairée et stable pour un scan rapide.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════ CLIENTS ═══════════════ */}
        <TabsContent value="clients">
          <div className="rounded-3xl bg-card border border-border/40 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 lg:p-6 border-b border-border/40 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="font-display font-bold text-lg tracking-tight">Vos clients</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{filteredCustomers.length} client{filteredCustomers.length > 1 ? "s" : ""} enregistré{filteredCustomers.length > 1 ? "s" : ""}</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Rechercher par nom, email, téléphone..."
                  className="pl-10 rounded-xl h-10 text-sm bg-secondary/50 border-border/40"
                />
              </div>
            </div>

            {/* Client list */}
            <div className="divide-y divide-border/30 max-h-[600px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun client trouvé</p>
                </div>
              ) : (
                filteredCustomers.map((c, i) => {
                  const card = c.customer_cards?.[0];
                  const lv = levelConfig[c.level || "bronze"] || levelConfig.bronze;
                  const points = card?.current_points || 0;
                  const maxPts = card?.max_points || 10;
                  const progress = Math.min((points / maxPts) * 100, 100);
                  const isExpanded = expandedClient === c.id;
                  const history = clientHistory[c.id] || [];

                  return (
                    <div key={c.id}>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-4 px-5 lg:px-6 py-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedClient(c);
                          fetchClientHistory(c.id);
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(c.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{c.full_name || "Sans nom"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.email && (
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(c.email, "Email"); }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                title="Copier l'email"
                              >
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{c.email}</span>
                              </button>
                            )}
                            {c.phone && (
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(c.phone, "Téléphone"); }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                title="Copier le téléphone"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{c.phone}</span>
                              </button>
                            )}
                            {!c.email && !c.phone && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </div>
                        {/* Level badge */}
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${lv.bg} ${lv.text}`}>
                          {lv.emoji} {lv.label}
                        </div>
                        {/* Points progress with label */}
                        {card && (
                          <div className="hidden sm:flex items-center gap-2 w-40">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Fidélité</span>
                                <span className="text-[11px] font-mono font-semibold text-primary">{points}/{maxPts}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Visits count */}
                        <div className="hidden lg:flex flex-col items-center min-w-[48px]">
                          <span className="text-sm font-bold">{c.total_visits || 0}</span>
                          <span className="text-[10px] text-muted-foreground">visites</span>
                        </div>
                      </motion.div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Client detail dialog */}
          <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
            <DialogContent className="max-w-md">
              {selectedClient && (() => {
                const c = selectedClient;
                const card = c.customer_cards?.[0];
                const lv = levelConfig[c.level || "bronze"] || levelConfig.bronze;
                const points = card?.current_points || 0;
                const maxPts = card?.max_points || 10;
                const progress = Math.min((points / maxPts) * 100, 100);
                const history = clientHistory[c.id] || [];

                return (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                          {(c.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base">{c.full_name || "Sans nom"}</p>
                          <div className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${lv.bg} ${lv.text}`}>
                            {lv.emoji} {lv.label}
                          </div>
                        </div>
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                      {/* Contact buttons */}
                      <div className="flex gap-2">
                        {c.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl gap-2 text-xs flex-1"
                            onClick={() => copyToClipboard(c.email, "Email")}
                          >
                            <Mail className="w-3.5 h-3.5" /> {c.email}
                          </Button>
                        )}
                        {c.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl gap-2 text-xs flex-1"
                            onClick={() => copyToClipboard(c.phone, "Téléphone")}
                          >
                            <Phone className="w-3.5 h-3.5" /> {c.phone}
                          </Button>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-secondary/40 text-center">
                          <p className="text-lg font-bold">{c.total_visits || 0}</p>
                          <p className="text-[10px] text-muted-foreground">Visites</p>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/40 text-center">
                          <p className="text-lg font-bold">{c.current_streak || 0} 🔥</p>
                          <p className="text-[10px] text-muted-foreground">Série</p>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/40 text-center">
                          <p className="text-lg font-bold">{card?.rewards_earned || 0}</p>
                          <p className="text-[10px] text-muted-foreground">Récompenses</p>
                        </div>
                      </div>

                      {/* Points progress */}
                      {card && (
                        <div className="p-3 rounded-xl border border-border/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Carte de fidélité</span>
                            <span className="text-xs font-mono font-bold text-primary">{points}/{maxPts} points</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {maxPts - points > 0
                              ? `Encore ${maxPts - points} point${maxPts - points > 1 ? "s" : ""} avant la récompense`
                              : "🎉 Récompense disponible !"}
                          </p>
                        </div>
                      )}

                      {/* Visit history */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Historique des passages</span>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1">
                          {history.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Aucun passage enregistré</p>
                          ) : (
                            history.map((h) => (
                              <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  <span className="font-medium">+{h.points_added} point{h.points_added > 1 ? "s" : ""}</span>
                                  {h.action && <span className="text-muted-foreground">({h.action})</span>}
                                </div>
                                <span className="text-muted-foreground">
                                  {new Date(h.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {c.last_visit_at && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          Dernière visite : {new Date(c.last_visit_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════ STATS ═══════════════ */}
        <TabsContent value="stats">
          {business && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-3xl bg-card border border-border/40 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-display font-semibold">Scans</h2>
                      <p className="text-[11px] text-muted-foreground">14 derniers jours</p>
                    </div>
                  </div>
                  <AnalyticsChart businessId={business.id} type="scans" />
                </div>
                <div className="rounded-3xl bg-card border border-border/40 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-display font-semibold">Nouveaux clients</h2>
                      <p className="text-[11px] text-muted-foreground">14 derniers jours</p>
                    </div>
                  </div>
                  <AnalyticsChart businessId={business.id} type="customers" />
                </div>
              </div>

              {/* Summary row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total clients", value: stats.clients, icon: Users },
                  { label: "Taux de retour", value: `${stats.returnRate}%`, icon: TrendingUp },
                  { label: "Scans totaux", value: stats.scansToday + todayScans, icon: QrCode },
                  { label: "Récompenses", value: stats.rewardsGiven, icon: Gift },
                ].map((s) => {
                  const SIcon = s.icon;
                  return (
                    <div key={s.label} className="rounded-2xl bg-card border border-border/40 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <SIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                      </div>
                      <p className="text-xl font-display font-bold">{s.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ QR VITRINE ═══════════════ */}
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
    <div className="grid lg:grid-cols-5 gap-6">
      {/* QR Preview — 3 cols */}
      <div className="lg:col-span-3 rounded-3xl bg-card border border-border/40 p-6 lg:p-8 shadow-sm flex flex-col items-center space-y-6">
        <div className="self-start">
          <h2 className="font-display font-bold text-lg tracking-tight">QR Code vitrine</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Imprimez-le ou affichez-le en magasin</p>
        </div>

        <div
          id="qr-printable"
          className="relative p-10 rounded-3xl flex flex-col items-center gap-5 w-full max-w-sm"
          style={{
            background: `linear-gradient(145deg, ${business.primary_color}10 0%, ${business.secondary_color || business.primary_color}06 100%)`,
            border: `1.5px solid ${business.primary_color}15`,
          }}
        >
          {business.logo_url && (
            <img src={business.logo_url} alt={business.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
          )}
          <div className="p-5 bg-background rounded-2xl shadow-md">
            <QRCodeSVG
              id="vitrine-qr-svg"
              value={publicUrl}
              size={220}
              level="H"
              includeMargin={false}
              fgColor={business.primary_color || "#6B46C1"}
            />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-base">{business.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Scannez pour votre carte de fidélité</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button onClick={downloadQR} variant="outline" size="sm" className="rounded-xl gap-2 text-xs h-10 px-4">
            <Download className="w-4 h-4" /> Télécharger
          </Button>
          <Button onClick={copyLink} variant="outline" size="sm" className="rounded-xl gap-2 text-xs h-10 px-4">
            <Copy className="w-4 h-4" /> Copier le lien
          </Button>
          <Button
            onClick={() => {
              const el = document.getElementById("qr-printable");
              if (!el) return;
              const w = window.open("", "_blank");
              if (!w) return;
              w.document.write(`<!DOCTYPE html><html><head><title>QR - ${business.name}</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;}</style></head><body>${el.outerHTML}</body></html>`);
              w.document.close(); w.focus(); w.print();
            }}
            variant="outline" size="sm" className="rounded-xl gap-2 text-xs h-10 px-4"
          >
            <Printer className="w-4 h-4" /> Imprimer
          </Button>
        </div>
      </div>

      {/* Instructions — 2 cols */}
      <div className="lg:col-span-2 space-y-5">
        <div className="rounded-2xl bg-card border border-border/40 p-5 shadow-sm space-y-5">
          <h2 className="font-display font-semibold text-sm">Comment ça marche</h2>
          {[
            { step: "1", emoji: "🖨️", title: "Imprimez ou affichez", desc: "Vitrine, comptoir, menu, flyer..." },
            { step: "2", emoji: "📱", title: "Le client scanne", desc: "Avec son appareil photo" },
            { step: "3", emoji: "🎉", title: "Carte créée", desc: "Inscription en 10 secondes" },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-lg shrink-0">
                {s.emoji}
              </div>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-card border border-border/40 p-5 shadow-sm space-y-3">
          <h2 className="font-display font-semibold text-sm">Lien direct</h2>
          <p className="text-xs text-muted-foreground">Partagez sur vos réseaux sociaux ou votre site.</p>
          <div className="flex items-center gap-2">
            <code className="text-[11px] bg-secondary/60 px-3 py-2.5 rounded-xl flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{publicUrl}</code>
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
