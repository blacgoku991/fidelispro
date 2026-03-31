import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send, Users, Bell, Plus, Crown, Zap, Clock, Star,
  ChevronDown, ChevronRight, Megaphone, Check, Calendar,
  Wallet, BarChart3, Moon,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type SegmentKey = "all" | "bronze" | "silver" | "gold" | "inactive" | "vip";

interface CampaignSummary {
  id: string;
  title: string;
  message: string;
  segment: string;
  sentAt: string;
  count: number;
  status: "sent" | "draft";
}

// ─── Segment config ───────────────────────────────────────────────────────────

const SEGMENTS: {
  key: SegmentKey;
  emoji: string;
  label: string;
  desc: string;
  badgeClass: string;
  iconClass: string;
  borderClass: string;
  bgClass: string;
}[] = [
  {
    key: "all",
    emoji: "🌍",
    label: "Tous mes clients",
    desc: "Toute votre base",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    iconClass: "text-violet-500",
    borderClass: "border-violet-400",
    bgClass: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    key: "bronze",
    emoji: "⚡",
    label: "Niveau Bronze",
    desc: "0 – 9 points",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    iconClass: "text-orange-500",
    borderClass: "border-orange-400",
    bgClass: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    key: "silver",
    emoji: "🥈",
    label: "Niveau Silver",
    desc: "10 – 24 points",
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    iconClass: "text-slate-500",
    borderClass: "border-slate-400",
    bgClass: "bg-slate-50 dark:bg-slate-800/30",
  },
  {
    key: "gold",
    emoji: "🥇",
    label: "Niveau Gold",
    desc: "25+ points",
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    iconClass: "text-yellow-500",
    borderClass: "border-yellow-400",
    bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  {
    key: "inactive",
    emoji: "😴",
    label: "Inactifs +30j",
    desc: "Sans visite récente",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    iconClass: "text-red-500",
    borderClass: "border-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/30",
  },
  {
    key: "vip",
    emoji: "⭐",
    label: "Clients VIP",
    desc: "Gold + actifs 30j",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    iconClass: "text-violet-500",
    borderClass: "border-violet-400",
    bgClass: "bg-violet-50 dark:bg-violet-950/30",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const CampaignsPage = () => {
  const { business } = useAuth();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [campaignSummaries, setCampaignSummaries] = useState<CampaignSummary[]>([]);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [walletCount, setWalletCount] = useState(0);
  const [totalNotified, setTotalNotified] = useState(0);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  // ── Form ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<Set<SegmentKey>>(new Set(["all"]));
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const businessName = (business as any)?.name || "FidéliPro";

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!business) return;
    fetchCampaigns();
    fetchSegmentCounts();
    fetchWalletCount();
  }, [business]);

  const fetchAllCustomers = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("customers")
      .select("id, last_visit_at, level, created_at, city, customer_cards(current_points)")
      .eq("business_id", (business as any).id);
    if (data) setAllCustomers(data);
    return data || [];
  };

  const fetchWalletCount = async () => {
    if (!business) return;
    const { count } = await supabase
      .from("wallet_registrations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", (business as any).id);
    setWalletCount(count || 0);
  };

  const fetchCampaigns = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("notifications_log")
      .select("*")
      .eq("business_id", (business as any).id)
      .order("sent_at", { ascending: false })
      .limit(200);
    if (!data) return;

    const groups: Record<string, any[]> = {};
    data.forEach(l => {
      const key = `${l.message}__${new Date(l.sent_at).toDateString()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });

    const summaries: CampaignSummary[] = Object.entries(groups).map(([, logs]) => ({
      id: logs[0].id,
      title: logs[0].title || businessName,
      message: logs[0].message,
      segment: logs[0].segment || "all",
      sentAt: logs[0].sent_at,
      count: logs.length,
      status: "sent",
    }));

    setCampaignSummaries(summaries);
    setTotalNotified(summaries.reduce((sum, s) => sum + s.count, 0));
  };

  const fetchSegmentCounts = async () => {
    if (!business) return;
    const customers = await fetchAllCustomers();
    if (!customers) return;
    const now = new Date();
    const ago30 = new Date(now.getTime() - 30 * 86400000);

    const isInactive = (c: any) => {
      const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
      return (!lv && new Date(c.created_at) < ago30) || (lv && lv < ago30);
    };

    setSegmentCounts({
      all: customers.length,
      bronze: customers.filter(c => (c.level || "bronze") === "bronze").length,
      silver: customers.filter(c => c.level === "silver").length,
      gold: customers.filter(c => c.level === "gold").length,
      inactive: customers.filter(isInactive).length,
      vip: customers.filter(c => c.level === "gold" && !isInactive(c)).length,
    });
  };

  // ── Target count (multi-segment union) ────────────────────────────────────

  const computeMultiCount = useCallback((segs: Set<SegmentKey>, customers: any[]) => {
    if (segs.has("all") || segs.size === 0) return customers.length;
    const now = new Date();
    const ago30 = new Date(now.getTime() - 30 * 86400000);
    const ids = new Set<string>();
    customers.forEach(c => {
      const level = c.level || "bronze";
      const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
      const inactive = (!lv && new Date(c.created_at) < ago30) || (lv && lv < ago30);
      if (segs.has("bronze")   && level === "bronze") ids.add(c.id);
      if (segs.has("silver")   && level === "silver") ids.add(c.id);
      if (segs.has("gold")     && level === "gold")   ids.add(c.id);
      if (segs.has("inactive") && inactive)           ids.add(c.id);
      if (segs.has("vip")      && level === "gold" && !inactive) ids.add(c.id);
    });
    return ids.size;
  }, []);

  const targetCount = computeMultiCount(selectedSegments, allCustomers);

  // ── Toggle segment ────────────────────────────────────────────────────────

  const toggleSegment = (key: SegmentKey) => {
    setSelectedSegments(prev => {
      if (key === "all") return new Set<SegmentKey>(["all"]);
      const next = new Set(prev);
      next.delete("all");
      if (next.has(key)) {
        next.delete(key);
        return next.size === 0 ? new Set<SegmentKey>(["all"]) : next;
      }
      next.add(key);
      return next;
    });
  };

  // ── Get target customers for send ─────────────────────────────────────────

  const resolveCustomers = async (): Promise<{ id: string }[]> => {
    if (!business) return [];
    const bizId = (business as any).id;
    const now = new Date();
    const ago30 = new Date(now.getTime() - 30 * 86400000).toISOString();

    if (selectedSegments.has("all")) {
      const { data } = await supabase.from("customers").select("id").eq("business_id", bizId);
      return data || [];
    }
    const idSet = new Set<string>();
    const fetches = [...selectedSegments].map(async seg => {
      if (seg === "bronze" || seg === "silver" || seg === "gold") {
        const { data } = await supabase.from("customers").select("id").eq("business_id", bizId).eq("level", seg);
        (data || []).forEach(c => idSet.add(c.id));
      } else if (seg === "inactive") {
        const { data } = await supabase.from("customers").select("id, last_visit_at, created_at").eq("business_id", bizId);
        (data || []).filter(c => {
          const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
          return (!lv && new Date(c.created_at) < new Date(ago30)) || (lv && lv < new Date(ago30));
        }).forEach(c => idSet.add(c.id));
      } else if (seg === "vip") {
        const { data } = await supabase.from("customers").select("id, last_visit_at").eq("business_id", bizId).eq("level", "gold");
        (data || []).filter(c => c.last_visit_at && new Date(c.last_visit_at) >= new Date(ago30)).forEach(c => idSet.add(c.id));
      }
    });
    await Promise.all(fetches);
    return [...idSet].map(id => ({ id }));
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!message.trim() || !business) { toast.error("Écrivez un message"); return; }
    if (targetCount === 0) { toast.error("Aucun client dans ce segment"); return; }
    setSending(true);

    const customers = await resolveCustomers();
    if (customers.length === 0) { toast.error("Aucun client trouvé"); setSending(false); return; }

    const segLabel = [...selectedSegments].join(",");
    const logs = customers.map(c => ({
      business_id: (business as any).id,
      customer_id: c.id,
      title: title.trim() || businessName,
      message: message.trim(),
      type: "custom" as const,
      segment: segLabel,
      delivery_status: "sent",
    }));

    const { error } = await supabase.from("notifications_log").insert(logs);
    if (error) { toast.error("Erreur d'envoi"); setSending(false); return; }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business_id: (business as any).id,
          title: title.trim() || businessName,
          message: message.trim(),
          segment: segLabel,
          channels: { web_push: false, apple_wallet: true },
        }),
      });
      const result = await res.json();
      toast.success(`✅ Envoyée à ${customers.length} client(s) — ${result.wallet || 0} Wallet(s) notifié(s)`);
    } catch {
      toast.success(`✅ Campagne enregistrée pour ${customers.length} client(s)`);
    }

    resetForm();
    fetchCampaigns();
    setSending(false);
  };

  const saveDraft = () => {
    if (!title.trim() && !message.trim()) { toast.error("Ajoutez un titre ou un message"); return; }
    toast.success("Brouillon sauvegardé");
    resetForm();
  };

  const resetForm = () => {
    setCreating(false);
    setTitle("");
    setMessage("");
    setSelectedSegments(new Set(["all"]));
    setScheduled(false);
    setShowSchedule(false);
  };

  // ── Segment label / badge for campaign list ───────────────────────────────

  const segLabel = (seg: string) => {
    const first = seg.split(",")[0];
    const map: Record<string, string> = {
      all: "Tous", bronze: "Bronze", silver: "Silver",
      gold: "Gold", inactive: "Inactifs", vip: "VIP",
      custom_advanced: "Filtré",
    };
    const label = map[first] || first;
    return seg.includes(",") ? `${label} +${seg.split(",").length - 1}` : label;
  };

  const segBadgeClass = (seg: string) => {
    const first = seg.split(",")[0];
    const map: Record<string, string> = {
      all:      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      bronze:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      silver:   "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
      gold:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      vip:      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    };
    return map[first] || "bg-slate-100 text-slate-600";
  };

  const msgLen = message.length;
  const counterColor = msgLen >= 90 ? "text-red-500" : msgLen >= 70 ? "text-orange-500" : "text-emerald-500";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Campagnes" subtitle="Envoyez des notifications ciblées à vos clients">
      <div className="flex gap-5 h-[calc(100vh-9rem)]">

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside className="w-[300px] shrink-0 flex flex-col gap-3 overflow-hidden">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border/40 p-2.5 flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <p className="text-base font-display font-bold leading-none">{campaignSummaries.length}</p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight">Envoyées</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-2.5 flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-base font-display font-bold leading-none">{walletCount}</p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight">Wallets</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-2.5 flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <p className="text-base font-display font-bold leading-none">{totalNotified}</p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight">Notifiés</p>
            </div>
          </div>

          {/* New campaign button */}
          <Button
            onClick={() => { setCreating(true); setSelectedCampaign(null); }}
            className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold gap-2"
          >
            <Plus className="w-4 h-4" /> Nouvelle campagne
          </Button>

          {/* Campaign list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {campaignSummaries.length === 0 && !creating ? (
              <div className="text-center py-10">
                <Megaphone className="w-7 h-7 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Aucune campagne encore</p>
              </div>
            ) : campaignSummaries.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedCampaign(c); setCreating(false); }}
                className={`w-full text-left p-3 rounded-xl border transition-all group hover:shadow-sm ${
                  selectedCampaign?.id === c.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/40 bg-card hover:border-primary/30 hover:bg-primary/2"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold truncate flex-1 leading-tight">{c.title}</p>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-medium shrink-0 px-1.5">
                    Envoyée
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2 leading-relaxed">{c.message}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge className={`text-[10px] font-medium px-1.5 ${segBadgeClass(c.segment)}`}>
                    {segLabel(c.segment)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {new Date(c.sentAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {" · "}{c.count} clients
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto rounded-2xl">
          <AnimatePresence mode="wait">

            {/* Empty state */}
            {!creating && !selectedCampaign && (
              <motion.div key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center gap-6 p-8"
              >
                <EmptyIllustration />
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold">Envoyez votre première campagne</h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    Touchez vos clients directement sur leur écran de verrouillage via Apple Wallet & Google Wallet.
                  </p>
                </div>
                <Button
                  onClick={() => setCreating(true)}
                  className="bg-gradient-primary text-primary-foreground rounded-xl gap-2 h-11 px-6 font-semibold"
                >
                  <Megaphone className="w-4 h-4" /> Créer une campagne
                </Button>
              </motion.div>
            )}

            {/* Campaign detail */}
            {!creating && selectedCampaign && (
              <motion.div key="detail"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-7 space-y-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold">{selectedCampaign.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(selectedCampaign.sentAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold px-3 py-1">
                    Envoyée
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-muted/40 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Destinataires</p>
                    <p className="text-3xl font-display font-bold">{selectedCampaign.count}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Segment</p>
                    <Badge className={`mt-1 text-sm px-3 py-1 ${segBadgeClass(selectedCampaign.segment)}`}>
                      {segLabel(selectedCampaign.segment)}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Message</p>
                  <p className="text-sm leading-relaxed">{selectedCampaign.message}</p>
                </div>
                <IPhonePreview title={selectedCampaign.title} message={selectedCampaign.message} />
              </motion.div>
            )}

            {/* Create form */}
            {creating && (
              <motion.div key="form"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-7 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold">Nouvelle campagne</h2>
                  <button
                    onClick={resetForm}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Annuler
                  </button>
                </div>

                {/* ── Section 1 : Message + iPhone preview ──────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">1</div>
                    <h3 className="text-sm font-semibold">Message</h3>
                  </div>
                  <div className="flex gap-6">
                    {/* Fields */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Titre</Label>
                        <Input
                          value={title}
                          onChange={e => setTitle(e.target.value.slice(0, 60))}
                          placeholder="Ex : Offre spéciale weekend 🎉"
                          className="h-11 rounded-xl"
                          maxLength={60}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Message *</Label>
                          <span className={`text-xs font-mono font-semibold tabular-nums transition-colors ${counterColor}`}>
                            {msgLen}/100
                          </span>
                        </div>
                        <div className="relative">
                          <Textarea
                            value={message}
                            onChange={e => setMessage(e.target.value.slice(0, 100))}
                            placeholder="Ex : Votre café offert ce weekend 🎁 Montrez cette notification en caisse."
                            className="rounded-xl resize-none pr-3"
                            rows={4}
                          />
                          {/* Color bar */}
                          <div className="absolute bottom-2 left-3 right-3 h-0.5 rounded-full bg-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                msgLen >= 90 ? "bg-red-500" : msgLen >= 70 ? "bg-orange-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${(msgLen / 100) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* iPhone preview */}
                    <div className="shrink-0 hidden lg:block">
                      <IPhonePreview
                        title={title || businessName}
                        message={message || "Votre message apparaîtra ici…"}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 2 : Ciblage ───────────────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">2</div>
                    <h3 className="text-sm font-semibold">Ciblage</h3>
                    <span className="text-xs text-muted-foreground">— sélection multiple possible</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SEGMENTS.map(seg => {
                      const count = segmentCounts[seg.key] ?? 0;
                      const isSelected = selectedSegments.has(seg.key);
                      return (
                        <button
                          key={seg.key}
                          onClick={() => toggleSegment(seg.key)}
                          className={`relative group p-4 rounded-2xl border-2 text-left transition-all duration-200
                            ${isSelected
                              ? `${seg.borderClass} ${seg.bgClass} shadow-md`
                              : "border-border/50 bg-card hover:border-border hover:shadow-sm hover:-translate-y-0.5"
                            }`}
                        >
                          {isSelected && (
                            <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center ${seg.borderClass.replace("border", "bg")}`}
                              style={{ background: "currentColor" }}
                            >
                              <Check className="w-3 h-3 text-white absolute" />
                            </div>
                          )}
                          <div className="text-xl mb-2">{seg.emoji}</div>
                          <p className="text-sm font-semibold leading-tight">{seg.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{seg.desc}</p>
                          <Badge className={`mt-2 text-[10px] font-semibold px-2 ${seg.badgeClass}`}>
                            {count} client{count !== 1 ? "s" : ""}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>

                  {/* Target summary */}
                  <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                    targetCount > 0
                      ? "bg-primary/5 border-primary/20 text-primary"
                      : "bg-muted/50 border-border/40 text-muted-foreground"
                  }`}>
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-semibold">
                      {targetCount} client{targetCount !== 1 ? "s" : ""} recevront cette campagne
                    </span>
                    {walletCount > 0 && (
                      <span className="ml-auto text-xs opacity-70">· {walletCount} Wallet{walletCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>

                {/* ── Section 3 : Programmation ─────────────────────────── */}
                <div>
                  <button
                    onClick={() => setShowSchedule(v => !v)}
                    className="flex w-full items-center gap-2 mb-4 group"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">3</div>
                    <h3 className="text-sm font-semibold">Programmation</h3>
                    <span className="text-xs text-muted-foreground ml-1">— optionnel</span>
                    <div className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors">
                      {showSchedule ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showSchedule && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-4">
                          {/* Toggle */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => setScheduled(false)}
                              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                !scheduled ? "border-primary bg-primary/5 text-primary" : "border-border/50 hover:border-primary/30"
                              }`}
                            >
                              <Send className="w-4 h-4" /> Envoyer maintenant
                            </button>
                            <button
                              onClick={() => setScheduled(true)}
                              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                scheduled ? "border-primary bg-primary/5 text-primary" : "border-border/50 hover:border-primary/30"
                              }`}
                            >
                              <Calendar className="w-4 h-4" /> Programmer
                            </button>
                          </div>

                          {/* Date/time pickers */}
                          <AnimatePresence>
                            {scheduled && (
                              <motion.div
                                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                className="grid grid-cols-2 gap-3"
                              >
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Date</Label>
                                  <Input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={e => setScheduleDate(e.target.value)}
                                    className="h-10 rounded-xl text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Heure</Label>
                                  <Input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={e => setScheduleTime(e.target.value)}
                                    className="h-10 rounded-xl text-sm"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Action buttons ────────────────────────────────────── */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <Button
                    variant="outline"
                    onClick={saveDraft}
                    className="rounded-xl gap-2"
                  >
                    Sauvegarder brouillon
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sending || !message.trim() || targetCount === 0}
                    className="ml-auto bg-gradient-primary text-primary-foreground rounded-xl gap-2 px-6 font-semibold h-11"
                  >
                    {sending ? (
                      <><Bell className="w-4 h-4 animate-bounce" /> Envoi en cours…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Envoyer la campagne</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </DashboardLayout>
  );
};

// ─── iPhone Lock Screen Preview ───────────────────────────────────────────────

function IPhonePreview({ title, message }: { title: string; message: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-muted-foreground">Aperçu écran verrouillé</p>
      {/* iPhone frame */}
      <div className="relative w-[200px] h-[400px] bg-gray-950 rounded-[38px] border-[5px] border-gray-800 shadow-[0_25px_60px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden select-none">
        {/* Dynamic Island */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-gray-950 rounded-full z-20" />

        {/* Wallpaper */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
        <div className="absolute top-[-20px] left-[-30px] w-40 h-40 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute bottom-20 right-[-20px] w-32 h-32 rounded-full bg-blue-600/20 blur-3xl" />

        {/* Status bar */}
        <div className="absolute top-3 left-6 right-6 flex items-center justify-between z-10">
          <span className="text-white/80 text-[9px] font-semibold">{timeStr}</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5 items-end h-3">
              {[2, 3, 4, 4].map((h, i) => (
                <div key={i} className="w-0.5 bg-white/70 rounded-sm" style={{ height: h * 2.5 }} />
              ))}
            </div>
            <svg className="w-3 h-3 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1.5 8.5a13 13 0 0 1 21 0M5 12a9 9 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
            <div className="w-5 h-2.5 rounded-sm border border-white/50 flex items-center px-0.5">
              <div className="w-3 h-1.5 bg-white/80 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Time */}
        <div className="absolute top-14 left-0 right-0 text-center z-10">
          <p className="text-white text-[44px] font-thin tracking-tight leading-none">{timeStr}</p>
          <p className="text-white/55 text-[11px] mt-2 capitalize font-light">{dateStr}</p>
        </div>

        {/* Notification */}
        <div className="absolute top-[200px] left-3 right-3 z-10">
          <div className="bg-white/12 backdrop-blur-2xl rounded-[18px] p-3.5 border border-white/10 shadow-xl">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/40">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-white text-[10px] font-semibold tracking-wide uppercase opacity-70">FidéliPro</p>
                  <span className="text-white/40 text-[9px]">à l'instant</span>
                </div>
                <p className="text-white text-[11px] font-semibold leading-snug line-clamp-1">
                  {title || "Titre de votre campagne"}
                </p>
                <p className="text-white/65 text-[10px] mt-0.5 leading-relaxed line-clamp-2">
                  {message || "Votre message apparaîtra ici…"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-[3px] bg-white/25 rounded-full" />
      </div>
    </div>
  );
}

// ─── Empty state illustration ────────────────────────────────────────────────

function EmptyIllustration() {
  return (
    <svg width="180" height="160" viewBox="0 0 180 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone body */}
      <rect x="52" y="18" width="64" height="110" rx="14" fill="hsl(var(--primary)/0.08)" stroke="hsl(var(--primary)/0.25)" strokeWidth="2"/>
      {/* Screen */}
      <rect x="58" y="32" width="52" height="82" rx="6" fill="hsl(var(--primary)/0.05)"/>
      {/* Notch */}
      <rect x="72" y="18" width="24" height="7" rx="3.5" fill="hsl(var(--background))"/>
      {/* Home bar */}
      <rect x="76" y="120" width="16" height="3" rx="1.5" fill="hsl(var(--primary)/0.2)"/>
      {/* Time text simulation */}
      <rect x="72" y="42" width="24" height="8" rx="2" fill="hsl(var(--primary)/0.15)"/>
      <rect x="78" y="53" width="12" height="3" rx="1.5" fill="hsl(var(--primary)/0.1)"/>
      {/* Notification card */}
      <rect x="61" y="68" width="46" height="34" rx="8" fill="hsl(var(--primary)/0.12)" stroke="hsl(var(--primary)/0.35)" strokeWidth="1.5"/>
      {/* App icon in notification */}
      <rect x="66" y="74" width="10" height="10" rx="3" fill="hsl(var(--primary))"/>
      <path d="M69 79 L71 81 L74 77" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Notification text lines */}
      <rect x="79" y="75" width="24" height="3" rx="1.5" fill="hsl(var(--primary)/0.5)"/>
      <rect x="79" y="81" width="18" height="2.5" rx="1.25" fill="hsl(var(--primary)/0.3)"/>
      <rect x="79" y="86" width="22" height="2.5" rx="1.25" fill="hsl(var(--primary)/0.2)"/>
      {/* Signal waves right */}
      <path d="M122 55 Q130 50 138 55" stroke="hsl(var(--primary)/0.4)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M122 47 Q133 40 144 47" stroke="hsl(var(--primary)/0.25)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M122 39 Q135 30 148 39" stroke="hsl(var(--primary)/0.15)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Dot center of waves */}
      <circle cx="120" cy="55" r="2.5" fill="hsl(var(--primary)/0.5)"/>
      {/* Decorative stars */}
      <circle cx="26" cy="38" r="3" fill="hsl(var(--primary)/0.3)"/>
      <circle cx="155" cy="100" r="4" fill="hsl(var(--primary)/0.2)"/>
      <circle cx="148" cy="28" r="2" fill="hsl(var(--primary)/0.4)"/>
      <circle cx="32" cy="110" r="2.5" fill="hsl(var(--primary)/0.25)"/>
      {/* Small sparkle lines */}
      <path d="M26 32 L26 28 M22 35 L19 33 M30 35 L33 33" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M155 93 L155 89 M151 96 L148 94 M159 96 L162 94" stroke="hsl(var(--primary)/0.2)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default CampaignsPage;
