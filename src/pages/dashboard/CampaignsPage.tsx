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
  Send, Users, Clock, Crown, Plus, CheckCircle, Bell,
  Filter, ChevronDown, ChevronRight, Megaphone, Zap, Target, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

type SimpleSegment = "all" | "bronze" | "silver" | "gold" | "inactive";

interface CampaignSummary {
  id: string;
  title: string;
  message: string;
  segment: string;
  sentAt: string;
  count: number;
  status: "sent" | "scheduled" | "draft";
}

const SEGMENT_OPTIONS: { value: SimpleSegment; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { value: "all",      label: "Tous",      icon: Users,  color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",   desc: "Tous vos clients" },
  { value: "bronze",   label: "Bronze",    icon: Zap,    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", desc: "0–9 points cumulés" },
  { value: "silver",   label: "Silver",    icon: CheckCircle, color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", desc: "10–24 points cumulés" },
  { value: "gold",     label: "Gold",      icon: Crown,  color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", desc: "25+ points cumulés" },
  { value: "inactive", label: "Inactifs",  icon: Clock,  color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", desc: "Aucune visite depuis 30j" },
];

// ─── Advanced filters (kept from original) ──────────────────────────────────

interface AdvancedFilter {
  inactiveDays: number;
  minPoints: number;
  maxPoints: number;
  city: string;
}

const defaultAdvancedFilter: AdvancedFilter = { inactiveDays: 0, minPoints: 0, maxPoints: 999, city: "" };

// ─── Component ──────────────────────────────────────────────────────────────

const CampaignsPage = () => {
  const { business } = useAuth();

  // Data
  const [campaignSummaries, setCampaignSummaries] = useState<CampaignSummary[]>([]);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [walletCount, setWalletCount] = useState(0);

  // UI state
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form
  const [form, setForm] = useState({ title: "", message: "", segment: "all" as SimpleSegment });
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter>(defaultAdvancedFilter);
  const [advancedCount, setAdvancedCount] = useState<number | null>(null);

  const businessName = business?.name || "FidéliPro";

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!business) return;
    fetchCampaigns();
    fetchSegmentCounts();
    fetchWalletCount();
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

  const fetchWalletCount = async () => {
    if (!business) return;
    const { count } = await supabase.from("wallet_registrations").select("id", { count: "exact", head: true }).eq("business_id", business.id);
    setWalletCount(count || 0);
  };

  const fetchCampaigns = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("notifications_log")
      .select("*")
      .eq("business_id", business.id)
      .order("sent_at", { ascending: false })
      .limit(200);
    if (!data) return;

    // Group by message + day → campaign summaries
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
      status: "sent" as const,
    }));

    setCampaignSummaries(summaries);
  };

  const fetchSegmentCounts = async () => {
    if (!business) return;
    const { data: customers } = await supabase
      .from("customers")
      .select("id, last_visit_at, level, created_at, customer_cards(current_points, max_points)")
      .eq("business_id", business.id);
    if (!customers) return;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    setSegmentCounts({
      all: customers.length,
      bronze: customers.filter(c => (c.level || "bronze") === "bronze").length,
      silver: customers.filter(c => c.level === "silver").length,
      gold: customers.filter(c => c.level === "gold").length,
      inactive: customers.filter(c => {
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        return (!lv && new Date(c.created_at) < thirtyDaysAgo) || (lv && lv < thirtyDaysAgo);
      }).length,
    });
  };

  // ── Advanced count ─────────────────────────────────────────────────────────

  const computeAdvancedCount = useCallback((filter: AdvancedFilter, customers: any[]) => {
    const now = new Date();
    return customers.filter(c => {
      if (filter.inactiveDays > 0) {
        const threshold = new Date(now.getTime() - filter.inactiveDays * 86400000);
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        if (lv && lv >= threshold) return false;
        if (!lv && new Date(c.created_at) >= threshold) return false;
      }
      const card = c.customer_cards?.[0];
      const pts = card?.current_points ?? 0;
      if (pts < filter.minPoints || pts > filter.maxPoints) return false;
      if (filter.city.trim()) {
        const cc = (c.city || "").toLowerCase();
        if (!cc.includes(filter.city.trim().toLowerCase())) return false;
      }
      return true;
    }).length;
  }, []);

  useEffect(() => {
    if (showAdvanced) setAdvancedCount(computeAdvancedCount(advancedFilter, allCustomers));
  }, [advancedFilter, allCustomers, showAdvanced, computeAdvancedCount]);

  // ── Target resolution ──────────────────────────────────────────────────────

  const getTargetCustomers = async (segment: SimpleSegment): Promise<{ id: string }[]> => {
    if (!business) return [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    if (segment === "bronze") {
      const { data } = await supabase.from("customers").select("id").eq("business_id", business.id).eq("level", "bronze");
      return data || [];
    }
    if (segment === "silver") {
      const { data } = await supabase.from("customers").select("id").eq("business_id", business.id).eq("level", "silver");
      return data || [];
    }
    if (segment === "gold") {
      const { data } = await supabase.from("customers").select("id").eq("business_id", business.id).eq("level", "gold");
      return data || [];
    }
    if (segment === "inactive") {
      const { data } = await supabase.from("customers").select("id, last_visit_at, created_at").eq("business_id", business.id);
      return (data || []).filter(c => {
        const lv = c.last_visit_at ? new Date(c.last_visit_at) : null;
        return (!lv && new Date(c.created_at) < new Date(thirtyDaysAgo)) || (lv && lv < new Date(thirtyDaysAgo));
      });
    }
    const { data } = await supabase.from("customers").select("id").eq("business_id", business.id);
    return data || [];
  };

  const getAdvancedTargetCustomers = (): { id: string }[] => {
    const now = new Date();
    return allCustomers.filter(c => {
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

  // ── Send ───────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!form.message.trim() || !business) { toast.error("Écrivez un message"); return; }
    setSending(true);

    const customers = showAdvanced
      ? getAdvancedTargetCustomers()
      : await getTargetCustomers(form.segment);

    if (customers.length === 0) { toast.error("Aucun client dans ce segment"); setSending(false); return; }

    const segmentLabel = showAdvanced ? "custom_advanced" : form.segment;
    const logs = customers.map(c => ({
      business_id: business.id,
      customer_id: c.id,
      title: form.title.trim() || business.name,
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
          title: form.title.trim() || business.name,
          message: form.message.trim(),
          segment: segmentLabel,
          channels: { web_push: false, apple_wallet: true },
        }),
      });
      const result = await res.json();
      const wCount = result.wallet || 0;
      toast.success(`✅ Envoyée à ${customers.length} client(s) — ${wCount} Wallet(s) notifié(s)`);
    } catch {
      toast.success(`✅ Campagne enregistrée pour ${customers.length} client(s)`);
    }

    setCreating(false);
    setForm({ title: "", message: "", segment: "all" });
    setAdvancedFilter(defaultAdvancedFilter);
    setShowAdvanced(false);
    fetchCampaigns();
    setSending(false);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const segmentBadgeColor = (seg: string) => {
    if (seg === "gold" || seg === "vip") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (seg === "silver") return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    if (seg === "bronze") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (seg === "inactive") return "bg-orange-100 text-orange-700";
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  };

  const segLabel = (seg: string) => {
    const map: Record<string, string> = { all: "Tous", bronze: "Bronze", silver: "Silver", gold: "Gold", vip: "Gold", inactive: "Inactifs", custom_advanced: "Filtré" };
    return map[seg] || seg;
  };

  const targetCount = showAdvanced
    ? (advancedCount ?? 0)
    : (segmentCounts[form.segment] ?? 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Campagnes" subtitle="Envoyez des notifications ciblées à vos clients">
      <div className="flex gap-6 h-[calc(100vh-10rem)]">

        {/* LEFT — Campaign list */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <Button
            onClick={() => { setCreating(true); setSelectedCampaign(null); }}
            className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" /> Nouvelle campagne
          </Button>

          {/* Stats pills */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl bg-card border border-border/40 px-3 py-2 text-center">
              <p className="text-lg font-display font-bold">{campaignSummaries.length}</p>
              <p className="text-[10px] text-muted-foreground">Envoyées</p>
            </div>
            <div className="flex-1 rounded-xl bg-card border border-border/40 px-3 py-2 text-center">
              <p className="text-lg font-display font-bold">{walletCount}</p>
              <p className="text-[10px] text-muted-foreground">Wallets</p>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {campaignSummaries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucune campagne encore
              </div>
            ) : campaignSummaries.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedCampaign(c); setCreating(false); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedCampaign?.id === c.id
                    ? "border-primary bg-primary/5"
                    : "border-border/40 bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] shrink-0">Envoyée</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{c.message}</p>
                <div className="flex items-center justify-between">
                  <Badge className={`text-[10px] ${segmentBadgeColor(c.segment)}`}>{segLabel(c.segment)}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.sentAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {c.count} clients
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — Detail / Form */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!creating && !selectedCampaign && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Send className="w-7 h-7 opacity-40" />
                </div>
                <div>
                  <p className="font-medium">Sélectionnez une campagne</p>
                  <p className="text-sm mt-1">ou créez-en une nouvelle</p>
                </div>
                <Button onClick={() => setCreating(true)} variant="outline" className="gap-2 rounded-xl">
                  <Plus className="w-4 h-4" /> Nouvelle campagne
                </Button>
              </motion.div>
            )}

            {/* Campaign detail */}
            {!creating && selectedCampaign && (
              <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-display font-bold">{selectedCampaign.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(selectedCampaign.sentAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Envoyée</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Destinataires</p>
                    <p className="text-2xl font-display font-bold mt-1">{selectedCampaign.count}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Segment</p>
                    <Badge className={`mt-1 ${segmentBadgeColor(selectedCampaign.segment)}`}>{segLabel(selectedCampaign.segment)}</Badge>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Message envoyé</p>
                  <p className="text-sm">{selectedCampaign.message}</p>
                </div>

                {/* iPhone preview */}
                <IPhonePreview title={selectedCampaign.title} message={selectedCampaign.message} />
              </motion.div>
            )}

            {/* Create form */}
            {creating && (
              <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
                <h2 className="text-xl font-display font-bold">Nouvelle campagne</h2>

                {/* Title */}
                <div className="space-y-2">
                  <Label>Titre de la campagne <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={`${businessName} — Offre spéciale`}
                    className="h-11 rounded-xl"
                    maxLength={60}
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Message *</Label>
                    <span className={`text-xs font-mono ${form.message.length > 90 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {form.message.length}/100
                    </span>
                  </div>
                  <Textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value.slice(0, 100) }))}
                    placeholder="Ex : Votre café offert ce weekend 🎁 Montrez cette notification."
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>

                {/* Segment */}
                {!showAdvanced && (
                  <div className="space-y-2">
                    <Label>Segment</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SEGMENT_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const count = segmentCounts[opt.value] ?? 0;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setForm(f => ({ ...f, segment: opt.value }))}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                              form.segment === opt.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{opt.label}</p>
                              <p className="text-[10px] text-muted-foreground">{count} client{count > 1 ? "s" : ""}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Advanced options toggle */}
                <button
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Options avancées
                  {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/40">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-sm">Inactif depuis (jours)</Label>
                        <span className="text-sm font-mono">{advancedFilter.inactiveDays === 0 ? "tous" : `${advancedFilter.inactiveDays}j`}</span>
                      </div>
                      <Slider value={[advancedFilter.inactiveDays]} onValueChange={([v]) => setAdvancedFilter(f => ({ ...f, inactiveDays: v }))} min={0} max={90} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Points entre {advancedFilter.minPoints} et {advancedFilter.maxPoints}</Label>
                      <div className="flex gap-3">
                        <Input type="number" value={advancedFilter.minPoints} onChange={e => setAdvancedFilter(f => ({ ...f, minPoints: +e.target.value }))} placeholder="Min" className="h-9 rounded-xl text-sm" />
                        <Input type="number" value={advancedFilter.maxPoints === 999 ? "" : advancedFilter.maxPoints} onChange={e => setAdvancedFilter(f => ({ ...f, maxPoints: e.target.value ? +e.target.value : 999 }))} placeholder="Max" className="h-9 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Ville</Label>
                      <Input value={advancedFilter.city} onChange={e => setAdvancedFilter(f => ({ ...f, city: e.target.value }))} placeholder="Paris, Lyon…" className="h-9 rounded-xl text-sm" />
                    </div>
                  </div>
                )}

                {/* Preview */}
                <IPhonePreview title={form.title || businessName} message={form.message || "Votre message apparaîtra ici…"} />

                {/* Send */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{targetCount}</span> destinataire{targetCount > 1 ? "s" : ""}
                    {walletCount > 0 && <span className="ml-2 text-xs">· {walletCount} Wallet{walletCount > 1 ? "s" : ""}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setCreating(false); setShowAdvanced(false); }} className="rounded-xl">
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSend}
                      disabled={sending || !form.message.trim()}
                      className="bg-gradient-primary text-primary-foreground rounded-xl gap-2"
                    >
                      {sending ? (
                        <span className="flex items-center gap-2"><Bell className="w-4 h-4 animate-bounce" /> Envoi…</span>
                      ) : (
                        <><Send className="w-4 h-4" /> Envoyer</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── iPhone Preview ──────────────────────────────────────────────────────────

function IPhonePreview({ title, message }: { title: string; message: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Aperçu notification</p>
      <div className="bg-muted/40 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-xs font-semibold truncate">{title || "FidéliPro"}</p>
            <span className="text-[10px] text-muted-foreground shrink-0">Maintenant</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default CampaignsPage;
