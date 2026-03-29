import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessSidebarItems } from "@/lib/sidebarItems";
import {
  QrCode, CheckCircle, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ScannerPage = () => {
  const { user, loading, business, logout } = useAuth();
  const [cardCode, setCardCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [todayScans, setTodayScans] = useState(0);

  const handleScan = async () => {
    if (!cardCode.trim() || !business || !user) {
      toast.error("Entrez un code de carte");
      return;
    }
    setScanning(true);

    const { data: card, error: cardError } = await supabase
      .from("customer_cards")
      .select("*, customers(*)")
      .eq("card_code", cardCode.trim())
      .eq("business_id", business.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!card || cardError) {
      toast.error("Carte non trouvée ou inactive");
      setScanning(false);
      return;
    }

    // Add point
    const newPoints = card.current_points + 1;
    const rewardEarned = newPoints >= card.max_points;

    const changeMsg = rewardEarned
      ? `🎁 Récompense débloquée chez ${business.name} !`
      : `+1 point chez ${business.name} ! Vous avez ${newPoints} points.`;

    await supabase
      .from("customer_cards")
      .update({
        current_points: rewardEarned ? 0 : newPoints,
        rewards_earned: rewardEarned ? card.rewards_earned + 1 : card.rewards_earned,
        wallet_change_message: changeMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id);

    // Update customer stats
    const customer = card.customers;
    const newStreak = customer.current_streak + 1;
    await supabase
      .from("customers")
      .update({
        total_points: customer.total_points + 1,
        total_visits: customer.total_visits + 1,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, customer.longest_streak),
        last_visit_at: new Date().toISOString(),
        level: customer.total_points + 1 >= 50 ? "gold" : customer.total_points + 1 >= 20 ? "silver" : "bronze",
      })
      .eq("id", customer.id);

    // Log points
    await supabase.from("points_history").insert({
      customer_id: customer.id,
      business_id: business.id,
      card_id: card.id,
      points_added: 1,
      action: "scan",
      scanned_by: user.id,
    });

    // Trigger Wallet push so iPhone updates in real-time
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

    setLastScan({
      customerName: customer.full_name,
      points: rewardEarned ? 0 : newPoints,
      maxPoints: card.max_points,
      rewardEarned,
    });

    setSuccess(true);
    setTodayScans((p) => p + 1);
    setCardCode("");
    setScanning(false);

    if (rewardEarned) {
      toast.success("🎉 Récompense débloquée !", { description: `${customer.full_name} a gagné sa récompense !` });
    } else {
      toast.success(`+1 point pour ${customer.full_name}`, { description: `${newPoints}/${card.max_points} points` });
    }

    setTimeout(() => setSuccess(false), 3000);
  };

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
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} items={businessSidebarItems} />

        <h1 className="text-2xl font-display font-bold mb-2">Scanner</h1>
        <p className="text-muted-foreground text-sm mb-8">Scannez ou entrez le code d'une carte client</p>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-card border border-border/50 flex flex-col items-center">
            <div className="w-64 h-64 rounded-2xl bg-secondary flex items-center justify-center mb-6 relative overflow-hidden">
              <AnimatePresence>
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <CheckCircle className="w-16 h-16 text-emerald-500" />
                    <p className="font-display font-bold text-emerald-600">Point ajouté !</p>
                  </motion.div>
                ) : (
                  <motion.div key="scanner" className="flex flex-col items-center gap-3">
                    <QrCode className="w-16 h-16 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Zone de scan</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <div className="flex gap-2">
                <Input
                  value={cardCode}
                  onChange={(e) => setCardCode(e.target.value)}
                  placeholder="Code de la carte..."
                  className="rounded-xl"
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                />
                <Button
                  onClick={handleScan}
                  disabled={scanning}
                  className="bg-gradient-primary text-primary-foreground rounded-xl px-6"
                >
                  {scanning ? "..." : "Valider"}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Entrez le code affiché sur la carte du client
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <StatsCard label="Scans aujourd'hui" value={todayScans} icon={QrCode} />

            {lastScan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-card border border-border/50"
              >
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" /> Dernier scan
                </h3>
                <p className="font-medium">{lastScan.customerName}</p>
                <div className="mt-3 w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(lastScan.points / lastScan.maxPoints) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {lastScan.points}/{lastScan.maxPoints} points
                </p>
                {lastScan.rewardEarned && (
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-2 text-sm font-semibold text-accent flex items-center gap-1"
                  >
                    🎉 Récompense gagnée !
                  </motion.p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScannerPage;
