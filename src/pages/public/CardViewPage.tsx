import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Crown, Trophy, Share, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import addToWalletBadge from "@/assets/add-to-apple-wallet-fr.png";

const badgeIcons: Record<string, string> = {
  first_visit: "🎯",
  streak_3: "🔥",
  streak_7: "💎",
  streak_30: "👑",
  reward_earned: "🏆",
  vip: "⭐",
};

const CardViewPage = () => {
  const { cardCode } = useParams();
  const [card, setCard] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);
  const [googleWalletLoading, setGoogleWalletLoading] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const isAppleDevice = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
  const isAndroidDevice = /Android/.test(navigator.userAgent);

  const handleAddToWallet = async () => {
    if (!cardCode) return;
    setWalletLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const walletUrl = `${supabaseUrl}/functions/v1/generate-pass?card_code=${encodeURIComponent(cardCode)}`;
      window.location.assign(walletUrl);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Impossible de générer la carte Wallet");
    } finally {
      setWalletLoading(false);
    }
  };

  const handleAddToGoogleWallet = async () => {
    if (!cardCode) return;
    setGoogleWalletLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/generate-google-pass?card_code=${encodeURIComponent(cardCode)}`
      );
      const data = await res.json();
      if (data.saveUrl) {
        window.open(data.saveUrl, "_blank");
      } else {
        toast.error(data.error || "Impossible de générer la carte Google Wallet");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur Google Wallet");
    } finally {
      setGoogleWalletLoading(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!cardCode) return;
      const { data: cardData } = await supabase
        .from("customer_cards")
        .select("*, customers(*)")
        .eq("card_code", cardCode)
        .maybeSingle();

      if (!cardData) { setLoading(false); return; }
      setCard(cardData);
      setCustomer(cardData.customers);

      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", cardData.business_id)
        .maybeSingle();
      if (biz) setBusiness(biz);
      setLoading(false);
    };
    fetch();
  }, [cardCode]);

  // Show install banner if not already installed as PWA
  useEffect(() => {
    if (!isStandalone) {
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) setShowInstallBanner(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!card || !customer || !business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">Carte introuvable</h1>
          <p className="text-muted-foreground mt-2">Ce code carte n'est pas valide.</p>
        </div>
      </div>
    );
  }

  const progress = Math.min((card.current_points / card.max_points) * 100, 100);
  const pointsToReward = card.max_points - card.current_points;

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center p-6 pt-8 safe-area-top safe-area-bottom"
      style={{
        background: `linear-gradient(135deg, ${business.primary_color}10 0%, ${business.secondary_color}10 100%)`,
      }}
    >
      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && !isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md mb-4 p-4 rounded-2xl bg-card border border-border/50 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Installer l'application</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pour recevoir les notifications et accéder rapidement à votre carte
                  </p>
                  {isAppleDevice ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        1. Appuyez sur <Share className="w-3.5 h-3.5 inline text-primary" />
                      </span>
                      <span>→</span>
                      <span>2. « Sur l'écran d'accueil »</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Appuyez sur le menu ⋮ → « Ajouter à l'écran d'accueil »
                    </p>
                  )}
                </div>
              </div>
              <button onClick={dismissInstallBanner} className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <LoyaltyCard
          businessName={business.name}
          customerName={customer.full_name || "Client"}
          points={card.current_points || 0}
          maxPoints={card.max_points || 10}
          level={customer.level || "bronze"}
          cardId={card.card_code || card.id}
          logoUrl={business.logo_url || undefined}
          accentColor={business.primary_color}
          secondaryColor={business.secondary_color}
          rewardDescription={business.reward_description}
          rewardsEarned={card.rewards_earned || 0}
        />

        {/* Apple Wallet button */}
        {isAppleDevice && (
          <button
            onClick={handleAddToWallet}
            disabled={walletLoading}
            className="w-full flex justify-center"
          >
            <img
              src={addToWalletBadge}
              alt="Ajouter à Apple Cartes"
              className="h-14 hover:opacity-80 transition-opacity"
              style={{ filter: walletLoading ? "grayscale(1) opacity(0.5)" : "none" }}
            />
          </button>
        )}

        {/* Google Wallet button */}
        {!isAppleDevice && (
          <button
            onClick={handleAddToGoogleWallet}
            disabled={googleWalletLoading}
            className="w-full flex justify-center"
          >
            <div
              className="h-14 px-6 rounded-lg flex items-center gap-3 hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: "#1f1f1f",
                filter: googleWalletLoading ? "grayscale(1) opacity(0.5)" : "none",
              }}
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path d="M21.4 11.3l-1-1.6-2.1 1.2.1-2.4h-1.9l.1 2.4-2.1-1.2-1 1.6 2.1 1.2-2.1 1.2 1 1.6 2.1-1.2-.1 2.4h1.9l-.1-2.4 2.1 1.2 1-1.6-2.1-1.2 2.1-1.2z" fill="#FBBC04"/>
                <path d="M7.5 20C4.5 20 2 17.5 2 14.5S4.5 9 7.5 9c1.7 0 3 .6 4 1.7l-1.6 1.5c-.6-.6-1.4-.9-2.4-.9-2 0-3.6 1.6-3.6 3.6s1.6 3.6 3.6 3.6c1.5 0 2.3-.6 2.8-1.1.4-.4.7-1 .8-1.8H7.5v-2.1h5.8c.1.3.1.7.1 1.1 0 1.3-.4 3-1.5 4.1-1.1 1.2-2.5 1.8-4.4 1.8z" fill="#4285F4"/>
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-gray-400 leading-none">Ajouter à</p>
                <p className="text-white font-medium text-base leading-tight">Google Wallet</p>
              </div>
            </div>
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Code : <span className="font-mono">{card.card_code}</span>
        </p>

        {/* Progress info */}
        <div className="p-5 rounded-2xl bg-card border border-border/50">
          {pointsToReward > 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Plus que {pointsToReward} point{pointsToReward > 1 ? "s" : ""} !</p>
                <p className="text-xs text-muted-foreground">{business.reward_description}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Récompense disponible ! 🎉</p>
                <p className="text-xs text-muted-foreground">Présentez votre carte en magasin</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <p className="text-2xl font-display font-bold">{customer.total_visits || 0}</p>
            <p className="text-xs text-muted-foreground">Visites</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <p className="text-2xl font-display font-bold">{customer.current_streak || 0}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Flame className="w-3 h-3" />Streak</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <p className="text-2xl font-display font-bold">{card.rewards_earned || 0}</p>
            <p className="text-xs text-muted-foreground">Récompenses</p>
          </div>
        </div>

        {/* Badges */}
        {customer.badges && customer.badges.length > 0 && (
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <p className="font-semibold text-sm mb-3">Vos badges</p>
            <div className="flex flex-wrap gap-2">
              {customer.badges.map((badge: string) => (
                <span key={badge} className="px-3 py-1.5 rounded-full bg-secondary text-sm">
                  {badgeIcons[badge] || "🏅"} {badge.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Level info */}
        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              {customer.level === "gold" ? <Crown className="w-5 h-5 text-yellow-500" /> :
               customer.level === "silver" ? <Crown className="w-5 h-5 text-slate-400" /> :
               <Star className="w-5 h-5 text-amber-600" />}
            </div>
            <div>
              <p className="font-semibold text-sm capitalize">Niveau {customer.level}</p>
              <p className="text-xs text-muted-foreground">
                {customer.level === "bronze" ? "20 points pour Silver" :
                 customer.level === "silver" ? "50 points pour Gold" :
                 "Niveau maximum atteint !"}
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Propulsé par <span className="font-semibold text-primary">FidéliPro</span>
        </p>
      </motion.div>
    </div>
  );
};

export default CardViewPage;
