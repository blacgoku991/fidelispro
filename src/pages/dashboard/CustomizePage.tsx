import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { LogoUpload } from "@/components/dashboard/LogoUpload";
import { TemplatePicker } from "@/components/dashboard/TemplatePicker";
import { FeatureToggles } from "@/components/dashboard/FeatureToggles";
import { businessSidebarItems } from "@/lib/sidebarItems";
import { defaultConfig, type BusinessConfig, type BusinessTemplate } from "@/lib/businessTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Save, Palette, CreditCard, Bell, Zap, Shield, Layout, Users,
} from "lucide-react";
import { toast } from "sonner";

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
  const [form, setForm] = useState<BusinessConfig & { name: string; description: string; address: string; city: string; phone: string; website: string }>(
    { ...defaultConfig, name: "", description: "", address: "", city: "", phone: "", website: "" }
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business) return;
    setForm({
      name: business.name || "",
      description: business.description || "",
      address: business.address || "",
      city: business.city || "",
      phone: business.phone || "",
      website: business.website || "",
      loyalty_type: business.loyalty_type || "points",
      max_points_per_card: business.max_points_per_card || 10,
      points_per_visit: business.points_per_visit || 1,
      points_per_euro: business.points_per_euro || 0,
      reward_description: business.reward_description || "Récompense offerte !",
      primary_color: business.primary_color || "#6B46C1",
      secondary_color: business.secondary_color || "#F6AD55",
      card_style: business.card_style || "classic",
      card_bg_type: business.card_bg_type || "gradient",
      show_customer_name: business.show_customer_name ?? true,
      show_qr_code: business.show_qr_code ?? true,
      show_points: business.show_points ?? true,
      show_expiration: business.show_expiration ?? false,
      show_rewards_preview: business.show_rewards_preview ?? true,
      notif_frequency: business.notif_frequency || "daily",
      notif_time_start: business.notif_time_start || "09:00",
      notif_time_end: business.notif_time_end || "20:00",
      notif_custom_interval_hours: business.notif_custom_interval_hours || 24,
      auto_notifications: business.auto_notifications ?? false,
      auto_reminder_enabled: business.auto_reminder_enabled ?? false,
      auto_reminder_days: business.auto_reminder_days || 7,
      reward_alert_threshold: business.reward_alert_threshold || 2,
      geofence_enabled: business.geofence_enabled ?? false,
      geofence_radius: business.geofence_radius || 200,
      onboarding_mode: business.onboarding_mode || "instant",
      feature_gamification: business.feature_gamification ?? true,
      feature_notifications: business.feature_notifications ?? true,
      feature_wallet: business.feature_wallet ?? false,
      feature_analytics: business.feature_analytics ?? true,
      category: business.category || "general",
      business_template: business.business_template || "custom",
    });
    setLogoUrl(business.logo_url || null);
  }, [business]);

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    const { name, description, address, city, phone, website, ...config } = form;
    const { error } = await supabase.from("businesses").update({
      name, description, address, city, phone, website, ...config,
    } as any).eq("id", business.id);
    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Configuration sauvegardée !");
    setSaving(false);
  };

  const handleTemplateSelect = (template: BusinessTemplate) => {
    setForm(prev => ({ ...prev, ...template.config }));
    toast.success(`Template "${template.label}" appliqué ! N'oubliez pas de sauvegarder.`);
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={businessSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Configuration</h1>
            <p className="text-sm text-muted-foreground">Personnalisez entièrement votre programme de fidélité</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
            <Save className="w-4 h-4" /> {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>

        <Tabs defaultValue="template" className="space-y-6">
          <TabsList className="bg-secondary/50 rounded-xl p-1 h-auto flex-wrap">
            <TabsTrigger value="template" className="rounded-lg gap-1.5 data-[state=active]:bg-card"><Layout className="w-3.5 h-3.5" />Template</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-lg gap-1.5 data-[state=active]:bg-card"><Palette className="w-3.5 h-3.5" />Branding</TabsTrigger>
            <TabsTrigger value="card" className="rounded-lg gap-1.5 data-[state=active]:bg-card"><CreditCard className="w-3.5 h-3.5" />Carte</TabsTrigger>
            <TabsTrigger value="loyalty" className="rounded-lg gap-1.5 data-[state=active]:bg-card"><Zap className="w-3.5 h-3.5" />Fidélité</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg gap-1.5 data-[state=active]:bg-card"><Bell className="w-3.5 h-3.5" />Notifications</TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg gap-1.5 data-[state=active]:bg-card"><Users className="w-3.5 h-3.5" />Clients</TabsTrigger>
            <TabsTrigger value="features" className="rounded-lg gap-1.5 data-[state=active]:bg-card"><Shield className="w-3.5 h-3.5" />Fonctionnalités</TabsTrigger>
          </TabsList>

          {/* === TEMPLATE === */}
          <TabsContent value="template">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h2 className="font-display font-semibold mb-2">Choisir un template métier</h2>
              <p className="text-sm text-muted-foreground mb-6">Sélectionnez un template pour pré-configurer votre programme selon votre activité. Vous pourrez tout modifier ensuite.</p>
              <TemplatePicker currentTemplate={form.business_template} onSelect={handleTemplateSelect} />
            </div>
          </TabsContent>

          {/* === BRANDING === */}
          <TabsContent value="branding">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5">
                <h2 className="font-display font-semibold">Identité de marque</h2>
                <div>
                  <Label className="mb-2 block">Logo</Label>
                  {business && (
                    <LogoUpload
                      currentUrl={logoUrl}
                      businessId={business.id}
                      onUploaded={(url) => setLogoUrl(url)}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nom du commerce</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="rounded-xl" placeholder="Décrivez votre commerce..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={form.category} onValueChange={(v) => update("category", v)}>
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
                    <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input value={form.address} onChange={(e) => update("address", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5">
                <h2 className="font-display font-semibold">Couleurs</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Couleur principale</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer" />
                      <Input value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur secondaire</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer" />
                      <Input value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="rounded-xl" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => update("website", e.target.value)} className="rounded-xl" placeholder="https://..." />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === CARD DESIGN === */}
          <TabsContent value="card">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5">
                <h2 className="font-display font-semibold">Design de la carte</h2>
                <div className="space-y-2">
                  <Label>Style de carte</Label>
                  <Select value={form.card_style} onValueChange={(v) => update("card_style", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cardStyles.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type de fond</Label>
                  <Select value={form.card_bg_type} onValueChange={(v) => update("card_bg_type", v as "solid" | "gradient" | "image")}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Couleur unie</SelectItem>
                      <SelectItem value="gradient">Dégradé</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Éléments visibles</h3>
                  <div className="space-y-2.5">
                    {[
                      { key: "show_customer_name" as const, label: "Nom du client" },
                      { key: "show_qr_code" as const, label: "QR Code" },
                      { key: "show_points" as const, label: "Points / Progression" },
                      { key: "show_expiration" as const, label: "Date d'expiration" },
                      { key: "show_rewards_preview" as const, label: "Aperçu récompense" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-1">
                        <span className="text-sm">{item.label}</span>
                        <Switch checked={form[item.key]} onCheckedChange={(v) => update(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-display font-semibold mb-6">Aperçu en direct</h2>
                <div className="flex justify-center">
                  <LoyaltyCard
                    businessName={form.name || "Mon Commerce"}
                    customerName={form.show_customer_name ? "Client exemple" : ""}
                    points={form.show_points ? 7 : 0}
                    maxPoints={form.max_points_per_card}
                    level="gold"
                    cardId={form.show_qr_code ? `preview-${user?.id?.slice(0, 8) || "demo"}` : ""}
                    accentColor={form.primary_color}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  {form.show_rewards_preview ? `Récompense : ${form.reward_description}` : ""}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* === LOYALTY === */}
          <TabsContent value="loyalty">
            <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5 max-w-2xl">
              <h2 className="font-display font-semibold">Système de fidélité</h2>

              <div className="space-y-2">
                <Label>Type de programme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: "points", emoji: "⭐", label: "Points", desc: "Points cumulés par visite" },
                    { val: "stamps", emoji: "🎯", label: "Tampons", desc: "Tampons à chaque visite" },
                    { val: "cashback", emoji: "💰", label: "Cashback", desc: "% de retour sur achats" },
                  ].map((type) => (
                    <button
                      key={type.val}
                      onClick={() => update("loyalty_type", type.val as "points" | "stamps" | "cashback")}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        form.loyalty_type === type.val
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xl">{type.emoji}</span>
                      <p className="font-semibold text-sm mt-1">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{form.loyalty_type === "stamps" ? "Tampons pour récompense" : "Points max par carte"}</Label>
                  <Input type="number" value={form.max_points_per_card} onChange={(e) => update("max_points_per_card", parseInt(e.target.value) || 10)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{form.loyalty_type === "cashback" ? "Points par euro dépensé" : "Points par visite"}</Label>
                  <Input
                    type="number"
                    value={form.loyalty_type === "cashback" ? form.points_per_euro : form.points_per_visit}
                    onChange={(e) => update(
                      form.loyalty_type === "cashback" ? "points_per_euro" : "points_per_visit",
                      parseInt(e.target.value) || 1
                    )}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description de la récompense</Label>
                <Input value={form.reward_description} onChange={(e) => update("reward_description", e.target.value)} className="rounded-xl" placeholder="Ex: Café offert !" />
              </div>
            </div>
          </TabsContent>

          {/* === NOTIFICATIONS === */}
          <TabsContent value="notifications">
            <div className="space-y-6 max-w-2xl">
              <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5">
                <h2 className="font-display font-semibold">Fréquence & horaires</h2>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Notifications activées</p>
                    <p className="text-xs text-muted-foreground">Envoyer des notifications aux clients</p>
                  </div>
                  <Switch checked={form.auto_notifications} onCheckedChange={(v) => update("auto_notifications", v)} />
                </div>

                <div className="space-y-2">
                  <Label>Fréquence maximale</Label>
                  <Select value={form.notif_frequency} onValueChange={(v) => update("notif_frequency", v as BusinessConfig["notif_frequency"])}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlimited">Illimité</SelectItem>
                      <SelectItem value="daily">1 par jour max</SelectItem>
                      <SelectItem value="weekly">1 par semaine max</SelectItem>
                      <SelectItem value="custom">Intervalle personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.notif_frequency === "custom" && (
                  <div className="space-y-2">
                    <Label>Intervalle minimum (heures)</Label>
                    <Input type="number" value={form.notif_custom_interval_hours} onChange={(e) => update("notif_custom_interval_hours", parseInt(e.target.value) || 24)} className="rounded-xl" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Heure de début</Label>
                    <Input type="time" value={form.notif_time_start} onChange={(e) => update("notif_time_start", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure de fin</Label>
                    <Input type="time" value={form.notif_time_end} onChange={(e) => update("notif_time_end", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5">
                <h2 className="font-display font-semibold">Géofencing</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Notifications par proximité</p>
                    <p className="text-xs text-muted-foreground">Alerter les clients quand ils passent à proximité</p>
                  </div>
                  <Switch checked={form.geofence_enabled} onCheckedChange={(v) => update("geofence_enabled", v)} />
                </div>
                {form.geofence_enabled && (
                  <div className="space-y-2">
                    <Label>Rayon de détection</Label>
                    <Select value={String(form.geofence_radius)} onValueChange={(v) => update("geofence_radius", parseInt(v))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100m</SelectItem>
                        <SelectItem value="200">200m</SelectItem>
                        <SelectItem value="500">500m</SelectItem>
                        <SelectItem value="1000">1 km</SelectItem>
                        <SelectItem value="2000">2 km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5">
                <h2 className="font-display font-semibold">Automatisations</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Relance automatique des inactifs</p>
                    <p className="text-xs text-muted-foreground">Envoyer un rappel après X jours d'inactivité</p>
                  </div>
                  <Switch checked={form.auto_reminder_enabled} onCheckedChange={(v) => update("auto_reminder_enabled", v)} />
                </div>
                {form.auto_reminder_enabled && (
                  <div className="space-y-2">
                    <Label>Jours d'inactivité avant relance</Label>
                    <Input type="number" value={form.auto_reminder_days} onChange={(e) => update("auto_reminder_days", parseInt(e.target.value) || 7)} className="rounded-xl" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Seuil d'alerte récompense (points restants)</Label>
                  <Input type="number" value={form.reward_alert_threshold} onChange={(e) => update("reward_alert_threshold", parseInt(e.target.value) || 2)} className="rounded-xl" />
                  <p className="text-xs text-muted-foreground">Le client reçoit un rappel quand il est à {form.reward_alert_threshold} points de sa récompense</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === CUSTOMERS === */}
          <TabsContent value="customers">
            <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5 max-w-2xl">
              <h2 className="font-display font-semibold">Expérience client</h2>

              <div className="space-y-2">
                <Label>Mode d'inscription</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: "instant", emoji: "⚡", label: "Instantané", desc: "Aucune donnée requise" },
                    { val: "email", emoji: "📧", label: "Email requis", desc: "Email obligatoire" },
                    { val: "phone", emoji: "📱", label: "Téléphone requis", desc: "N° de téléphone obligatoire" },
                  ].map((mode) => (
                    <button
                      key={mode.val}
                      onClick={() => update("onboarding_mode", mode.val as "instant" | "email" | "phone")}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        form.onboarding_mode === mode.val
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xl">{mode.emoji}</span>
                      <p className="font-semibold text-sm mt-1">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="text-sm font-medium">💡 Conseil</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Le mode "Instantané" génère le plus d'inscriptions. Les modes avec données permettent un meilleur suivi et les campagnes ciblées.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* === FEATURES === */}
          <TabsContent value="features">
            <div className="max-w-2xl">
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-display font-semibold mb-4">Activer / Désactiver</h2>
                <p className="text-sm text-muted-foreground mb-6">Choisissez les fonctionnalités que vous souhaitez utiliser</p>
                <FeatureToggles
                  config={{
                    feature_gamification: form.feature_gamification,
                    feature_notifications: form.feature_notifications,
                    feature_wallet: form.feature_wallet,
                    feature_analytics: form.feature_analytics,
                  }}
                  onChange={(key, value) => update(key as keyof typeof form, value as any)}
                  plan={business?.subscription_plan || "starter"}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CustomizePage;
