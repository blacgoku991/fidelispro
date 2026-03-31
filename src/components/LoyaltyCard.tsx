import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Crown, Flame, Star, Trophy, Zap } from "lucide-react";

interface LoyaltyCardProps {
  businessName: string;
  customerName: string;
  points: number;
  maxPoints: number;
  level: "bronze" | "silver" | "gold";
  cardId: string;
  logoUrl?: string;
  accentColor?: string;
  secondaryColor?: string;
  rewardDescription?: string;
  rewardsEarned?: number;
  promoText?: string;
  showQr?: boolean;
  showPoints?: boolean;
  showCustomerName?: boolean;
  showExpiration?: boolean;
  showRewardsPreview?: boolean;
  cardStyle?: string;
  cardBgType?: string;
  cardBgImageUrl?: string;
}

const levelConfig = {
  bronze: {
    icon: Star,
    label: "BRONZE",
    emoji: "🥉",
    fallbackGradient: "135deg, #92400E 0%, #78350F 50%, #451a03 100%",
    accentLight: "rgba(251,191,36,0.25)",
  },
  silver: {
    icon: Crown,
    label: "SILVER",
    emoji: "🥈",
    fallbackGradient: "135deg, #475569 0%, #334155 50%, #1e293b 100%",
    accentLight: "rgba(148,163,184,0.25)",
  },
  gold: {
    icon: Crown,
    label: "GOLD",
    emoji: "⭐",
    fallbackGradient: "135deg, #b45309 0%, #92400e 50%, #78350f 100%",
    accentLight: "rgba(251,191,36,0.3)",
  },
};

// Card style presets
const stylePresets: Record<string, {
  borderRadius: string;
  overlay?: string;
  badgeStyle?: string;
  glowEffect?: boolean;
  pattern?: string;
}> = {
  classic: { borderRadius: "rounded-2xl" },
  luxury: {
    borderRadius: "rounded-3xl",
    overlay: "bg-gradient-to-br from-yellow-400/10 via-transparent to-yellow-600/10",
    badgeStyle: "bg-yellow-500/20 border border-yellow-400/30",
    pattern: "radial-gradient(circle at 15% 85%, rgba(255,215,0,0.12) 0%, transparent 50%), radial-gradient(circle at 85% 15%, rgba(255,215,0,0.08) 0%, transparent 50%)",
  },
  coffee: {
    borderRadius: "rounded-2xl",
    overlay: "bg-gradient-to-br from-amber-900/20 via-transparent to-orange-900/10",
    pattern: "radial-gradient(circle at 90% 90%, rgba(180,100,20,0.15) 0%, transparent 40%)",
  },
  barber: {
    borderRadius: "rounded-xl",
    overlay: "bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10",
    pattern: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 40px)",
  },
  restaurant: {
    borderRadius: "rounded-2xl",
    overlay: "bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/10",
    pattern: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 50%)",
  },
  neon: {
    borderRadius: "rounded-2xl",
    glowEffect: true,
    overlay: "bg-gradient-to-br from-purple-500/15 via-transparent to-pink-500/15",
    pattern: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.04) 100%)",
  },
};

