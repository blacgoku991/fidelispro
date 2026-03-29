import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { businessSidebarItems } from "@/lib/sidebarItems";
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
import { Send, Users, Zap, Clock, Crown, Megaphone, Gift, PartyPopper, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { WalletDebugPanel } from "@/components/dashboard/WalletDebugPanel";

type Segment = "all" | "active" | "inactive" | "vip" | "close_to_reward";
type Tone = "offer" | "urgent" | "event" | "simple";

const segmentLabels: Record<Segment, { label: string; desc: string; icon: React.ElementType }> = {
  all: { label: "Tous les clients", desc: "Envoyer à tous", icon: Users },
  active: { label: "Clients actifs", desc: "Visite dans les 7 derniers jours", icon: Zap },
  inactive: { label: "Clients inactifs", desc: "Aucune visite depuis 30+ jours", icon: Clock },
  vip: { label: "Clients VIP", desc: "Niveau Gold", icon: Crown },
  close_to_reward: { label: "Proches récompense", desc: "À 2 points ou moins", icon: Zap },
};

const toneOptions: { value: Tone; emoji: string; label: string }[] = [
  { value: "offer", emoji: "🎁", label: "Offre spéciale" },
  { value: "urgent", emoji: "⚡", label: "Urgence / Flash" },
  { value: "event", emoji: "🎉", label: "Événement" },
  { value: "simple", emoji: "💬", label: "Message simple" },
];

const MAX_MESSAGE_LENGTH = 100;

const CampaignsPage = () => {
  const { loading, business, logout } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ message: "", segment: "all" as Segment, tone: "offer" as Tone });
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
      .limit(50);
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
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte("last_visit_at", sevenDaysAgo.toISOString());
    } else if (segment === "inactive") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.or(`last_visit_at.is.null,last_visit_at.lt.${thirtyDaysAgo.toISOString()}`);
    } else if (segment === "vip") {
      query = query.eq("level", "gold");
    }

    const { data } = await query;
    return data || [];
  };

  const handleSendCampaign = async () => {
    if (!form.message.trim() || !business) {
      toast.error("Veuillez écrire un message");
      return;
    }
    setSending(true);

    const customers = await getTargetCustomers(form.segment);
    if (customers.length === 0) {
      toast.error("Aucun client dans ce segment");
      setSending(false);
      return;
    }

    const title = business.name;
    const message = form.message.trim();

    // Insert notification logs
    const logs = customers.map(c => ({
      business_id: business.id,
      customer_id: c.id,
      title,
      message,
      type: "custom" as const,
    }));

    const { error } = await supabase.from("notifications_log").insert(logs);
    if (error) {
      toast.error("Erreur d'envoi");
      setSending(false);
      return;
    }

    // Trigger Wallet pass updates
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/wallet-push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: business.id,
            action_type: "campaign",
            change_message: message,
          }),
        }
      );
      const walletResult = await res.json();
      if (walletResult.pushed > 0) {
        toast.success(`Campagne envoyée à ${customers.length} client(s) + ${walletResult.pushed} carte(s) Wallet mises à jour !`);
      } else {
        toast.success(`Campagne envoyée à ${customers.length} client(s) !`);
      }
    } catch (walletErr) {
      console.error("Wallet push error:", walletErr);
      toast.success(`Campagne envoyée à ${customers.length} client(s) !`);
    }

    setSendOpen(false);
    setForm({ message: "", segment: "all", tone: "offer" });
    fetchCampaigns();
    setSending(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const businessName = business?.name || "Mon Commerce";

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={businessSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} items={businessSidebarItems} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Campagnes</h1>
            <p className="text-sm text-muted-foreground">Envoyez des messages ciblés à vos clients</p>
          </div>
          <Dialog open={sendOpen} onOpenChange={setSendOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
                <Send className="w-4 h-4" /> Nouvelle campagne
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Envoyer une campagne</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Segment */}
                <div className="space-y-2">
                  <Label>Segment</Label>
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
                  <p className="text-xs text-muted-foreground">{segmentLabels[form.segment].desc}</p>
                </div>

                {/* Tone selector */}
                <div className="space-y-2">
                  <Label>Ton du message</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {toneOptions.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, tone: t.value })}
                        className={`p-2 rounded-xl border text-center text-xs transition-all ${
                          form.tone === t.value
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border/50 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <span className="text-lg block mb-0.5">{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Message</Label>
                    <span className={`text-xs ${form.message.length > MAX_MESSAGE_LENGTH ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {form.message.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    value={form.message}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                        setForm({ ...form, message: e.target.value });
                      }
                    }}
                    placeholder="Ex: -20% sur toute la carte aujourd'hui seulement 🎉"
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>

                {/* Live iPhone notification preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Aperçu notification iPhone</Label>
                  <div className="rounded-2xl bg-muted/60 p-4 border border-border/30">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          {businessName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">{businessName}</p>
                          <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">maintenant</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">
                          {form.message || "Votre message apparaîtra ici…"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSendCampaign}
                  disabled={sending || !form.message.trim()}
                  className="w-full bg-gradient-primary text-primary-foreground rounded-xl gap-2"
                >
                  <Send className="w-4 h-4" /> {sending ? "Envoi..." : `Envoyer à ${segmentCounts[form.segment] || 0} client(s)`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Segment overview */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {(Object.entries(segmentLabels) as [Segment, typeof segmentLabels.all][]).map(([key, val]) => {
            const Icon = val.icon;
            return (
              <div key={key} className="p-4 rounded-2xl bg-card border border-border/50 text-center">
                <Icon className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-display font-bold">{segmentCounts[key] || 0}</p>
                <p className="text-xs text-muted-foreground">{val.label}</p>
              </div>
            );
          })}
        </div>

        {/* Campaign history */}
        <h2 className="font-display font-semibold mb-3">Historique</h2>
        <div className="space-y-2">
          {campaigns.slice(0, 20).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Megaphone className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.message.slice(0, 80)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{c.type}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(c.sent_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </motion.div>
          ))}
          {campaigns.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune campagne envoyée</p>
            </div>
          )}
        </div>

        {/* Wallet Debug Panel */}
        {business && (
          <div className="mt-8">
            <WalletDebugPanel businessId={business.id} />
          </div>
        )}
      </main>
    </div>
  );
};

export default CampaignsPage;
