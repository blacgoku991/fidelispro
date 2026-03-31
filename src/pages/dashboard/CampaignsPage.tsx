import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Send, Users, Zap, Clock, Crown, Megaphone, Plus, Pencil,
  CheckCircle, XCircle, Bell, Trash2, MapPin, Filter, Eye,
  Star, SlidersHorizontal, Target, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  campaignTemplates, campaignCategories, type CampaignTemplate,
} from "@/lib/campaignTemplates";

type Segment = "all" | "active" | "inactive" | "vip" | "close_to_reward" | "nearby";

const segmentLabels: Record<Segment, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  all: { label: "Tous", desc: "Tous les clients sans filtre", icon: Users, color: "from-slate-500 to-slate-600" },
  active: { label: "Actifs", desc: "Visite dans les 7 derniers jours", icon: Zap, color: "from-emerald-500 to-teal-500" },
  inactive: { label: "Inactifs", desc: "Aucune visite depuis 30+ jours", icon: Clock, color: "from-amber-500 to-orange-500" },
  vip: { label: "VIP", desc: "Clients niveau Gold", icon: Crown, color: "from-yellow-500 to-amber-500" },
  close_to_reward: { label: "Proches récompense", desc: "À 2 points ou moins", icon: Target, color: "from-violet-500 to-purple-500" },
  nearby: { label: "À proximité", desc: "Via Apple Wallet uniquement", icon: MapPin, color: "from-blue-500 to-cyan-500" },
};

// Advanced filter state
interface AdvancedFilter {
  level: "all" | "bronze" | "silver" | "gold";
  inactiveDays: number; // 0 = all, otherwise "inactive since X days"
  minPoints: number;
  maxPoints: number;
  city: string;
}

const defaultAdvancedFilter: AdvancedFilter = {
  level: "all",
  inactiveDays: 0,
  minPoints: 0,
  maxPoints: 999,
  city: "",
};

const MAX_MESSAGE_LENGTH = 100;
type HistoryFilter = "all" | "sent" | "failed" | "read";

