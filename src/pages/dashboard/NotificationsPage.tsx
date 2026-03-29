import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, CreditCard, Users, QrCode, Bell, Settings, Palette,
  Plus, MapPin, MessageSquare, Zap, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "Cartes", path: "/dashboard/cards" },
  { icon: Users, label: "Clients", path: "/dashboard/clients" },
  { icon: QrCode, label: "Scanner", path: "/dashboard/scanner" },
  { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
  { icon: Palette, label: "Personnalisation", path: "/dashboard/customize" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  proximity: { label: "Proximité", icon: MapPin, color: "bg-blue-100 text-blue-800" },
  points_reminder: { label: "Rappel points", icon: Zap, color: "bg-purple-100 text-purple-800" },
  special_offer: { label: "Offre spéciale", icon: MessageSquare, color: "bg-emerald-100 text-emerald-800" },
  win_back: { label: "Relance", icon: Clock, color: "bg-orange-100 text-orange-800" },
  reward_earned: { label: "Récompense", icon: Zap, color: "bg-yellow-100 text-yellow-800" },
  custom: { label: "Personnalisé", icon: MessageSquare, color: "bg-slate-100 text-slate-700" },
};

const NotificationsPage = () => {
  const { loading, business, logout } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    type: "proximity" as string,
    title: "",
    message: "",
    trigger_distance: 200,
    trigger_days_inactive: 10,
    trigger_points_remaining: 2,
  });
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(200);
  const [autoNotif, setAutoNotif] = useState(false);

  useEffect(() => {
    if (!business) return;
    setGeofenceEnabled(business.geofence_enabled);
    setGeofenceRadius(business.geofence_radius);
    setAutoNotif(business.auto_notifications);
    fetchTemplates();
  }, [business]);

  const fetchTemplates = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    if (data) setTemplates(data);
  };

  const handleSaveSettings = async () => {
    if (!business) return;
    await supabase.from("businesses").update({
      geofence_enabled: geofenceEnabled,
      geofence_radius: geofenceRadius,
      auto_notifications: autoNotif,
    }).eq("id", business.id);
    toast.success("Paramètres sauvegardés");
  };

  const handleAddTemplate = async () => {
    if (!form.title.trim() || !form.message.trim() || !business) {
      toast.error("Titre et message requis");
      return;
    }
    await supabase.from("notification_templates").insert({
      business_id: business.id,
      type: form.type,
      title: form.title,
      message: form.message,
      trigger_distance: form.type === "proximity" ? form.trigger_distance : null,
      trigger_days_inactive: form.type === "win_back" ? form.trigger_days_inactive : null,
      trigger_points_remaining: form.type === "points_reminder" ? form.trigger_points_remaining : null,
    });
    toast.success("Template créé !");
    setAddOpen(false);
    setForm({ type: "proximity", title: "", message: "", trigger_distance: 200, trigger_days_inactive: 10, trigger_points_remaining: 2 });
    fetchTemplates();
  };

  const toggleTemplate = async (id: string, active: boolean) => {
    await supabase.from("notification_templates").update({ is_active: !active }).eq("id", id);
    fetchTemplates();
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={sidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Gérez vos notifications automatiques et géolocalisées</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Nouveau template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouveau template de notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proximity">📍 Proximité (géofencing)</SelectItem>
                      <SelectItem value="points_reminder">⚡ Rappel de points</SelectItem>
                      <SelectItem value="special_offer">🎁 Offre spéciale</SelectItem>
                      <SelectItem value="win_back">⏰ Relance inactif</SelectItem>
                      <SelectItem value="reward_earned">🏆 Récompense gagnée</SelectItem>
                      <SelectItem value="custom">💬 Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Votre boucherie vous attend !" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Passez nous voir aujourd'hui..." className="rounded-xl" />
                </div>
                {form.type === "proximity" && (
                  <div className="space-y-2">
                    <Label>Distance de déclenchement (mètres)</Label>
                    <Input type="number" value={form.trigger_distance} onChange={(e) => setForm({ ...form, trigger_distance: parseInt(e.target.value) || 200 })} className="rounded-xl" />
                  </div>
                )}
                {form.type === "win_back" && (
                  <div className="space-y-2">
                    <Label>Jours d'inactivité avant relance</Label>
                    <Input type="number" value={form.trigger_days_inactive} onChange={(e) => setForm({ ...form, trigger_days_inactive: parseInt(e.target.value) || 10 })} className="rounded-xl" />
                  </div>
                )}
                {form.type === "points_reminder" && (
                  <div className="space-y-2">
                    <Label>Points restants pour déclencher</Label>
                    <Input type="number" value={form.trigger_points_remaining} onChange={(e) => setForm({ ...form, trigger_points_remaining: parseInt(e.target.value) || 2 })} className="rounded-xl" />
                  </div>
                )}
                <Button onClick={handleAddTemplate} className="w-full bg-gradient-primary text-primary-foreground rounded-xl">
                  Créer le template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Geofencing settings */}
        <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Paramètres de géolocalisation
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Géofencing activé</p>
                <p className="text-xs text-muted-foreground">Notifications automatiques par proximité</p>
              </div>
              <Switch checked={geofenceEnabled} onCheckedChange={setGeofenceEnabled} />
            </div>
            <div className="space-y-2">
              <Label>Rayon de détection (mètres)</Label>
              <Select value={String(geofenceRadius)} onValueChange={(v) => setGeofenceRadius(parseInt(v))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100m</SelectItem>
                  <SelectItem value="200">200m</SelectItem>
                  <SelectItem value="500">500m</SelectItem>
                  <SelectItem value="1000">1km</SelectItem>
                  <SelectItem value="2000">2km</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Notifications automatiques</p>
                <p className="text-xs text-muted-foreground">Envoyer automatiquement les relances</p>
              </div>
              <Switch checked={autoNotif} onCheckedChange={setAutoNotif} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSaveSettings} className="rounded-xl">Sauvegarder</Button>
            </div>
          </div>
        </div>

        {/* Templates list */}
        <div className="space-y-3">
          {templates.map((t, i) => {
            const typeInfo = typeLabels[t.type] || typeLabels.custom;
            const TypeIcon = typeInfo.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeInfo.color}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.message.slice(0, 60)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                  <Switch checked={t.is_active} onCheckedChange={() => toggleTemplate(t.id, t.is_active)} />
                </div>
              </motion.div>
            );
          })}
          {templates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun template de notification</p>
              <p className="text-xs mt-1">Créez votre premier template pour commencer</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
