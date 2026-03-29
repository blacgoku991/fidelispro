import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { motion } from "framer-motion";
import { Flame, Star, Crown, Trophy } from "lucide-react";

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

  return (
    <div
      className="min-h-screen flex flex-col items-center p-6 pt-12"
      style={{
        background: `linear-gradient(135deg, ${business.primary_color}10 0%, ${business.secondary_color}10 100%)`,
      }}
    >
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
          accentColor={business.primary_color}
        />

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
