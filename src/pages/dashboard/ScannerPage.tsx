import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ScannerPage = () => {
  const { user, business } = useAuth();
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

    const newPoints = card.current_points + 1;
    const rewardEarned = newPoints >= card.max_points;
    const customer = card.customers;

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

    // Wallet push
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/wallet-push`, {
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

  return (
    <DashboardLayout title="Scanner" subtitle="Scannez ou entrez le code d'une carte client">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border/50 flex flex-col items-center">
          <div className="w-56 h-56 rounded-2xl bg-secondary flex items-center justify-center mb-5 relative overflow-hidden">
            <AnimatePresence>
              {success ? (
                <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-14 h-14 text-emerald-500" />
                  <p className="font-display font-bold text-emerald-600 text-sm">Point ajouté !</p>
                </motion.div>
              ) : (
                <motion.div key="scanner" className="flex flex-col items-center gap-2">
                  <QrCode className="w-14 h-14 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Zone de scan</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <div className="flex gap-2">
              <Input
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                placeholder="Code de la carte..."
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
              />
              <Button onClick={handleScan} disabled={scanning} className="bg-gradient-primary text-primary-foreground rounded-xl px-5">
                {scanning ? "..." : "OK"}
              </Button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              Entrez le code affiché sur la carte du client
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <StatsCard label="Scans aujourd'hui" value={todayScans} icon={QrCode} />

          {lastScan && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-card border border-border/50"
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> Dernier scan
              </h3>
              <p className="font-display font-semibold">{lastScan.customerName}</p>
              <div className="mt-3 w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(lastScan.points / lastScan.maxPoints) * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastScan.points}/{lastScan.maxPoints} points
              </p>
              {lastScan.rewardEarned && (
                <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-2 text-sm font-semibold text-accent">
                  🎉 Récompense gagnée !
                </motion.p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ScannerPage;
