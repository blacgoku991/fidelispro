import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Crown, Flame, Star } from "lucide-react";

interface LoyaltyCardProps {
  businessName: string;
  customerName: string;
  points: number;
  maxPoints: number;
  level: "bronze" | "silver" | "gold";
  cardId: string;
  logoUrl?: string;
  accentColor?: string;
}

const levelConfig = {
  bronze: {
    gradient: "from-amber-700 via-amber-800 to-amber-900",
    icon: Star,
    label: "Bronze",
    textColor: "text-amber-200",
  },
  silver: {
    gradient: "from-slate-400 via-slate-300 to-slate-500",
    icon: Crown,
    label: "Silver",
    textColor: "text-slate-700",
  },
  gold: {
    gradient: "from-yellow-500 via-amber-400 to-yellow-600",
    icon: Crown,
    label: "Gold",
    textColor: "text-amber-900",
  },
};

export function LoyaltyCard({
  businessName,
  customerName,
  points,
  maxPoints,
  level,
  cardId,
  accentColor,
}: LoyaltyCardProps) {
  const config = levelConfig[level];
  const Icon = config.icon;
  const progress = Math.min((points / maxPoints) * 100, 100);

  return (
    <motion.div
      className={`relative w-full max-w-[400px] aspect-[1.586/1] rounded-2xl bg-gradient-to-br ${config.gradient} p-6 card-shine cursor-pointer select-none`}
      whileHover={{ scale: 1.02, rotateY: 5, rotateX: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      style={{
        transformStyle: "preserve-3d",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
      }}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 rounded-2xl opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />

      {/* Top section */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-display font-bold text-primary-foreground tracking-tight">
            {businessName}
          </h3>
          <p className={`text-xs mt-0.5 ${config.textColor} opacity-80`}>{customerName}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass">
          <Icon className="w-3.5 h-3.5 text-primary-foreground" />
          <span className="text-xs font-semibold text-primary-foreground">{config.label}</span>
        </div>
      </div>

      {/* Points */}
      <div className="relative z-10 mt-auto pt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className={`text-xs ${config.textColor} opacity-70 uppercase tracking-wider`}>Points</p>
            <p className="text-3xl font-display font-bold text-primary-foreground">
              {points}
              <span className="text-base font-normal opacity-50">/{maxPoints}</span>
            </p>
          </div>
          <div className="w-16 h-16 rounded-xl glass-strong flex items-center justify-center p-1">
            <QRCodeSVG
              value={cardId}
              size={52}
              bgColor="transparent"
              fgColor="rgba(255,255,255,0.9)"
              level="M"
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary-foreground/80"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
        {progress >= 80 && (
          <p className="text-xs mt-1 text-primary-foreground/70 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Plus que {maxPoints - points} points !
          </p>
        )}
      </div>
    </motion.div>
  );
}
