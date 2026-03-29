import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

interface AnalyticsChartProps {
  businessId: string;
  type: "scans" | "customers";
}

export function AnalyticsChart({ businessId, type }: AnalyticsChartProps) {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const days = 14;
      const results: { date: string; count: number }[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const nextDate = new Date(d);
        nextDate.setDate(nextDate.getDate() + 1);

        if (type === "scans") {
          const { count } = await supabase
            .from("points_history")
            .select("*", { count: "exact", head: true })
            .eq("business_id", businessId)
            .gte("created_at", dateStr)
            .lt("created_at", nextDate.toISOString().split("T")[0]);
          results.push({ date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), count: count || 0 });
        } else {
          const { count } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("business_id", businessId)
            .gte("created_at", dateStr)
            .lt("created_at", nextDate.toISOString().split("T")[0]);
          results.push({ date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), count: count || 0 });
        }
      }
      setData(results);
    };
    fetchData();
  }, [businessId, type]);

  if (data.length === 0) return null;

  const ChartComponent = type === "scans" ? BarChart : AreaChart;

  return (
    <ResponsiveContainer width="100%" height={200}>
      {type === "scans" ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Scans" />
        </BarChart>
      ) : (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" name="Nouveaux clients" />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
