import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsChartProps {
  businessId: string;
  type: "scans" | "customers";
}

export function AnalyticsChart({ businessId, type }: AnalyticsChartProps) {
  const [data, setData] = useState<{ date: string; count: number }[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const days = 14;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      const startStr = startDate.toISOString().split("T")[0];

      const table = type === "scans" ? "points_history" : "customers";
      const { data: rows } = await supabase
        .from(table)
        .select("created_at")
        .eq("business_id", businessId)
        .gte("created_at", startStr);

      // Build day map
      const dayMap: Record<string, number> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split("T")[0]] = 0;
      }

      (rows || []).forEach((r) => {
        const dayKey = new Date(r.created_at).toISOString().split("T")[0];
        if (dayMap[dayKey] !== undefined) dayMap[dayKey]++;
      });

      const results = Object.entries(dayMap).map(([dateStr, count]) => ({
        date: new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        count,
      }));

      setData(results);
    };
    fetchData();
  }, [businessId, type]);

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      {type === "scans" ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Scans" />
        </BarChart>
      ) : (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" name="Nouveaux clients" />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
