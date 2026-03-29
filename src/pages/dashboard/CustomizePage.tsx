import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { LogoUpload } from "@/components/dashboard/LogoUpload";
import { TemplatePicker } from "@/components/dashboard/TemplatePicker";
import { FeatureToggles } from "@/components/dashboard/FeatureToggles";
import { defaultConfig, type BusinessConfig, type BusinessTemplate } from "@/lib/businessTemplates";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import {
  Save, Palette, CreditCard, Bell, Zap, Shield, Layout, Users, Download, Copy, Printer, ExternalLink, Link, MapPin, Radar, Navigation,
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
  const { user, business } = useAuth();
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

  // QR code helpers
  const publicUrl = `${window.location.origin}/b/${business?.id}`;
  const copyLink = () => { navigator.clipboard.writeText(publicUrl); toast.success("Lien copié !"); };
  const downloadQR = () => {
    const svg = document.getElementById("business-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => { ctx?.drawImage(img, 0, 0, 1024, 1024); const a = document.createElement("a"); a.download = `qr-${business?.name || "fidelipro"}.png`; a.href = canvas.toDataURL("image/png"); a.click(); };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <DashboardLayout
      title="Personnalisation"
      subtitle="Configurez entièrement votre programme de fidélité"
      headerAction={
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground rounded-xl gap-2">
          <Save className="w-4 h-4" /> {saving ? "..." : "Sauvegarder"}
        </Button>
      }
    >
      <Tabs defaultValue="branding" className="space-y-5">
        <TabsList className="bg-secondary/50 rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="branding" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card"><Palette className="w-3.5 h-3.5" />Marque</TabsTrigger>
          <TabsTrigger value="card" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card"><CreditCard className="w-3.5 h-3.5" />Carte</TabsTrigger>
          <TabsTrigger value="loyalty" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card"><Zap className="w-3.5 h-3.5" />Fidélité</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card"><Bell className="w-3.5 h-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="qrcode" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card"><Link className="w-3.5 h-3.5" />QR Vitrine</TabsTrigger>
          <TabsTrigger value="template" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card"><Layout className="w-3.5 h-3.5" />Template</TabsTrigger>
          <TabsTrigger value="features" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-card"><Shield className="w-3.5 h-3.5" />Modules</TabsTrigger>
        </TabsList>

        {/* === BRANDING === */}
        <TabsContent value="branding">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold text-sm">Identité</h2>
              <div>
                <Label className="mb-2 block text-xs">Logo</Label>
                {business && <LogoUpload currentUrl={logoUrl} businessId={business.id} onUploaded={(url) => setLogoUrl(url)} />}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nom du commerce</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="rounded-xl text-sm" placeholder="Décrivez votre commerce..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => update("category", v)}>
                    <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Adresse</Label>
                  <Input value={form.address} onChange={(e) => update("address", e.target.value)} className="rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ville</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl text-sm" />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold text-sm">Couleurs</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Principale</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" />
                    <Input value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Secondaire</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" />
                    <Input value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input value={form.website} onChange={(e) => update("website", e.target.value)} className="rounded-xl text-sm" placeholder="https://..." />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === CARD === */}
        <TabsContent value="card">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold text-sm">Design de la carte</h2>
              <div className="space-y-1.5">
                <Label className="text-xs">Style</Label>
                <Select value={form.card_style} onValueChange={(v) => update("card_style", v)}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cardStyles.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type de fond</Label>
                <Select value={form.card_bg_type} onValueChange={(v) => update("card_bg_type", v as "solid" | "gradient" | "image")}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Couleur unie</SelectItem>
                    <SelectItem value="gradient">Dégradé</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xs font-medium text-muted-foreground">Éléments visibles</h3>
                {[
                  { key: "show_customer_name" as const, label: "Nom du client" },
                  { key: "show_qr_code" as const, label: "QR Code" },
                  { key: "show_points" as const, label: "Points / Progression" },
                  { key: "show_expiration" as const, label: "Date d'expiration" },
                  { key: "show_rewards_preview" as const, label: "Aperçu récompense" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-0.5">
                    <span className="text-sm">{item.label}</span>
                    <Switch checked={form[item.key]} onCheckedChange={(v) => update(item.key, v)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/50">
              <h2 className="font-display font-semibold text-sm mb-4">Aperçu</h2>
              <div className="flex justify-center">
                <LoyaltyCard
                  businessName={form.name || "Mon Commerce"}
                  customerName="Client exemple"
                  points={7}
                  maxPoints={form.max_points_per_card}
                  level="gold"
                  cardId={`preview-${user?.id?.slice(0, 8) || "demo"}`}
                  logoUrl={logoUrl || undefined}
                  accentColor={form.primary_color}
                  secondaryColor={form.secondary_color}
                  rewardDescription={form.reward_description}
                  rewardsEarned={2}
                  showQr={form.show_qr_code}
                  showPoints={form.show_points}
                  showCustomerName={form.show_customer_name}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === LOYALTY === */}
        <TabsContent value="loyalty">
          <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4 max-w-2xl">
            <h2 className="font-display font-semibold text-sm">Programme de fidélité</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: "points", emoji: "⭐", label: "Points", desc: "Par visite" },
                { val: "stamps", emoji: "🎯", label: "Tampons", desc: "Par visite" },
                { val: "cashback", emoji: "💰", label: "Cashback", desc: "% sur achats" },
              ].map((type) => (
                <button
                  key={type.val}
                  onClick={() => update("loyalty_type", type.val as "points" | "stamps" | "cashback")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.loyalty_type === type.val ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  <span className="text-lg">{type.emoji}</span>
                  <p className="font-semibold text-xs mt-1">{type.label}</p>
                  <p className="text-[11px] text-muted-foreground">{type.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{form.loyalty_type === "stamps" ? "Tampons pour récompense" : "Points max par carte"}</Label>
                <Input type="number" value={form.max_points_per_card} onChange={(e) => update("max_points_per_card", parseInt(e.target.value) || 10)} className="rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{form.loyalty_type === "cashback" ? "Points par euro" : "Points par visite"}</Label>
                <Input
                  type="number"
                  value={form.loyalty_type === "cashback" ? form.points_per_euro : form.points_per_visit}
                  onChange={(e) => update(form.loyalty_type === "cashback" ? "points_per_euro" : "points_per_visit", parseInt(e.target.value) || 1)}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Récompense</Label>
              <Input value={form.reward_description} onChange={(e) => update("reward_description", e.target.value)} className="rounded-xl text-sm" placeholder="Café offert !" />
            </div>

            {/* Onboarding mode */}
            <div className="pt-3 border-t border-border/50 space-y-3">
              <Label className="text-xs">Mode d'inscription client</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: "instant", emoji: "⚡", label: "Instantané" },
                  { val: "email", emoji: "📧", label: "Email requis" },
                  { val: "phone", emoji: "📱", label: "Tél. requis" },
                ].map((mode) => (
                  <button
                    key={mode.val}
                    onClick={() => update("onboarding_mode", mode.val as "instant" | "email" | "phone")}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all text-xs ${
                      form.onboarding_mode === mode.val ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <span className="text-lg block">{mode.emoji}</span>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === NOTIFICATIONS === */}
        <TabsContent value="notifications">
          <div className="space-y-4 max-w-2xl">
            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold text-sm">Fréquence & horaires</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Notifications activées</p>
                  <p className="text-xs text-muted-foreground">Envoyer des notifications aux clients</p>
                </div>
                <Switch checked={form.auto_notifications} onCheckedChange={(v) => update("auto_notifications", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fréquence max</Label>
                <Select value={form.notif_frequency} onValueChange={(v) => update("notif_frequency", v as BusinessConfig["notif_frequency"])}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Illimité</SelectItem>
                    <SelectItem value="daily">1/jour</SelectItem>
                    <SelectItem value="weekly">1/semaine</SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.notif_frequency === "custom" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Intervalle min (heures)</Label>
                  <Input type="number" value={form.notif_custom_interval_hours} onChange={(e) => update("notif_custom_interval_hours", parseInt(e.target.value) || 24)} className="rounded-xl text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Début</Label>
                  <Input type="time" value={form.notif_time_start} onChange={(e) => update("notif_time_start", e.target.value)} className="rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fin</Label>
                  <Input type="time" value={form.notif_time_end} onChange={(e) => update("notif_time_end", e.target.value)} className="rounded-xl text-sm" />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold text-sm">Géofencing</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Notifications par proximité</p>
                  <p className="text-xs text-muted-foreground">Alerter quand les clients passent à proximité</p>
                </div>
                <Switch checked={form.geofence_enabled} onCheckedChange={(v) => update("geofence_enabled", v)} />
              </div>
              {form.geofence_enabled && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Rayon</Label>
                  <Select value={String(form.geofence_radius)} onValueChange={(v) => update("geofence_radius", parseInt(v))}>
                    <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100m</SelectItem>
                      <SelectItem value="200">200m</SelectItem>
                      <SelectItem value="500">500m</SelectItem>
                      <SelectItem value="1000">1 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
              <h2 className="font-display font-semibold text-sm">Relance auto</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Relance des inactifs</p>
                  <p className="text-xs text-muted-foreground">Rappel après X jours d'inactivité</p>
                </div>
                <Switch checked={form.auto_reminder_enabled} onCheckedChange={(v) => update("auto_reminder_enabled", v)} />
              </div>
              {form.auto_reminder_enabled && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Jours d'inactivité</Label>
                  <Input type="number" value={form.auto_reminder_days} onChange={(e) => update("auto_reminder_days", parseInt(e.target.value) || 7)} className="rounded-xl text-sm" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Seuil d'alerte récompense</Label>
                <Input type="number" value={form.reward_alert_threshold} onChange={(e) => update("reward_alert_threshold", parseInt(e.target.value) || 2)} className="rounded-xl text-sm" />
                <p className="text-[11px] text-muted-foreground">Rappel quand le client est à {form.reward_alert_threshold} points de sa récompense</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === QR CODE === */}
        <TabsContent value="qrcode">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* QR Code display */}
            <div className="p-6 rounded-2xl bg-card border border-border/50 flex flex-col items-center space-y-5">
              <h2 className="font-display font-semibold text-sm self-start">Votre QR Code vitrine</h2>

              {/* QR Preview with brand frame */}
              <div
                id="qr-printable"
                className="relative p-8 rounded-3xl flex flex-col items-center gap-4"
                style={{
                  background: `linear-gradient(145deg, ${form.primary_color}12 0%, ${form.secondary_color || form.primary_color}08 100%)`,
                  border: `2px solid ${form.primary_color}20`,
                }}
              >
                {logoUrl && (
                  <img src={logoUrl} alt={form.name} className="w-12 h-12 rounded-xl object-cover" />
                )}
                <div className="p-4 bg-background rounded-2xl shadow-sm">
                  <QRCodeSVG
                    id="business-qr-svg"
                    value={publicUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor={form.primary_color || "#6B46C1"}
                  />
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-sm">{form.name || "Mon Commerce"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Scannez pour votre carte de fidélité</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={downloadQR} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Télécharger PNG
                </Button>
                <Button onClick={copyLink} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                  <Copy className="w-3.5 h-3.5" /> Copier le lien
                </Button>
                <Button
                  onClick={() => {
                    const printContent = document.getElementById("qr-printable");
                    if (!printContent) return;
                    const w = window.open("", "_blank");
                    if (!w) return;
                    w.document.write(`<!DOCTYPE html><html><head><title>QR Code - ${form.name}</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;}</style></head><body>${printContent.outerHTML}</body></html>`);
                    w.document.close();
                    w.focus();
                    w.print();
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer
                </Button>
              </div>
            </div>

            {/* Instructions + Link */}
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
                <h2 className="font-display font-semibold text-sm">Comment ça marche</h2>
                {[
                  { step: "1", emoji: "🖨️", title: "Imprimez ou affichez le QR", desc: "Vitrine, comptoir, menu, flyer..." },
                  { step: "2", emoji: "📱", title: "Le client scanne", desc: "Appareil photo ou application QR" },
                  { step: "3", emoji: "🎉", title: "Carte créée en 10 sec", desc: "Inscription instantanée et gratuite" },
                ].map((s) => (
                  <div key={s.step} className="flex gap-3 items-start">
                    <span className="text-xl">{s.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-3">
                <h2 className="font-display font-semibold text-sm">Lien direct</h2>
                <p className="text-xs text-muted-foreground">Partagez ce lien sur vos réseaux sociaux, votre site web ou par email.</p>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] bg-secondary px-3 py-2 rounded-xl flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{publicUrl}</code>
                  <Button size="icon" variant="outline" className="rounded-xl h-9 w-9 shrink-0" onClick={copyLink}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-xl h-9 w-9 shrink-0" onClick={() => window.open(publicUrl, "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === TEMPLATE === */}
        <TabsContent value="template">
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <h2 className="font-display font-semibold text-sm mb-1">Template métier</h2>
            <p className="text-xs text-muted-foreground mb-5">Pré-configurez votre programme selon votre activité</p>
            <TemplatePicker currentTemplate={form.business_template} onSelect={handleTemplateSelect} />
          </div>
        </TabsContent>

        {/* === FEATURES === */}
        <TabsContent value="features">
          <div className="p-5 rounded-2xl bg-card border border-border/50 max-w-2xl">
            <h2 className="font-display font-semibold text-sm mb-4">Modules</h2>
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
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CustomizePage;
