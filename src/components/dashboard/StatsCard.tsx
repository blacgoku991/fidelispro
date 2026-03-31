import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

const gradients = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
];

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  index?: number;
  tooltip?: string;
}

export function StatsCard({ label, value, icon: Icon, change, index = 0, tooltip }: StatsCardProps) {
  const gradient = gradients[index % gradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="group relative overflow-hidden p-5 rounded-2xl bg-card border border-border/40 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/15 hover:-translate-y-1 transition-all duration-300"
    >
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] group-hover:opacity-[0.14] transition-opacity`} />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          {change && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">{change}</span>
          )}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <p className="text-2xl font-display font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
    </motion.div>
  );
}
