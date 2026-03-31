import { motion } from "framer-motion";
import { Heart, TrendingUp, Lightbulb } from "lucide-react";

interface ProgramHealthScoreProps {
  totalClients: number;
  returnRate: number;
  rewardsGiven: number;
  hasCustomized: boolean;
  hasCampaign: boolean;
}

function getScore(props: ProgramHealthScoreProps) {
  let score = 0;
  // Return rate (0-40 pts)
  score += Math.min(40, Math.round((props.returnRate / 100) * 40));
  // Clients (0-20 pts)
  score += Math.min(20, Math.round((props.totalClients / 100) * 20));
  // Rewards given (0-20 pts)
  score += Math.min(20, Math.round((props.rewardsGiven / 50) * 20));
  // Customized (10 pts)
  if (props.hasCustomized) score += 10;
  // Has campaign (10 pts)
  if (props.hasCampaign) score += 10;
  return Math.min(100, score);
}

function getLabel(score: number) {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-500" };
  if (score >= 60) return { label: "Bon", color: "text-blue-600", bg: "bg-blue-500" };
  if (score >= 40) return { label: "À améliorer", color: "text-amber-600", bg: "bg-amber-500" };
  return { label: "Débutant", color: "text-red-500", bg: "bg-red-500" };
}

function getTips(props: ProgramHealthScoreProps): string[] {
  const tips: string[] = [];
  if (props.returnRate < 30) tips.push("Envoyez une campagne de rappel aux clients inactifs (+30j)");
  if (!props.hasCustomized) tips.push("Personnalisez votre carte pour renforcer votre image de marque");
  if (!props.hasCampaign) tips.push("Créez votre première campagne de notification push");
  if (props.rewardsGiven === 0) tips.push("Configurez une récompense attractive pour fidéliser vos clients");
  if (props.totalClients < 10) tips.push("Ajoutez vos premiers clients via le scanner QR");
  return tips.slice(0, 3);
}

export function ProgramHealthScore(props: ProgramHealthScoreProps) {
  const score = getScore(props);
  const { label, color, bg } = getLabel(score);
  const tips = getTips(props);

  return (
    <div className="bg-card rounded-2xl border border-border/40 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-4 h-4 text-rose-500" />
        <h3 className="font-display font-bold text-base">Score de santé</h3>
        <span className={`ml-auto text-sm font-bold ${color}`}>{label}</span>
      </div>

      {/* Score bar */}
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Programme de fidélité</span>
        <span className={`font-bold ${color}`}>{score}/100</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-5">
        <motion.div
          className={`h-full rounded-full ${bg}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Conseils pour progresser
          </p>
          {tips.map((tip, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-2.5 text-xs text-muted-foreground"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              {tip}
            </motion.div>
          ))}
        </div>
      )}

      {score >= 80 && (
        <div className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1.5">
          🎉 Félicitations ! Votre programme est très performant.
        </div>
      )}
    </div>
  );
}
