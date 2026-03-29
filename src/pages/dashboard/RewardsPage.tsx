import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, Gift, Trophy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const RewardsPage = () => {
  const { business } = useAuth();
  const [rewards, setRewards] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points_required: 10 });

  const fetchRewards = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("rewards")
      .select("*")
      .eq("business_id", business.id)
      .order("points_required", { ascending: true });
    if (data) setRewards(data);
  };

  useEffect(() => { fetchRewards(); }, [business]);

  const handleAdd = async () => {
    if (!form.title.trim() || !business) { toast.error("Titre requis"); return; }
    await supabase.from("rewards").insert({
      business_id: business.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      points_required: form.points_required,
    });
    toast.success("Récompense créée !");
    setAddOpen(false);
    setForm({ title: "", description: "", points_required: 10 });
    fetchRewards();
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
            <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle récompense</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Café offert" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Un café au choix..." className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Points requis</Label>
                <Input type="number" value={form.points_required} onChange={(e) => setForm({ ...form, points_required: parseInt(e.target.value) || 10 })} className="rounded-xl" />
              </div>
              <Button onClick={handleAdd} className="w-full bg-gradient-primary text-primary-foreground rounded-xl">Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-3">
        {rewards.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm">{r.title}</p>
                {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                <Trophy className="w-3 h-3" /> {r.points_required} pts
              </Badge>
              <Switch checked={r.is_active} onCheckedChange={() => toggleReward(r.id, r.is_active)} />
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => deleteReward(r.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
        {rewards.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune récompense configurée</p>
            <p className="text-xs mt-1">Ajoutez des récompenses pour motiver vos clients</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RewardsPage;
