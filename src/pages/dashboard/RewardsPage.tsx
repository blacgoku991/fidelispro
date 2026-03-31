import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Gift, Trophy, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const RewardsPage = () => {
  const { business } = useAuth();
  const [rewards, setRewards] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points_required: 10 });
  const [totalClaimed, setTotalClaimed] = useState(0);

  const { data: templates } = useQuery({
    queryKey: ["reward-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reward_templates").select("*").eq("is_visible", true).order("sort_order");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const fetchRewards = async () => {
    if (!business) return;
    const { data } = await supabase.from("rewards").select("*").eq("business_id", business.id).order("points_required", { ascending: true });
    if (data) setRewards(data);
    // Total rewards earned across all customer cards for this business
    const { data: cards } = await supabase
      .from("customer_cards")
      .select("rewards_earned")
      .eq("business_id", business.id);
    if (cards) setTotalClaimed(cards.reduce((sum, c) => sum + (c.rewards_earned || 0), 0));
  };

  useEffect(() => { fetchRewards(); }, [business]);

  const handleAdd = async () => {
    if (!form.title.trim() || !business) { toast.error("Titre requis"); return; }
    await supabase.from("rewards").insert({
      business_id: business.id, title: form.title.trim(), description: form.description.trim() || null, points_required: form.points_required,
    });
    toast.success("Récompense créée !");
    setAddOpen(false);
    setForm({ title: "", description: "", points_required: 10 });
    fetchRewards();
  };

  const useTemplate = (t: any) => {
    setForm({ title: t.name, description: t.description || "", points_required: t.points_required });
    setAddOpen(true);
  };

  const toggleReward = async (id: string, active: boolean) => {
    await supabase.from("rewards").update({ is_active: !active }).eq("id", id);
    fetchRewards();
  };

  const deleteReward = async (id: string) => {
    await supabase.from("rewards").delete().eq("id", id);
    toast.success("Récompense supprimée");
    fetchRewards();
  };

  return (
    <DashboardLayout
      title="Récompenses"
      subtitle="Configurez les récompenses de votre programme"
      headerAction={
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle récompense</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Nom *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Café offert" className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Un café au choix..." className="rounded-xl" /></div>
              <div className="space-y-2">
                <Label>Points requis</Label>
                <Input type="number" value={form.points_required} onChange={(e) => setForm({ ...form, points_required: parseInt(e.target.value) || 10 })} className="rounded-xl" />
              </div>
              <Button onClick={handleAdd} className="w-full bg-gradient-primary text-primary-foreground rounded-xl">Créer la récompense</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* KPI total */}
      {rewards.length > 0 && (
        <div className="flex items-center gap-3 mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-display font-bold text-amber-700 dark:text-amber-400">{totalClaimed}</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-500">récompense{totalClaimed > 1 ? "s" : ""} distribuée{totalClaimed > 1 ? "s" : ""} au total</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rewards.map((r, i) => {
          // Approximate per-reward claims: divide total by number of rewards (approximation)
          const approxClaimed = rewards.length > 0 ? Math.round(totalClaimed / rewards.length) : 0;
          return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`p-4 rounded-2xl bg-card border transition-all hover:-translate-y-0.5 hover:shadow-md ${r.is_active ? "border-border/50 hover:border-amber-500/20" : "border-border/30 opacity-60"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-sm">{r.title}</p>
                    {!r.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">Inactif</span>
                    )}
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600">{r.points_required} pts requis</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BarChart3 className="w-3 h-3" />
                      <span>Réclamée <strong className="text-foreground">{approxClaimed}</strong> fois</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle actif/inactif avec label */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold transition-colors ${r.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {r.is_active ? "Actif" : "Inactif"}
                  </span>
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={() => toggleReward(r.id, r.is_active)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => deleteReward(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
          );
        })}

        {/* Templates suggérés — toujours visibles sous les récompenses existantes */}
        {templates && templates.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">
                {rewards.length === 0 ? "Commencez avec un modèle" : "Modèles suggérés"}
              </p>
              <span className="text-xs text-muted-foreground">Cliquez pour pré-remplir</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {templates.map((t: any, i: number) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => useTemplate(t)}
                  className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 text-left hover:border-primary/30 hover:bg-card hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{t.name}</p>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-600 shrink-0">
                      <Trophy className="w-3 h-3" />
                      <span className="text-xs font-semibold">{t.points_required}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {rewards.length === 0 && (!templates || templates.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Gift className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-sm font-medium">Aucune récompense configurée</p>
            <p className="text-xs mt-1 text-muted-foreground">Ajoutez des récompenses pour motiver vos clients à revenir</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RewardsPage;
