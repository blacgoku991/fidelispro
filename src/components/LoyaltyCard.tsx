import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Crown, Flame, Star, Trophy } from "lucide-react";

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
  showQr?: boolean;
  showPoints?: boolean;
  showCustomerName?: boolean;
}

const levelConfig = {
  bronze: {
    icon: Star,
    label: "BRONZE",
    emoji: "🥉",
    fallbackBg: "linear-gradient(135deg, #92400E, #78350F)",
  },
  silver: {
    icon: Crown,
    label: "SILVER",
    emoji: "🥈",
    fallbackBg: "linear-gradient(135deg, #64748B, #475569)",
  },
  gold: {
    icon: Crown,
    label: "GOLD",
    emoji: "⭐",
    fallbackBg: "linear-gradient(135deg, #B48214, #92400E)",
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
  showQr = true,
  showPoints = true,
  showCustomerName = true,
}: LoyaltyCardProps) {
  const config = levelConfig[level] || levelConfig.bronze;
  const Icon = config.icon;
  const progress = Math.min((points / maxPoints) * 100, 100);
  const pointsToReward = maxPoints - points;

  // Use business colors when provided, otherwise fall back to level-based
  const bgStyle = accentColor
    ? {
        background: secondaryColor
          ? `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`
          : `linear-gradient(135deg, ${accentColor}, ${darken(accentColor, 30)})`,
      }
    : { background: config.fallbackBg };

  return (
    <motion.div
      className="relative w-full max-w-[400px] aspect-[1.586/1] rounded-2xl p-5 card-shine cursor-pointer select-none overflow-hidden"
      whileHover={{ scale: 1.02, rotateY: 5, rotateX: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      style={{
        ...bgStyle,
        transformStyle: "preserve-3d",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
      }}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 rounded-2xl opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />

      {/* Header — logo + business name + level badge */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="w-10 h-10 rounded-xl object-cover border border-white/20"
            />
          ) : null}
          <div>
            <h3 className="text-base font-display font-bold text-white tracking-tight leading-tight">
              {businessName}
            </h3>
            {showCustomerName && customerName && (
              <p className="text-[11px] text-white/70 mt-0.5">{customerName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm">
          <span className="text-xs">{config.emoji}</span>
          <span className="text-[11px] font-bold text-white tracking-wide">{config.label}</span>
        </div>
      </div>

      {/* Middle — Stats row matching Wallet secondaryFields */}
      <div className="relative z-10 mt-3 flex justify-between">
        <div>
          <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Statut</p>
          <p className="text-sm font-semibold text-white">{config.emoji} {config.label}</p>
        </div>
        {showPoints && (
          <div className="text-right">
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Progression</p>
            <p className="text-sm font-semibold text-white">{points} / {maxPoints}</p>
          </div>
        )}
      </div>

      {/* Bottom — Points + QR + progress (matching Wallet layout) */}
      <div className="relative z-10 mt-auto pt-2">
        <div className="flex items-end justify-between">
          <div>
            {showPoints && (
              <>
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Points</p>
                <p className="text-3xl font-display font-bold text-white leading-none">
                  {points}
                </p>
              </>
            )}
            {/* Auxiliary info */}
            <div className="flex gap-4 mt-1.5">
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-wider">Récompenses</p>
                <p className="text-xs font-semibold text-white/80">{rewardsEarned} obtenues</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-wider">Prochaine</p>
                <p className="text-xs font-semibold text-white/80">
                  {pointsToReward > 0 ? `${pointsToReward} pts` : "🎁 Dispo !"}
                </p>
              </div>
            </div>
          </div>
          {showQr && cardId && (
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center p-1">
              <QRCodeSVG
                value={cardId}
                size={44}
                bgColor="transparent"
                fgColor="rgba(255,255,255,0.9)"
                level="M"
              />
            </div>
          )}
        </div>

        {/* Progress bar */}
        {showPoints && (
          <div className="mt-2.5 w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white/80"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        )}
        {progress >= 80 && pointsToReward > 0 && (
          <p className="text-[11px] mt-1 text-white/60 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Plus que {pointsToReward} points !
          </p>
        )}
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
