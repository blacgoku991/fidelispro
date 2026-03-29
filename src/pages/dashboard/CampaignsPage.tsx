import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Send, Users, Zap, Clock, Crown, Megaphone, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  campaignTemplates, campaignCategories, type CampaignTemplate,
} from "@/lib/campaignTemplates";

type Segment = "all" | "active" | "inactive" | "vip" | "close_to_reward";

const segmentLabels: Record<Segment, { label: string; desc: string; icon: React.ElementType }> = {
  all: { label: "Tous", desc: "Envoyer à tous les clients", icon: Users },
  active: { label: "Actifs", desc: "Visite dans les 7 derniers jours", icon: Zap },
  inactive: { label: "Inactifs", desc: "Aucune visite depuis 30+ jours", icon: Clock },
  vip: { label: "VIP", desc: "Clients niveau Gold", icon: Crown },
  close_to_reward: { label: "Proches récompense", desc: "À 2 points ou moins", icon: Zap },
};

const MAX_MESSAGE_LENGTH = 100;

const CampaignsPage = () => {
  const { business } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [form, setForm] = useState({ message: "", segment: "all" as Segment });

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
      .limit(30);
    if (data) setCampaigns(data);
  };

  const fetchSegmentCounts = async () => {
    if (!business) return;
    const { data: customers } = await supabase
      .from("customers")
      .select("id, last_visit_at, level, customer_cards(current_points, max_points)")
      .eq("business_id", business.id);
    if (!customers) return;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    setSegmentCounts({
      all: customers.length,
      active: customers.filter(c => c.last_visit_at && new Date(c.last_visit_at) > sevenDaysAgo).length,
      inactive: customers.filter(c => !c.last_visit_at || new Date(c.last_visit_at) < thirtyDaysAgo).length,
      vip: customers.filter(c => c.level === "gold").length,
      close_to_reward: customers.filter(c => {
        const card = c.customer_cards?.[0];
        return card && (card.max_points - card.current_points) <= 2;
      }).length,
    });
  };

  const getTargetCustomers = async (segment: Segment) => {
    if (!business) return [];
    let query = supabase.from("customers").select("id").eq("business_id", business.id);
    const now = new Date();
    if (segment === "active") query = query.gte("last_visit_at", new Date(now.getTime() - 7 * 86400000).toISOString());
    else if (segment === "inactive") query = query.or(`last_visit_at.is.null,last_visit_at.lt.${new Date(now.getTime() - 30 * 86400000).toISOString()}`);
    else if (segment === "vip") query = query.eq("level", "gold");
    const { data } = await query;
    return data || [];
  };

  const openTemplate = (template: CampaignTemplate) => {
    const msg = template.defaultMessage.replace(/\{businessName\}/g, businessName);
    setSelectedTemplate(template);
    setForm({ message: msg, segment: template.suggestedSegment });
    setDialogOpen(true);
  };

  const openCustom = () => {
    setSelectedTemplate(null);
    setForm({ message: "", segment: "all" });
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
    }));

    const { error } = await supabase.from("notifications_log").insert(logs);
    if (error) { toast.error("Erreur d'envoi"); setSending(false); return; }

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/wallet-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: business.id, action_type: "campaign", change_message: form.message.trim() }),
      });
      const walletResult = await res.json();
      toast.success(`Campagne envoyée à ${customers.length} client(s)${walletResult.pushed > 0 ? ` + ${walletResult.pushed} Wallet` : ""}`);
    } catch {
      toast.success(`Campagne envoyée à ${customers.length} client(s) !`);
    }

    setDialogOpen(false);
    setForm({ message: "", segment: "all" });
    fetchCampaigns();
    setSending(false);
  };

  const filteredTemplates = activeCategory === "all"
    ? campaignTemplates
    : campaignTemplates.filter(t => t.category === activeCategory);

  return (
    <DashboardLayout
      title="Campagnes"
      subtitle="Choisissez un modèle ou créez votre propre message"
      headerAction={
        <Button onClick={openCustom} className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Message libre
        </Button>
      }
    >
      {/* Segment chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
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
                {segmentLabels[t.suggestedSegment]?.label}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* History */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Historique des envois</h2>
      <div className="space-y-2">
        {campaigns.slice(0, 20).map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className="p-3.5 rounded-xl bg-card border border-border/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Megaphone className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-medium truncate">{c.message}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {new Date(c.sent_at).toLocaleDateString("fr-FR")}
            </span>
          </motion.div>
        ))}
        {campaigns.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune campagne envoyée</p>
            <p className="text-xs mt-1">Choisissez un modèle ci-dessus pour commencer</p>
          </div>
        )}
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
                  <Pencil className="w-4 h-4" /> Message personnalisé
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Segment */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Envoyer à</Label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as Segment })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(segmentLabels) as [Segment, typeof segmentLabels.all][]).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label} ({segmentCounts[key] || 0})
                    </SelectItem>
                  ))}
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
              disabled={sending || !form.message.trim()}
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
