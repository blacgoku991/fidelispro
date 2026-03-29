import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, CreditCard, Users, QrCode, Bell, Settings, Palette,
  Save,
} from "lucide-react";
import { toast } from "sonner";

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "Cartes", path: "/dashboard/cards" },
  { icon: Users, label: "Clients", path: "/dashboard/clients" },
  { icon: QrCode, label: "Scanner", path: "/dashboard/scanner" },
  { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
  { icon: Palette, label: "Personnalisation", path: "/dashboard/customize" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

const cardStyles = [
  { value: "classic", label: "Classique" },
  { value: "luxury", label: "Luxe" },
  { value: "coffee", label: "Coffee Shop" },
  { value: "barber", label: "Barbier" },
  { value: "restaurant", label: "Restaurant" },
  { value: "neon", label: "Néon" },
];

const CustomizePage = () => {
  const { user, loading, business, logout } = useAuth();
  const [form, setForm] = useState({
    name: "",
    description: "",
    primary_color: "#6B46C1",
    secondary_color: "#F6AD55",
    card_style: "classic",
    max_points_per_card: 10,
    reward_description: "Récompense offerte !",
    address: "",
    city: "",
    phone: "",
    website: "",
    category: "general",
  });

  useEffect(() => {
    if (!business) return;
    setForm({
      name: business.name || "",
      description: business.description || "",
      primary_color: business.primary_color || "#6B46C1",
      secondary_color: business.secondary_color || "#F6AD55",
      card_style: business.card_style || "classic",
      max_points_per_card: business.max_points_per_card || 10,
      reward_description: business.reward_description || "Récompense offerte !",
      address: business.address || "",
      city: business.city || "",
      phone: business.phone || "",
      website: business.website || "",
      category: business.category || "general",
    });
  }, [business]);

  const handleSave = async () => {
    if (!business) return;
    const { error } = await supabase.from("businesses").update(form).eq("id", business.id);
    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Personnalisation sauvegardée !");
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
            <h1 className="text-2xl font-display font-bold">Personnalisation</h1>
            <p className="text-sm text-muted-foreground">Configurez l'apparence de votre carte et votre commerce</p>
          </div>
          <Button onClick={handleSave} className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
            <Save className="w-4 h-4" /> Sauvegarder
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold">Informations du commerce</h2>
              <div className="space-y-2">
                <Label>Nom du commerce</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" placeholder="Décrivez votre commerce..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Général</SelectItem>
                      <SelectItem value="boucherie">Boucherie</SelectItem>
                      <SelectItem value="boulangerie">Boulangerie</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="cafe">Café</SelectItem>
                      <SelectItem value="coiffeur">Coiffeur</SelectItem>
                      <SelectItem value="barbier">Barbier</SelectItem>
                      <SelectItem value="fleuriste">Fleuriste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold">Carte de fidélité</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Couleur principale</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-10 h-10 rounded-lg border cursor-pointer" />
                    <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Couleur secondaire</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="w-10 h-10 rounded-lg border cursor-pointer" />
                    <Input value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Style de carte</Label>
                <Select value={form.card_style} onValueChange={(v) => setForm({ ...form, card_style: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cardStyles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Points max par carte</Label>
                  <Input type="number" value={form.max_points_per_card} onChange={(e) => setForm({ ...form, max_points_per_card: parseInt(e.target.value) || 10 })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Description récompense</Label>
                  <Input value={form.reward_description} onChange={(e) => setForm({ ...form, reward_description: e.target.value })} className="rounded-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h2 className="font-display font-semibold mb-6">Aperçu de la carte</h2>
              <div className="flex justify-center">
                <LoyaltyCard
                  businessName={form.name || "Mon Commerce"}
                  customerName="Client exemple"
                  points={7}
                  maxPoints={form.max_points_per_card}
                  level="gold"
                  cardId={`preview-${user?.id?.slice(0, 8) || "demo"}`}
                  accentColor={form.primary_color}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Récompense : {form.reward_description}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomizePage;