const CampaignsPage = () => {
  const { business } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [channelCounts, setChannelCounts] = useState({ wallet: 0 });
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [form, setForm] = useState({ message: "", segment: "all" as Segment });
  const [targetingMode, setTargetingMode] = useState<"segment" | "advanced">("segment");
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter>(defaultAdvancedFilter);
  const [advancedCount, setAdvancedCount] = useState(0);

  const businessName = business?.name || "Mon Commerce";

  useEffect(() => {
    if (!business) return;
    fetchCampaigns();
    fetchSegmentCounts();
    fetchChannelCounts();
    fetchAllCustomers();
  }, [business]);

  const fetchAllCustomers = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("customers")
      .select("id, last_visit_at, level, created_at, city, customer_cards(current_points, max_points)")
      .eq("business_id", business.id);
    if (data) setAllCustomers(data);
  };

  const fetchChannelCounts = async () => {
    if (!business) return;
    const { count } = await supabase.from("wallet_registrations").select("id", { count: "exact", head: true }).eq("business_id", business.id);
    setChannelCounts({ wallet: count || 0 });
  };

  const fetchCampaigns = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("notifications_log")
      .select("*")
      .eq("business_id", business.id)
      .order("sent_at", { ascending: false })
      .limit(100);
    if (data) setCampaigns(data);
  };

  const fetchSegmentCounts = async () => {
    if (!business) return;
    const { data: customers } = await supabase
      .from("customers")
      .select("id, last_visit_at, level, created_at, customer_cards(current_points, max_points)")
      .eq("business_id", business.id);
    if (!customers) return;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const { count: nearbyCount } = await supabase
      .from("customer_locations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("is_nearby", true);
    setSegmentCounts({
      all: customers.length,
      active: customers.filter(c => {
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        return (lv && lv > sevenDaysAgo) || new Date(c.created_at) > sevenDaysAgo;
      }).length,
      inactive: customers.filter(c => {
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        return (!lv && new Date(c.created_at) < thirtyDaysAgo) || (lv && lv < thirtyDaysAgo);
      }).length,
      vip: customers.filter(c => c.level === "gold").length,
      close_to_reward: customers.filter(c => {
        const card = c.customer_cards?.[0];
        return card && (card.max_points - card.current_points) <= 2;
      }).length,
      nearby: nearbyCount || 0,
    });
  };

  // Compute advanced filter count from cached customers
  const computeAdvancedCount = useCallback((filter: AdvancedFilter, customers: any[]) => {
    const now = new Date();
    return customers.filter(c => {
      // Level filter
      if (filter.level !== "all" && c.level !== filter.level) return false;
      // Inactive since X days
      if (filter.inactiveDays > 0) {
        const threshold = new Date(now.getTime() - filter.inactiveDays * 86400000);
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        if (lv && lv >= threshold) return false;
        if (!lv && new Date(c.created_at) >= threshold) return false;
      }
      // Points range
      const card = c.customer_cards?.[0];
      const pts = card?.current_points ?? 0;
      if (pts < filter.minPoints || pts > filter.maxPoints) return false;
      // City filter
      if (filter.city.trim()) {
        const customerCity = (c.city || "").toLowerCase();
        if (!customerCity.includes(filter.city.trim().toLowerCase())) return false;
      }
      return true;
    }).length;
  }, []);

  useEffect(() => {
    if (targetingMode === "advanced") {
      setAdvancedCount(computeAdvancedCount(advancedFilter, allCustomers));
    }
  }, [advancedFilter, allCustomers, targetingMode, computeAdvancedCount]);

  const getTargetCustomers = async (segment: Segment): Promise<{ id: string }[]> => {
    if (!business) return [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    if (segment === "active") {
      const { data: visited } = await supabase.from("customers").select("id").eq("business_id", business.id).gte("last_visit_at", sevenDaysAgo);
      const { data: recent } = await supabase.from("customers").select("id").eq("business_id", business.id).is("last_visit_at", null).gte("created_at", sevenDaysAgo);
      const ids = new Set([...(visited || []).map(c => c.id), ...(recent || []).map(c => c.id)]);
      return Array.from(ids).map(id => ({ id }));
    } else if (segment === "inactive") {
      const { data } = await supabase.from("customers").select("id, last_visit_at, created_at").eq("business_id", business.id);
      return (data || []).filter(c => {
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        return (!lv && new Date(c.created_at) < new Date(thirtyDaysAgo)) || (lv && lv < new Date(thirtyDaysAgo));
      });
    } else if (segment === "vip") {
      const { data } = await supabase.from("customers").select("id").eq("business_id", business.id).eq("level", "gold");
      return data || [];
    } else if (segment === "nearby") {
      const { data } = await supabase.from("customer_locations").select("customer_id").eq("business_id", business.id).eq("is_nearby", true);
      return (data || []).map(l => ({ id: l.customer_id }));
    } else if (segment === "close_to_reward") {
      const { data } = await supabase.from("customers").select("id, customer_cards(current_points, max_points)").eq("business_id", business.id);
      return (data || []).filter((c: any) => {
        const card = c.customer_cards?.[0];
        return card && (card.max_points - card.current_points) <= 2;
      });
    }
    const { data } = await supabase.from("customers").select("id").eq("business_id", business.id);
    return data || [];
  };

  const getAdvancedTargetCustomers = (): { id: string }[] => {
    const now = new Date();
    return allCustomers.filter(c => {
      if (advancedFilter.level !== "all" && c.level !== advancedFilter.level) return false;
      if (advancedFilter.inactiveDays > 0) {
        const threshold = new Date(now.getTime() - advancedFilter.inactiveDays * 86400000);
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        if (lv && lv >= threshold) return false;
        if (!lv && new Date(c.created_at) >= threshold) return false;
      }
      const card = c.customer_cards?.[0];
      const pts = card?.current_points ?? 0;
      if (pts < advancedFilter.minPoints || pts > advancedFilter.maxPoints) return false;
      if (advancedFilter.city.trim()) {
        const cc = (c.city || "").toLowerCase();
        if (!cc.includes(advancedFilter.city.trim().toLowerCase())) return false;
      }
      return true;
    }).map(c => ({ id: c.id }));
  };

  const openTemplate = (template: CampaignTemplate) => {
    const msg = template.defaultMessage.replace(/\{businessName\}/g, businessName);
    setSelectedTemplate(template);
    setForm({ message: msg, segment: template.suggestedSegment as Segment });
    setTargetingMode("segment");
    setDialogOpen(true);
  };

  const openCustom = () => {
    setSelectedTemplate(null);
    setForm({ message: "", segment: "all" });
    setTargetingMode("segment");
    setAdvancedFilter(defaultAdvancedFilter);
    setDialogOpen(true);
  };

  const handleSend = async () => {
    if (!form.message.trim() || !business) { toast.error("Écrivez un message"); return; }
    setSending(true);

    const customers = targetingMode === "advanced"
      ? getAdvancedTargetCustomers()
      : await getTargetCustomers(form.segment);

    if (customers.length === 0) { toast.error("Aucun client dans ce segment"); setSending(false); return; }

    const segmentLabel = targetingMode === "advanced" ? "custom_advanced" : form.segment;
    const logs = customers.map(c => ({
      business_id: business.id,
      customer_id: c.id,
      title: business.name,
      message: form.message.trim(),
      type: "custom" as const,
      segment: segmentLabel,
      delivery_status: "sent",
    }));

    const { error } = await supabase.from("notifications_log").insert(logs);
    if (error) { toast.error("Erreur d'envoi"); setSending(false); return; }

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          title: business.name,
          message: form.message.trim(),
          segment: segmentLabel,
          channels: { web_push: false, apple_wallet: true },
        }),
      });
      const result = await res.json();
      const walletCount = result.wallet || 0;
      toast.success(`✅ Envoyé à ${customers.length} client(s) — ${walletCount} appareil(s) Wallet`);
    } catch {
      toast.success(`✅ Campagne enregistrée pour ${customers.length} client(s)`);
    }

    setDialogOpen(false);
    setForm({ message: "", segment: "all" });
    setAdvancedFilter(defaultAdvancedFilter);
    fetchCampaigns();
    setSending(false);
  };

  const filteredTemplates = activeCategory === "all"
    ? campaignTemplates
    : campaignTemplates.filter(t => t.category === activeCategory);

  // Group + deduplicate campaigns
  const groupedCampaigns = campaigns.reduce((acc, c) => {
    const date = new Date(c.sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const campaignSummaries = Object.entries(groupedCampaigns).map(([date, logs]: [string, any[]]) => {
    const byMessage: Record<string, any[]> = {};
    logs.forEach(l => {
      if (!byMessage[l.message]) byMessage[l.message] = [];
      byMessage[l.message].push(l);
    });
    return {
      date, campaigns: Object.entries(byMessage).map(([msg, items]) => ({
        message: msg,
        segment: items[0].segment,
        sent_at: items[0].sent_at,
        recipients: items.length,
        delivered: items.filter((i: any) => ["sent", "delivered"].includes(i.delivery_status)).length,
        failed: items.filter((i: any) => i.delivery_status === "failed").length,
        read: items.filter((i: any) => i.read_at).length,
        ids: items.map((i: any) => i.id),
      }))
    };
  });

  const filteredSummaries = historyFilter === "all"
    ? campaignSummaries
    : campaignSummaries.map(g => ({
        ...g,
        campaigns: g.campaigns.filter(c =>
          historyFilter === "sent" ? c.delivered > 0 :
          historyFilter === "failed" ? c.failed > 0 :
          historyFilter === "read" ? c.read > 0 : true
        )
      })).filter(g => g.campaigns.length > 0);

  // KPI stats for header
  const totalSent = campaigns.length;
  const totalRead = campaigns.filter(c => c.read_at).length;
  const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

  const currentCount = targetingMode === "advanced" ? advancedCount : (segmentCounts[form.segment] || 0);

  return (
    <DashboardLayout
      title="Campagnes"
      subtitle="Envoyez des notifications ciblées à vos clients"
      headerAction={
        <Button onClick={openCustom} className="bg-gradient-primary text-primary-foreground rounded-xl gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nouvelle campagne
        </Button>
      }
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Campagnes envoyées", value: totalSent, icon: Send, color: "from-violet-500 to-purple-600" },
          { label: "Taux de lecture", value: `${readRate}%`, icon: Eye, color: "from-emerald-500 to-teal-500" },
          { label: "Wallets actifs", value: channelCounts.wallet, icon: Bell, color: "from-blue-500 to-cyan-500" },
          { label: "Clients total", value: segmentCounts.all || 0, icon: Users, color: "from-amber-500 to-orange-500" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="p-4 rounded-2xl bg-card border border-border/40 hover:shadow-sm transition-all"
            >
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Audience segments */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Audiences disponibles</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(Object.entries(segmentLabels) as [Segment, typeof segmentLabels.all][]).map(([key, val]) => {
            const Icon = val.icon;
            return (
              <button
                key={key}
                onClick={() => { setForm(f => ({ ...f, segment: key })); setTargetingMode("segment"); openCustom(); setForm(f => ({ ...f, segment: key })); }}
                className="group p-3 rounded-2xl bg-card border border-border/40 text-center hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${val.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xl font-display font-bold">{segmentCounts[key] ?? 0}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{val.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filter + templates */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modèles de messages</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {campaignCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border/60 hover:border-primary/30"
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openTemplate(t)}
              className="group p-4 rounded-2xl bg-card border border-border/40 text-left hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2.5">
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                    {segmentLabels[t.suggestedSegment as Segment]?.label}
                  </span>
                  <Send className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              </div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Campagnes automatiques */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Campagnes automatiques
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { emoji: "🎂", label: "Anniversaire", desc: "Envoyée automatiquement le jour J à vos clients dont la date est connue.", color: "from-pink-500 to-rose-600", settingsPath: "/dashboard/settings" },
            { emoji: "😴", label: "Inactivité 30 jours", desc: "Relance les clients qui n'ont pas visité depuis 30 jours.", color: "from-amber-500 to-orange-500", settingsPath: "/dashboard/settings" },
            { emoji: "🏆", label: "Palier atteint", desc: "Félicite le client quand il atteint son prochain niveau.", color: "from-violet-500 to-purple-600", settingsPath: "/dashboard/settings" },
          ].map((auto, i) => (
            <motion.a
              key={auto.label}
              href={auto.settingsPath}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="group p-4 rounded-2xl bg-card border border-border/40 hover:border-amber-500/30 hover:shadow-md transition-all flex gap-3 cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${auto.color} flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform`}>
                {auto.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm group-hover:text-amber-600 transition-colors">{auto.label}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{auto.desc}</p>
                <p className="text-[10px] text-amber-600 font-semibold mt-1.5">→ Configurer dans Paramètres</p>
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" /> Historique
          </h2>
          <div className="flex gap-1.5">
            {(["all", "sent", "failed", "read"] as HistoryFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                  historyFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {f === "all" ? "Tout" : f === "sent" ? "Envoyés" : f === "failed" ? "Échoués" : "Lus"}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredSummaries.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Megaphone className="w-8 h-8 opacity-30" />
              </div>
              <p className="text-sm font-medium">Aucune campagne</p>
              <p className="text-xs mt-1">Choisissez un modèle ci-dessus pour commencer</p>
            </div>
          ) : (
            filteredSummaries.map(({ date, campaigns: dayCampaigns }) => (
              <div key={date} className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">{date}</p>
                {dayCampaigns.map((c, i) => (
                  <motion.div
                    key={c.ids[0]}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.02 }}
                    className="p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/15 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate mb-2">"{c.message}"</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground font-medium">
                            <Users className="w-3 h-3" /> {c.recipients} destinataire{c.recipients > 1 ? "s" : ""}
                          </span>
                          {c.segment && segmentLabels[c.segment as Segment] && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium">
                              <Filter className="w-3 h-3" /> {segmentLabels[c.segment as Segment].label}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle className="w-3 h-3" /> {c.delivered} livré{c.delivered > 1 ? "s" : ""}
                          </span>
                          {c.failed > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium">
                              <XCircle className="w-3 h-3" /> {c.failed} échoué{c.failed > 1 ? "s" : ""}
                            </span>
                          )}
                          {c.read > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium">
                              <Eye className="w-3 h-3" /> {c.read} lu{c.read > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {new Date(c.sent_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => { setCampaigns(prev => prev.filter(x => !c.ids.includes(x.id))); toast.info("Archivé"); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* ═══ Send Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              {selectedTemplate ? (
                <><span className="text-2xl">{selectedTemplate.emoji}</span>{selectedTemplate.label}</>
              ) : (
                <><Pencil className="w-4 h-4" /> Nouvelle campagne</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-1">
            {/* Targeting mode tabs */}
            <Tabs value={targetingMode} onValueChange={(v) => setTargetingMode(v as "segment" | "advanced")}>
              <TabsList className="w-full rounded-xl h-9">
                <TabsTrigger value="segment" className="flex-1 rounded-lg text-xs gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Segments
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex-1 rounded-lg text-xs gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Ciblage avancé
                </TabsTrigger>
              </TabsList>

              {/* Segment mode */}
              <TabsContent value="segment" className="mt-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Audience</Label>
                <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as Segment })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(segmentLabels) as [Segment, typeof segmentLabels.all][]).map(([key, val]) => {
                      const Icon = val.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{val.label}</span>
                            <span className="ml-auto text-muted-foreground text-xs">({segmentCounts[key] || 0})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{segmentLabels[form.segment]?.desc}</p>
              </TabsContent>

              {/* Advanced targeting mode */}
              <TabsContent value="advanced" className="mt-3 space-y-4">
                {/* Level filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Niveau de fidélité</Label>
                  <div className="flex gap-2">
                    {(["all", "bronze", "silver", "gold"] as const).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setAdvancedFilter(f => ({ ...f, level: lvl }))}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          advancedFilter.level === lvl
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {lvl === "all" ? "Tous" : lvl === "bronze" ? "🥉" : lvl === "silver" ? "🥈" : "⭐"}
                        <span className="block text-[10px] mt-0.5 capitalize">{lvl === "all" ? "Tous" : lvl}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inactivity filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Inactifs depuis</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[0, 7, 14, 30, 60, 90].map(days => (
                      <button
                        key={days}
                        onClick={() => setAdvancedFilter(f => ({ ...f, inactiveDays: days }))}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                          advancedFilter.inactiveDays === days
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {days === 0 ? "Tous" : `${days}j+`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Points range */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Points ({advancedFilter.minPoints} — {advancedFilter.maxPoints === 999 ? "∞" : advancedFilter.maxPoints})
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        min={0}
                        value={advancedFilter.minPoints}
                        onChange={e => setAdvancedFilter(f => ({ ...f, minPoints: parseInt(e.target.value) || 0 }))}
                        className="rounded-xl h-9 text-xs"
                        placeholder="Min points"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min={0}
                        value={advancedFilter.maxPoints === 999 ? "" : advancedFilter.maxPoints}
                        onChange={e => setAdvancedFilter(f => ({ ...f, maxPoints: parseInt(e.target.value) || 999 }))}
                        className="rounded-xl h-9 text-xs"
                        placeholder="Max points (vide = ∞)"
                      />
                    </div>
                  </div>
                </div>

                {/* City filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Ville / Quartier</Label>
                  <Input
                    value={advancedFilter.city}
                    onChange={e => setAdvancedFilter(f => ({ ...f, city: e.target.value }))}
                    placeholder="Ex: Paris, Lyon, Montmartre..."
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Destinataires preview */}
            <div className={`rounded-xl p-3.5 border flex items-center gap-3 ${currentCount > 0 ? "bg-primary/5 border-primary/20" : "bg-secondary/50 border-border/40"}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${currentCount > 0 ? "bg-primary/10" : "bg-muted"}`}>
                <Target className={`w-4 h-4 ${currentCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className={`text-lg font-display font-bold ${currentCount > 0 ? "text-primary" : "text-muted-foreground"}`}>{currentCount} destinataire{currentCount > 1 ? "s" : ""}</p>
                <p className="text-[11px] text-muted-foreground">
                  {channelCounts.wallet} via Apple Wallet
                </p>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Message</Label>
                <span className={`text-[11px] tabular-nums ${form.message.length > MAX_MESSAGE_LENGTH ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  {form.message.length}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <Textarea
                value={form.message}
                onChange={(e) => { if (e.target.value.length <= MAX_MESSAGE_LENGTH) setForm({ ...form, message: e.target.value }); }}
                placeholder="Écrivez votre message ici… 100 caractères max"
                className="rounded-xl resize-none text-sm"
                rows={3}
              />
            </div>

            {/* iPhone lock screen preview */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Aperçu écran verrouillé iPhone</p>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                  <Eye className="w-3 h-3" /> Taux d'ouverture moyen estimé : 68%
                </span>
              </div>
              {/* iPhone mock */}
              <div className="relative mx-auto w-52">
                {/* Phone frame */}
                <div className="relative rounded-[2rem] border-[3px] border-foreground/20 overflow-hidden shadow-xl" style={{ background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)" }}>
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                    <span className="text-[9px] text-white/70 font-semibold">9:41</span>
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-4 rounded-full bg-black" />
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/70">●●●●</span>
                      <span className="text-[9px] text-white/70">WiFi</span>
                    </div>
                  </div>
                  {/* Time */}
                  <div className="text-center py-4 pb-3">
                    <p className="text-4xl font-bold text-white/90 leading-none">9:41</p>
                    <p className="text-[10px] text-white/60 mt-1">Mardi 31 mars</p>
                  </div>
                  {/* Notification bubble */}
                  <div className="mx-2 mb-4 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)" }}>
                    <div className="p-3 flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shrink-0 shadow-sm">
                        {business?.logo_url
                          ? <img src={business.logo_url} className="w-6 h-6 rounded-md object-cover" alt="" />
                          : <span className="text-[9px] font-bold text-white">{businessName.slice(0, 2).toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-white text-[10px] font-bold truncate">{businessName}</p>
                          <span className="text-white/50 text-[9px] shrink-0 ml-1">maintenant</span>
                        </div>
                        <p className="text-white/80 text-[10px] leading-relaxed mt-0.5 line-clamp-2">
                          {form.message || "Votre message apparaîtra ici…"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Home indicator */}
                  <div className="flex justify-center pb-2">
                    <div className="w-20 h-1 rounded-full bg-white/30" />
                  </div>
                </div>
              </div>
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={sending || !form.message.trim() || currentCount === 0}
              className="w-full bg-gradient-primary text-primary-foreground rounded-xl gap-2 h-12 font-semibold text-sm shadow-sm"
            >
              <Send className="w-4 h-4" />
              {sending ? "Envoi en cours…" : `Envoyer à ${currentCount} client${currentCount > 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CampaignsPage;
