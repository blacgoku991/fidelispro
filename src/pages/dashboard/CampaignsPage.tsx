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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Users, Zap, Clock, Crown, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { WalletDebugPanel } from "@/components/dashboard/WalletDebugPanel";

type Segment = "all" | "active" | "inactive" | "vip" | "close_to_reward";

const segmentLabels: Record<Segment, { label: string; desc: string; icon: React.ElementType }> = {
  all: { label: "Tous", desc: "Envoyer à tous", icon: Users },
  active: { label: "Actifs", desc: "Visite dans les 7 derniers jours", icon: Zap },
  inactive: { label: "Inactifs", desc: "Aucune visite depuis 30+ jours", icon: Clock },
  vip: { label: "VIP", desc: "Niveau Gold", icon: Crown },
  close_to_reward: { label: "Proches récompense", desc: "À 2 points ou moins", icon: Zap },
};

const MAX_MESSAGE_LENGTH = 100;

const CampaignsPage = () => {
  const { business } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ message: "", segment: "all" as Segment });
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});

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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
    if (segment === "active") {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte("last_visit_at", d.toISOString());
    } else if (segment === "inactive") {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.or(`last_visit_at.is.null,last_visit_at.lt.${d.toISOString()}`);
    } else if (segment === "vip") {
      query = query.eq("level", "gold");
    }
    const { data } = await query;
    return data || [];
  };

  const handleSendCampaign = async () => {
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

    setSendOpen(false);
    setForm({ message: "", segment: "all" });
    fetchCampaigns();
    setSending(false);
  };

  const businessName = business?.name || "Mon Commerce";

  return (
    <DashboardLayout
      title="Campagnes"
      subtitle="Envoyez des messages ciblés à vos clients"
      headerAction={
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
              <Send className="w-4 h-4" /> Envoyer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouvelle campagne</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Segment</Label>
                <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as Segment })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(segmentLabels) as [Segment, typeof segmentLabels.all][]).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label} ({segmentCounts[key] || 0})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{segmentLabels[form.segment].desc}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message</Label>
                  <span className={`text-xs ${form.message.length > MAX_MESSAGE_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
                    {form.message.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
                <Textarea
                  value={form.message}
                  onChange={(e) => { if (e.target.value.length <= MAX_MESSAGE_LENGTH) setForm({ ...form, message: e.target.value }); }}
                  placeholder="Ex: -20% sur toute la carte aujourd'hui 🎉"
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>

              {/* iPhone notification preview */}
              <div className="rounded-2xl bg-muted/60 p-3.5 border border-border/30">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{businessName.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs truncate">{businessName}</p>
                      <span className="text-[10px] text-muted-foreground ml-2">maintenant</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{form.message || "Votre message ici…"}</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSendCampaign} disabled={sending || !form.message.trim()} className="w-full bg-gradient-primary text-primary-foreground rounded-xl gap-2">
                <Send className="w-4 h-4" /> {sending ? "Envoi..." : `Envoyer à ${segmentCounts[form.segment] || 0} client(s)`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Segments overview */}
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

      {/* History */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Historique</h2>
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
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.message}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(c.sent_at).toLocaleDateString("fr-FR")}</span>
          </motion.div>
        ))}
        {campaigns.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune campagne envoyée</p>
          </div>
        )}
      </div>

      {business && (
        <div className="mt-8">
          <WalletDebugPanel businessId={business.id} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default CampaignsPage;
