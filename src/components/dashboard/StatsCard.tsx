import { motion } from "framer-motion";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  index?: number;
}

export function StatsCard({ label, value, icon: Icon, change, index = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-5 rounded-2xl bg-card border border-border/50 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        {change && (
          <span className="text-xs text-emerald-600 font-medium">{change}</span>
        )}
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}
