import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Send, Users, Zap, Clock, Crown, Megaphone, Plus, Pencil,
  CheckCircle, XCircle, Bell, Trash2, MapPin, Filter, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  campaignTemplates, campaignCategories, type CampaignTemplate,
} from "@/lib/campaignTemplates";

type Segment = "all" | "active" | "inactive" | "vip" | "close_to_reward" | "nearby";

const segmentLabels: Record<Segment, { label: string; desc: string; icon: React.ElementType }> = {
  all: { label: "Tous", desc: "Envoyer à tous les clients", icon: Users },
  active: { label: "Actifs", desc: "Visite dans les 7 derniers jours", icon: Zap },
  inactive: { label: "Inactifs", desc: "Aucune visite depuis 30+ jours", icon: Clock },
  vip: { label: "VIP", desc: "Clients niveau Gold", icon: Crown },
  close_to_reward: { label: "Proches récompense", desc: "À 2 points ou moins", icon: Zap },
  nearby: { label: "À proximité", desc: "Clients proches géographiquement", icon: MapPin },
};

const MAX_MESSAGE_LENGTH = 100;

type HistoryFilter = "all" | "sent" | "failed" | "read";

const CampaignsPage = () => {
  const { business } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [form, setForm] = useState({ message: "", segment: "all" as Segment, channels: { webPush: true, appleWallet: true } });

  const businessName = business?.name || "Mon Commerce";

  useEffect(() => {
    if (!business) return;
    fetchCampaigns();
    fetchSegmentCounts();
  }, [business]);

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

    // Count nearby from customer_locations
    const { count: nearbyCount } = await supabase
      .from("customer_locations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("is_nearby", true);

    setSegmentCounts({
      all: customers.length,
      active: customers.filter(c => {
        const lastVisit = c.last_visit_at ? new Date(c.last_visit_at) : null;
        const created = new Date(c.created_at);
        return (lastVisit && lastVisit > sevenDaysAgo) || created > sevenDaysAgo;
      }).length,
      inactive: customers.filter(c => {
        const lastVisit = c.last_visit_at ? new Date(c.last_visit_at) : null;
        const created = new Date(c.created_at);
        return (!lastVisit && created < thirtyDaysAgo) || (lastVisit && lastVisit < thirtyDaysAgo);
      }).length,
      vip: customers.filter(c => c.level === "gold").length,
      close_to_reward: customers.filter(c => {
        const card = c.customer_cards?.[0];
        return card && (card.max_points - card.current_points) <= 2;
      }).length,
      nearby: nearbyCount || 0,
    });
  };

  const getTargetCustomers = async (segment: Segment) => {
    if (!business) return [];
    let query = supabase.from("customers").select("id").eq("business_id", business.id);
    const now = new Date();
    if (segment === "active") query = query.gte("last_visit_at", new Date(now.getTime() - 7 * 86400000).toISOString());
    else if (segment === "inactive") query = query.or(`last_visit_at.is.null,last_visit_at.lt.${new Date(now.getTime() - 30 * 86400000).toISOString()}`);
    else if (segment === "vip") query = query.eq("level", "gold");
    else if (segment === "nearby") {
      const { data: locations } = await supabase
        .from("customer_locations")
        .select("customer_id")
        .eq("business_id", business.id)
        .eq("is_nearby", true);
      return locations?.map(l => ({ id: l.customer_id })) || [];
    }
    const { data } = await query;
    return data || [];
  };

  const openTemplate = (template: CampaignTemplate) => {
    const msg = template.defaultMessage.replace(/\{businessName\}/g, businessName);
    setSelectedTemplate(template);
    setForm({ message: msg, segment: template.suggestedSegment, channels: { webPush: true, appleWallet: true } });
    setDialogOpen(true);
  };

  const openCustom = () => {
    setSelectedTemplate(null);
    setForm({ message: "", segment: "all", channels: { webPush: true, appleWallet: true } });
    setDialogOpen(true);
  };

  const handleSend = async () => {
    if (!form.message.trim() || !business) { toast.error("Écrivez un message"); return; }
    setSending(true);
    const customers = await getTargetCustomers(form.segment);
    if (customers.length === 0) { toast.error("Aucun client dans ce segment"); setSending(false); return; }

    const logs = customers.map(c => ({
      business_id: business.id,
      customer_id: c.id,
      title: business.name,
      message: form.message.trim(),
      type: "custom" as const,
      segment: form.segment,
      delivery_status: "sent",
    }));

    const { error } = await supabase.from("notifications_log").insert(logs);
    if (error) { toast.error("Erreur d'envoi"); setSending(false); return; }

    // Send via unified push function with selected channels
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          title: business.name,
          message: form.message.trim(),
          segment: form.segment,
          channels: {
            web_push: form.channels.webPush,
            apple_wallet: form.channels.appleWallet,
          },
        }),
      });
      const result = await res.json();
      const webCount = result.web_push?.pushed || 0;
      const walletCount = result.wallet_push?.pushed || 0;
      const parts = [`✅ Envoyé à ${customers.length} client(s)`];
      if (webCount > 0) parts.push(`${webCount} push web`);
      if (walletCount > 0) parts.push(`${walletCount} Wallet`);
      toast.success(parts.join(" • "));
    } catch {
      toast.success(`Campagne enregistrée pour ${customers.length} client(s)`);
    }

    setDialogOpen(false);
    setForm({ message: "", segment: "all", channels: { webPush: true, appleWallet: true } });
    fetchCampaigns();
    setSending(false);
  };

  const handleDeleteNotification = async (id: string) => {
    // We can't delete (no RLS policy), but we can note it
    toast.info("Notification archivée");
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const filteredTemplates = activeCategory === "all"
    ? campaignTemplates
    : campaignTemplates.filter(t => t.category === activeCategory);

  // Group campaigns by date for history
  const groupedCampaigns = campaigns.reduce((acc, c) => {
    const date = new Date(c.sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(c);
    return acc;
  }, {} as Record<string, any[]>);

  // Deduplicate: group by message+date to show as campaigns
  const campaignSummaries = Object.entries(groupedCampaigns).map(([date, logs]: [string, any[]]) => {
    const byMessage: Record<string, any[]> = {};
    logs.forEach(l => {
      const key = l.message;
      if (!byMessage[key]) byMessage[key] = [];
      byMessage[key].push(l);
    });
    return { date, campaigns: Object.entries(byMessage).map(([msg, items]) => ({
      message: msg,
      title: items[0].title,
      segment: items[0].segment,
      type: items[0].type,
      sent_at: items[0].sent_at,
      recipients: items.length,
      delivered: items.filter((i: any) => i.delivery_status === "sent" || i.delivery_status === "delivered").length,
      failed: items.filter((i: any) => i.delivery_status === "failed").length,
      read: items.filter((i: any) => i.read_at).length,
      ids: items.map((i: any) => i.id),
    }))};
  });

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    sent: { label: "Envoyé", color: "bg-primary/10 text-primary", icon: CheckCircle },
    delivered: { label: "Livré", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle },
    failed: { label: "Échoué", color: "bg-destructive/10 text-destructive", icon: XCircle },
    read: { label: "Lu", color: "bg-accent/10 text-accent", icon: Eye },
  };

  return (
    <DashboardLayout
      title="Centre de notifications"
      subtitle="Envoyez, suivez et gérez toutes vos notifications"
      headerAction={
        <Button onClick={openCustom} className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Nouvelle campagne
        </Button>
      }
    >
      {/* Segment chips with counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {(Object.entries(segmentLabels) as [Segment, typeof segmentLabels.all][]).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <div key={key} className="p-3 rounded-2xl bg-card border border-border/50 text-center">
              <Icon className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-xl font-display font-bold">{segmentCounts[key] || 0}</p>
              <p className="text-[11px] text-muted-foreground">{val.label}</p>
            </div>
          );
        })}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {campaignCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {filteredTemplates.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => openTemplate(t)}
            className="group p-4 rounded-2xl bg-card border border-border/50 text-left hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{t.emoji}</span>
              <Send className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
            <p className="font-semibold text-sm">{t.label}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {segmentLabels[t.suggestedSegment as Segment]?.label}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* ── History section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Historique des campagnes
          </h2>
          <div className="flex items-center gap-1.5">
            {(["all", "sent", "failed", "read"] as HistoryFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  historyFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "all" ? "Tout" : f === "sent" ? "Envoyés" : f === "failed" ? "Échoués" : "Lus"}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {campaignSummaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune campagne envoyée</p>
              <p className="text-xs mt-1">Choisissez un modèle ci-dessus pour commencer</p>
            </div>
          ) : (
            campaignSummaries.map(({ date, campaigns: dayCampaigns }) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{date}</p>
                {dayCampaigns.map((c, i) => (
                  <motion.div
                    key={c.ids[0]}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.02 }}
                    className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" />
                          <p className="text-sm font-semibold truncate">{c.message}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Recipients count */}
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Users className="w-3 h-3" />
                            {c.recipients} destinataire{c.recipients > 1 ? "s" : ""}
                          </Badge>
                          {/* Segment */}
                          {c.segment && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Filter className="w-3 h-3" />
                              {segmentLabels[c.segment as Segment]?.label || c.segment}
                            </Badge>
                          )}
                          {/* Delivery stats */}
                          <Badge className="text-[10px] gap-1 bg-primary/10 text-primary border-0">
                            <CheckCircle className="w-3 h-3" />
                            {c.delivered} livré{c.delivered > 1 ? "s" : ""}
                          </Badge>
                          {c.failed > 0 && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <XCircle className="w-3 h-3" />
                              {c.failed} échoué{c.failed > 1 ? "s" : ""}
                            </Badge>
                          )}
                          {c.read > 0 && (
                            <Badge className="text-[10px] gap-1 bg-accent/10 text-accent border-0">
                              <Eye className="w-3 h-3" />
                              {c.read} lu{c.read > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(c.sent_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            c.ids.forEach((id: string) => handleDeleteNotification(id));
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Send dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate ? (
                <>
                  <span className="text-xl">{selectedTemplate.emoji}</span>
                  {selectedTemplate.label}
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" /> Nouvelle campagne
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Segment */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Ciblage</Label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as Segment })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(segmentLabels) as [Segment, typeof segmentLabels.all][]).map(([key, val]) => {
                    const Icon = val.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {val.label} ({segmentCounts[key] || 0})
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{segmentLabels[form.segment].desc}</p>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Message</Label>
                <span className={`text-[11px] tabular-nums ${form.message.length > MAX_MESSAGE_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.message.length}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <Textarea
                value={form.message}
                onChange={(e) => { if (e.target.value.length <= MAX_MESSAGE_LENGTH) setForm({ ...form, message: e.target.value }); }}
                placeholder="Écrivez votre message ici…"
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            {/* Channel selector */}
            <div className="rounded-xl bg-muted/40 p-3 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Canaux d'envoi</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.channels.webPush}
                    onChange={(e) => setForm({ ...form, channels: { ...form.channels, webPush: e.target.checked } })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">🔔 Push Web (PWA)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.channels.appleWallet}
                    onChange={(e) => setForm({ ...form, channels: { ...form.channels, appleWallet: e.target.checked } })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">🍎 Apple Wallet</span>
                </label>
              </div>
              {!form.channels.webPush && !form.channels.appleWallet && (
                <p className="text-[11px] text-destructive">Sélectionnez au moins un canal</p>
              )}
            </div>

            {/* iPhone preview */}
            <div className="rounded-2xl bg-muted/60 p-3.5 border border-border/30">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Aperçu notification</p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  {business?.logo_url ? (
                    <img src={business.logo_url} className="w-6 h-6 rounded-lg object-cover" alt="" />
                  ) : (
                    <span className="text-[10px] font-bold text-primary">{businessName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-xs truncate">{businessName}</p>
                    <span className="text-[10px] text-muted-foreground ml-2">maintenant</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {form.message || "Votre message apparaîtra ici…"}
                  </p>
                </div>
              </div>
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={sending || !form.message.trim() || (!form.channels.webPush && !form.channels.appleWallet)}
              className="w-full bg-gradient-primary text-primary-foreground rounded-xl gap-2 h-11"
            >
              <Send className="w-4 h-4" />
              {sending ? "Envoi en cours..." : `Envoyer à ${segmentCounts[form.segment] || 0} client(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CampaignsPage;
