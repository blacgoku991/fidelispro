import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { QrCode, Gift, UserPlus, Clock } from "lucide-react";

interface ActivityEvent {
  id: string;
  type: "scan" | "reward" | "new_client";
  label: string;
  sub: string;
  time: string;
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

const eventIcon = {
  scan: QrCode,
  reward: Gift,
  new_client: UserPlus,
};

const eventColor = {
  scan: "text-violet-500 bg-violet-50 dark:bg-violet-950/30",
  reward: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  new_client: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
};

interface RecentActivityWidgetProps {
  businessId: string;
}

export function RecentActivityWidget({ businessId }: RecentActivityWidgetProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    loadActivity();
  }, [businessId]);

  const loadActivity = async () => {
    setLoading(true);
    // Fetch last 5 point scans
    const { data: scans } = await supabase
      .from("points_history")
      .select("id, created_at, customer_id, points, customers(name)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch last 3 new customers
    const { data: newClients } = await supabase
      .from("customers")
      .select("id, name, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(3);

    const result: ActivityEvent[] = [];

    (scans || []).forEach((s: any) => {
      const customerName = s.customers?.name || "Client";
      const isReward = (s.points || 0) < 0;
      result.push({
        id: `scan-${s.id}`,
        type: isReward ? "reward" : "scan",
        label: isReward
          ? `Récompense utilisée par ${customerName}`
          : `Scan de ${customerName}`,
        sub: isReward ? `${Math.abs(s.points)} pts déduits` : `+${s.points} pt`,
        time: s.created_at,
      });
    });

    (newClients || []).forEach((c: any) => {
      result.push({
        id: `client-${c.id}`,
        type: "new_client",
        label: `Nouveau client : ${c.name}`,
        sub: "Carte créée",
        time: c.created_at,
      });
    });

    // Sort by date desc, take top 5
    result.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setEvents(result.slice(0, 5));
    setLoading(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/40 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Activité récente
        </h3>
        <span className="text-xs text-muted-foreground">5 derniers événements</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucune activité encore. Commencez à scanner des clients !
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => {
            const Icon = eventIcon[event.type];
            const colorClass = eventColor[event.type];
            return (
              <motion.div
                key={event.id}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.sub}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{relativeTime(event.time)}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