export function LoyaltyCard({
  businessName,
  customerName,
  points,
  maxPoints,
  level,
  cardId,
  logoUrl,
  accentColor,
  secondaryColor,
  rewardDescription,
  rewardsEarned = 0,
  promoText,
  showQr = true,
  showPoints = true,
  showCustomerName = true,
  showExpiration = false,
  showRewardsPreview = true,
  cardStyle = "classic",
  cardBgType = "gradient",
  cardBgImageUrl,
}: LoyaltyCardProps) {
  const config = levelConfig[level] || levelConfig.bronze;
  const Icon = config.icon;
  const progress = Math.min((points / maxPoints) * 100, 100);
  const pointsToReward = maxPoints - points;
  const preset = stylePresets[cardStyle] || stylePresets.classic;

  // Background
  const getBgStyle = () => {
    if (cardBgType === "image" && cardBgImageUrl) {
      return { backgroundImage: `url(${cardBgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
    }
    if (cardBgType === "solid" && accentColor) {
      return { background: accentColor };
    }
    if (accentColor) {
      return {
        background: secondaryColor
          ? `linear-gradient(${config.fallbackGradient.split(",")[0].replace("135deg", "150deg")}, ${accentColor}, ${secondaryColor})`
          : `linear-gradient(150deg, ${accentColor}, ${darken(accentColor, 40)})`,
      };
    }
    return { background: `linear-gradient(${config.fallbackGradient})` };
  };

  const glowShadow = preset.glowEffect && accentColor
    ? `0 0 30px ${accentColor}44, 0 0 60px ${accentColor}22, 0 20px 40px -8px rgba(0,0,0,0.5)`
    : "0 20px 40px -8px rgba(0,0,0,0.45), 0 8px 20px -4px rgba(0,0,0,0.3)";

  return (
    <motion.div
      className={`relative w-full max-w-[400px] ${preset.borderRadius} overflow-hidden cursor-pointer select-none card-shine`}
      style={{
        ...getBgStyle(),
        aspectRatio: "1.586 / 1",
        boxShadow: glowShadow,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.025, rotateY: 3, rotateX: -1.5 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
    >
      {/* Pattern overlay */}
      {preset.pattern && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: preset.pattern }} />
      )}

      {/* Diagonal texture (Apple Wallet style) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
          backgroundSize: "8px 8px",
        }}
      />

      {/* Color overlay */}
      {preset.overlay && (
        <div className={`absolute inset-0 ${preset.overlay} pointer-events-none`} />
      )}

      {/* Image overlay for readability */}
      {cardBgType === "image" && cardBgImageUrl && (
        <div className="absolute inset-0 bg-black/45 pointer-events-none" />
      )}

      {/* Neon border glow */}
      {preset.glowEffect && accentColor && (
        <div className="absolute inset-0 pointer-events-none" style={{
          border: `1px solid ${accentColor}55`,
          boxShadow: `inset 0 0 24px ${accentColor}12`,
          borderRadius: "inherit",
        }} />
      )}

      {/* Subtle top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
      />

      {/* ── CONTENT ── */}
      <div className="relative z-10 h-full flex flex-col p-5">

        {/* HEADER: Logo + business name + level badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-white/10">
                <img src={logoUrl} alt={businessName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 shrink-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{(businessName || "?")[0].toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-display font-bold text-white tracking-tight leading-tight truncate">{businessName}</h3>
              {showCustomerName && customerName && (
                <p className="text-[11px] text-white/65 mt-0.5 truncate">{customerName}</p>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm shrink-0 ${preset.badgeStyle || "bg-white/15 border border-white/10"}`}>
            <span className="text-[11px]">{config.emoji}</span>
            <span className="text-[10px] font-bold text-white tracking-widest">{config.label}</span>
          </div>
        </div>

        {/* MIDDLE: Customer name large (Apple Wallet style) */}
        {showCustomerName && customerName && (
          <div className="mt-3">
            <p className="text-[10px] text-white/45 uppercase tracking-widest font-medium mb-0.5">Client</p>
            <p className="text-2xl font-display font-bold text-white tracking-tight leading-none truncate">
              {customerName}
            </p>
          </div>
        )}

        {/* PROMO text (Offre du jour) */}
        {promoText && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 inline-block self-start">
            <p className="text-[11px] text-white/90 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-300" />
              {promoText}
            </p>
          </div>
        )}

        {/* SPACER */}
        <div className="flex-1" />

        {/* BOTTOM SECTION */}
        <div>
          {/* Stats row */}
          <div className="flex items-end justify-between mb-3">
            <div className="flex gap-4">
              {showPoints && (
                <div>
                  <p className="text-[9px] text-white/45 uppercase tracking-widest font-medium">Points</p>
                  <p className="text-2xl font-display font-bold text-white leading-none">{points}</p>
                </div>
              )}
              {showRewardsPreview && (
                <div>
                  <p className="text-[9px] text-white/45 uppercase tracking-widest font-medium">Prochaine</p>
                  <p className="text-sm font-bold text-white/90 leading-none mt-0.5">
                    {pointsToReward > 0 ? `−${pointsToReward} pts` : <span className="text-yellow-300">🎁 Dispo !</span>}
                  </p>
                </div>
              )}
              {rewardsEarned > 0 && showRewardsPreview && (
                <div>
                  <p className="text-[9px] text-white/45 uppercase tracking-widest font-medium">Obtenues</p>
                  <p className="text-sm font-bold text-white/90 leading-none mt-0.5">{rewardsEarned} <Trophy className="w-3 h-3 inline" /></p>
                </div>
              )}
              {showExpiration && (
                <div>
                  <p className="text-[9px] text-white/45 uppercase tracking-widest font-medium">Expire</p>
                  <p className="text-sm font-bold text-white/90 leading-none mt-0.5">31/12/26</p>
                </div>
              )}
            </div>

            {/* QR Code */}
            {showQr && cardId && (
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-lg shrink-0">
                <QRCodeSVG
                  value={cardId}
                  size={42}
                  bgColor="white"
                  fgColor="#1a1a2e"
                  level="M"
                />
              </div>
            )}
          </div>

          {/* Progress bar */}
          {showPoints && (
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: preset.glowEffect && accentColor
                      ? `linear-gradient(90deg, ${accentColor}, ${secondaryColor || "#fff"})`
                      : "linear-gradient(90deg, rgba(255,255,255,0.7), rgba(255,255,255,0.95))",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              {progress >= 80 && pointsToReward > 0 && (
                <p className="text-[10px] text-white/60 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-300" /> Plus que {pointsToReward} point{pointsToReward > 1 ? "s" : ""} !
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function darken(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = Math.max(0, parseInt(clean.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(clean.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(clean.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
