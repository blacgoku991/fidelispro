import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Shield, Crown, MapPin, Radar, Bell, Clock, Navigation, CreditCard, Check, Loader2, Sparkles, Gift, PartyPopper, Zap, Store, QrCode, ExternalLink, Copy, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import GeofenceMap from "@/components/dashboard/GeofenceMap";
import { toast } from "sonner";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripePlans";

const planLabels: Record<string, string> = {
  starter: "Starter — 29€/mois",
  pro: "Pro — 79€/mois",
  enterprise: "Enterprise — Sur devis",
};

const SettingsPage = () => {
  const { user, business } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Paiement réussi ! Votre abonnement est maintenant actif. 🎉");
    }
  }, []);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Vitrine / slug
  const [slug, setSlug] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const [showVitrineQr, setShowVitrineQr] = useState(false);

  // Automation settings
  const [birthdayEnabled, setBirthdayEnabled] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState("Joyeux anniversaire ! Un cadeau vous attend 🎂");
  const [welcomePushEnabled, setWelcomePushEnabled] = useState(true);
  const [welcomePushMessage, setWelcomePushMessage] = useState("Bienvenue ! Votre carte de fidélité est prête 🎉");
  const [vipAutoEnabled, setVipAutoEnabled] = useState(false);
  const [vipAutoThreshold, setVipAutoThreshold] = useState(50);
  const [savingAuto, setSavingAuto] = useState(false);

  // Geofencing
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoRadius, setGeoRadius] = useState(200);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoMessage, setGeoMessage] = useState("Passez nous voir, on vous attend ! 🎉");
  const [geoTimeStart, setGeoTimeStart] = useState("09:00");
  const [geoTimeEnd, setGeoTimeEnd] = useState("20:00");
  const [savingGeo, setSavingGeo] = useState(false);
  const [satellitePoints, setSatellitePoints] = useState<{ lat: number; lng: number }[]>([]);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<any>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (user) setEmail(user.email || "");
  }, [user]);

  useEffect(() => {
    if (business) {
      setSlug((business as any).slug || "");
    }
  }, [business]);

  useEffect(() => {
    if (business) {
      setBirthdayEnabled((business as any).birthday_notif_enabled || false);
      setBirthdayMessage((business as any).birthday_notif_message || "Joyeux anniversaire ! Un cadeau vous attend 🎂");
      setWelcomePushEnabled((business as any).welcome_push_enabled ?? true);
      setWelcomePushMessage((business as any).welcome_push_message || "Bienvenue ! Votre carte de fidélité est prête 🎉");
      setVipAutoEnabled((business as any).vip_auto_enabled || false);
      setVipAutoThreshold((business as any).vip_auto_threshold || 50);
    }
  }, [business]);

  useEffect(() => {
    if (business) {
      setGeoEnabled(business.geofence_enabled || false);
      setGeoRadius(business.geofence_radius || 200);
      setAddress(business.address || "");
      setLatitude(business.latitude || null);
      setLongitude(business.longitude || null);
      setGeoMessage(business.geofence_message || "Passez nous voir, on vous attend ! 🎉");
      setGeoTimeStart(business.geofence_time_start || "09:00");
      setGeoTimeEnd(business.geofence_time_end || "20:00");
      setSatellitePoints(Array.isArray((business as any).geofence_satellite_points) ? (business as any).geofence_satellite_points : []);
    }
  }, [business]);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) { toast.error("Min. 8 caractères"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Mot de passe mis à jour"); setNewPassword(""); }
  };

  const handleAddressInput = (value: string) => {
    setAddress(value);
    clearTimeout(debounceRef.current);
    if (value.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1&countrycodes=fr`,
          { headers: { "Accept-Language": "fr" } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { /* ignore */ }
    }, 400);
  };

  const selectSuggestion = (s: any) => {
    // Extract the street number the user typed (e.g. "189" from "189 rue des...")
    const userNumber = address.match(/^\s*(\d+\s*[-/]?\s*\d*)/)?.[1]?.trim();
    const suggestionHasNumber = /^\d/.test(s.display_name);
    
    // If user typed a number but the suggestion doesn't start with one, prepend it
    let finalAddress = s.display_name;
    if (userNumber && !suggestionHasNumber) {
      finalAddress = `${userNumber} ${s.display_name}`;
    }
    
    // Geocode with the exact number for precise coordinates
    if (userNumber && !suggestionHasNumber) {
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalAddress)}&format=json&limit=1&countrycodes=fr`,
        { headers: { "Accept-Language": "fr" } }
      ).then(r => r.json()).then(data => {
        if (data.length > 0) {
          setLatitude(parseFloat(parseFloat(data[0].lat).toFixed(7)));
          setLongitude(parseFloat(parseFloat(data[0].lon).toFixed(7)));
          setAddress(data[0].display_name || finalAddress);
        } else {
          setAddress(finalAddress);
        }
      }).catch(() => {
        setAddress(finalAddress);
      });
    } else {
      setAddress(finalAddress);
    }
    
    setLatitude(parseFloat(parseFloat(s.lat).toFixed(7)));
    setLongitude(parseFloat(parseFloat(s.lon).toFixed(7)));
    setShowSuggestions(false);
    setSuggestions([]);
    toast.success("📍 Position confirmée");
  };

  const handleSaveGeofencing = async () => {
    if (!business) return;
    setSavingGeo(true);
    const { error } = await supabase.from("businesses").update({
      geofence_enabled: geoEnabled,
      geofence_radius: geoRadius,
      address,
      latitude,
      longitude,
      geofence_message: geoMessage,
      geofence_time_start: geoTimeStart,
      geofence_time_end: geoTimeEnd,
      geofence_satellite_points: satellitePoints,
    } as any).eq("id", business.id);

    if (error) {
      toast.error("Erreur de sauvegarde");
    } else {
      toast.success("Paramètres sauvegardés ! Mise à jour des cartes en cours...");

      // Force all existing wallet cards to re-fetch the updated pass
      try {
        const { data: registrations } = await supabase
          .from("wallet_registrations")
          .select("serial_number")
          .eq("business_id", business.id);

        if (registrations && registrations.length > 0) {
          // Update all cards' updated_at to trigger re-fetch
          const serialNumbers = registrations.map((r) => r.serial_number);
          for (const sn of serialNumbers) {
            await supabase.from("wallet_pass_updates").upsert({
              serial_number: sn,
              pass_type_id: "pass.app.fidelispro",
              change_message: "📍 Zone de proximité mise à jour",
              last_updated: new Date().toISOString(),
            }, { onConflict: "serial_number" });
          }

          // Send APNs push to all devices
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          await fetch(`${supabaseUrl}/functions/v1/wallet-push`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ business_id: business.id, change_message: "📍 Zone mise à jour" }),
          });

          toast.success(`${registrations.length} carte(s) mise(s) à jour !`);
        }
      } catch (pushErr) {
        console.error("Push error:", pushErr);
      }
    }
    setSavingGeo(false);
  };

  const handleSaveAutomation = async () => {
    if (!business) return;
    setSavingAuto(true);
    const { error } = await supabase.from("businesses").update({
      birthday_notif_enabled: birthdayEnabled,
      birthday_notif_message: birthdayMessage,
      welcome_push_enabled: welcomePushEnabled,
      welcome_push_message: welcomePushMessage,
      vip_auto_enabled: vipAutoEnabled,
      vip_auto_threshold: vipAutoThreshold,
    } as any).eq("id", business.id);
    setSavingAuto(false);
    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Automatisations sauvegardées !");
  };

  const generateSlugFromName = (name: string) =>
    name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSaveSlug = async () => {
    if (!business || !slug.trim()) return;
    setSavingSlug(true);
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "");
    setSlug(cleanSlug);
    const { error } = await supabase.from("businesses").update({ slug: cleanSlug } as any).eq("id", business.id);
    setSavingSlug(false);
    if (error) toast.error(error.message.includes("unique") ? "Ce slug est déjà utilisé" : "Erreur de sauvegarde");
    else toast.success("URL de vitrine sauvegardée !");
  };

  // Use slug if set, otherwise fall back to business ID (always works without migration)
  const appBase = import.meta.env.VITE_APP_URL || window.location.origin;
  const vitrineUrl = business
    ? `${appBase}/vitrine/${slug || business.id}`
    : "";

  const radiusLabel = geoRadius >= 1000 ? `${(geoRadius / 1000).toFixed(1)} km` : `${geoRadius} m`;

  return (
    <DashboardLayout title="Paramètres" subtitle="Gérez votre compte, géolocalisation et abonnement">
      <div className="space-y-4 max-w-xl">
        {/* Compte */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Compte
          </h2>
          <div className="space-y-2">
            <Label className="text-xs">Email</Label>
            <Input value={email} disabled className="rounded-xl bg-secondary text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Nouveau mot de passe</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 caractères" className="rounded-xl text-sm" />
          </div>
          <Button onClick={handleUpdatePassword} size="sm" className="rounded-xl">Mettre à jour</Button>
        </div>

        {/* Vitrine publique */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" /> Vitrine publique
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Partagez votre vitrine publique avec vos clients — ils y verront vos récompenses et pourront rejoindre votre programme.
          </p>

          <div className="space-y-2">
            <Label className="text-xs">URL de votre vitrine</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center rounded-xl border border-input bg-secondary text-sm overflow-hidden">
                <span className="px-3 text-muted-foreground text-xs whitespace-nowrap border-r border-border/50 pr-3 py-2.5">
                  {appBase}/vitrine/
                </span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="mon-commerce"
                  className="flex-1 px-2 py-2.5 bg-transparent outline-none text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-xs shrink-0"
                onClick={() => {
                  if (business?.name) setSlug(generateSlugFromName(business.name));
                }}
              >
                Auto
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleSaveSlug}
              disabled={savingSlug || !slug}
              className="rounded-xl bg-gradient-primary text-primary-foreground"
            >
              {savingSlug ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Sauvegarder
            </Button>
            {vitrineUrl && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() => window.open(vitrineUrl, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Voir ma vitrine
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() => setShowVitrineQr((v) => !v)}
                >
                  <QrCode className="w-3.5 h-3.5" /> QR Code
                </Button>
              </>
            )}
          </div>

          {showVitrineQr && vitrineUrl && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-5 p-4 rounded-xl bg-secondary/50 border border-border/30">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-border/20">
                  <QRCodeSVG value={vitrineUrl} size={120} fgColor="#1a1a1a" level="H" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-medium">QR code de votre vitrine</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Affichez ce QR code en caisse ou sur vos supports de communication.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 text-xs"
                    onClick={() => {
                      const svg = document.querySelector(".vitrine-qr svg") as SVGElement;
                      if (!svg) { window.print(); return; }
                      const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `vitrine-qr-${slug}.svg`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Printer className="w-3 h-3" /> Télécharger le QR
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl gap-1.5 text-xs"
                    onClick={() => { navigator.clipboard.writeText(vitrineUrl); toast.success("URL copiée !"); }}
                  >
                    <Copy className="w-3 h-3" /> Copier l'URL
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Widget intégrable */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" /> Widget pour votre site web
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Intégrez ce code sur votre site web pour afficher un bandeau d'invitation à rejoindre votre programme de fidélité.
          </p>

          {/* Banner preview */}
          <div className="rounded-xl border border-border/30 bg-secondary/30 p-4 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Aperçu du widget</p>
            <div
              className="flex items-center gap-3 p-3.5 rounded-2xl text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${(business as any)?.accent_color || "#F59E0B"}f0, ${(business as any)?.accent_color || "#F59E0B"}cc)` }}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs leading-tight">Rejoignez notre programme de fidélité 🎁</p>
                <p className="text-[10px] text-white/80 mt-0.5 truncate">{business?.name || "Votre commerce"} — Cumulez des points à chaque visite</p>
              </div>
              <span className="text-xs font-bold bg-white/95 px-3 py-1.5 rounded-lg shrink-0" style={{ color: (business as any)?.accent_color || "#F59E0B" }}>
                Rejoindre →
              </span>
            </div>
          </div>

          {/* Snippet */}
          {business && (
            <div className="space-y-2">
              <Label className="text-xs">Code à copier sur votre site</Label>
              <div className="relative">
                <pre className="rounded-xl bg-secondary text-xs p-3.5 overflow-x-auto text-muted-foreground border border-border/30 pr-12 leading-relaxed">
{`<script src="${appBase}/widget.js?id=${business.id}"></script>`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-7 w-7 rounded-lg"
                  onClick={() => {
                    navigator.clipboard.writeText(`<script src="${appBase}/widget.js?id=${business.id}"></script>`);
                    toast.success("Code copié !");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Collez ce code juste avant la balise <code className="bg-secondary px-1 rounded">&lt;/body&gt;</code> de votre site.</p>
            </div>
          )}
        </div>

        {/* Géolocalisation / Proximité */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2">
              <Radar className="w-4 h-4 text-primary" /> Notifications de proximité
            </h2>
            <Switch checked={geoEnabled} onCheckedChange={setGeoEnabled} />
          </div>

          {geoEnabled && (
            <div className="space-y-5 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quand un client passe à proximité de votre établissement, il reçoit <strong>une notification par jour maximum</strong> pour l'inciter à vous rendre visite.
              </p>

              {/* Address + geocoding */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Adresse de votre établissement
                </Label>
                <div className="relative" ref={suggestionsRef}>
                  <Input
                    value={address}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    placeholder="Ex: Wok N Thai Colombes, 12 rue..."
                    className="rounded-xl text-sm"
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                    >
                      {suggestions.map((s: any, i: number) => (
                        <div
                          key={i}
                          onClick={() => selectSuggestion(s)}
                          className="px-3.5 py-2.5 cursor-pointer text-[13px] text-foreground leading-snug border-b border-border/30 last:border-0 hover:bg-muted/60 transition-colors"
                        >
                          {s.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Tapez un nom de commerce, une adresse ou une ville — les suggestions apparaissent automatiquement
                </p>
              </div>

              {/* GPS fallback */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl gap-1.5 text-[11px] text-muted-foreground"
                onClick={() => {
                  if (!navigator.geolocation) { toast.error("Géolocalisation non supportée"); return; }
                  toast.info("Localisation GPS en cours...");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setLatitude(parseFloat(pos.coords.latitude.toFixed(7)));
                      setLongitude(parseFloat(pos.coords.longitude.toFixed(7)));
                      toast.success("Position GPS détectée !");
                    },
                    () => toast.error("Impossible d'obtenir la position GPS"),
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
              >
                <Navigation className="w-3 h-3" /> Ou utiliser ma position actuelle
              </Button>

              {/* Map confirmation */}
              {latitude && longitude && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                      ✅ Position confirmée
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </span>
                  </div>
                  <GeofenceMap
                    latitude={latitude}
                    longitude={longitude}
                    radius={geoRadius}
                    satellitePoints={satellitePoints}
                    onPositionChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                    onSatellitePointsChange={setSatellitePoints}
                  />
                </div>
              )}

              {!latitude && (
                <p className="text-[10px] text-destructive/80">
                  ⚠️ Coordonnées GPS requises — localisez votre adresse ci-dessus
                </p>
              )}

              {/* Radius */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Radar className="w-3 h-3" /> Rayon de détection
                  </Label>
                  <span className="text-sm font-mono font-bold text-primary">{radiusLabel}</span>
                </div>
                <Slider
                  value={[geoRadius]}
                  onValueChange={(v) => setGeoRadius(v[0])}
                  min={50}
                  max={2000}
                  step={50}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50m</span>
                  <span>500m</span>
                  <span>1km</span>
                  <span>2km</span>
                </div>
              </div>

              {/* Proximity message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Message de proximité</Label>
                  <span className={`text-[10px] tabular-nums ${geoMessage.length > 80 ? "text-destructive" : "text-muted-foreground"}`}>
                    {geoMessage.length}/80
                  </span>
                </div>
                <Input
                  value={geoMessage}
                  onChange={(e) => { if (e.target.value.length <= 80) setGeoMessage(e.target.value); }}
                  placeholder="Passez nous voir, on vous attend ! 🎉"
                  className="rounded-xl text-sm"
                />

                {/* Suggested messages */}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">💡 Suggestions :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "🎁 Une surprise vous attend juste à côté !",
                      "☕ Passez prendre votre café préféré !",
                      "⭐ Vos points fidélité vous attendent !",
                      "🔥 -20% en ce moment, passez en profiter !",
                      "👋 On est juste là, venez nous voir !",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => { if (suggestion.length <= 80) setGeoMessage(suggestion); }}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/10 truncate max-w-full"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>


              {/* Preview */}
              <div className="rounded-2xl bg-muted/60 p-3.5 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Aperçu écran verrouillé</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs truncate">{business?.name || "Votre commerce"}</p>
                      <span className="text-[10px] text-muted-foreground ml-2">🔒 verrouillé</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {geoMessage || "Passez nous voir, on vous attend ! 🎉"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSaveGeofencing}
            disabled={savingGeo}
            size="sm"
            className="rounded-xl bg-gradient-primary text-primary-foreground"
          >
            {savingGeo ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>

        {/* Automatisations & Engagement */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-5">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Automatisations & Engagement
          </h2>

          {/* Birthday notification */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-pink-500" />
                <div>
                  <p className="text-sm font-medium">Notification anniversaire</p>
                  <p className="text-[11px] text-muted-foreground">Envoyez automatiquement un message le jour J</p>
                </div>
              </div>
              <Switch checked={birthdayEnabled} onCheckedChange={setBirthdayEnabled} />
            </div>
            {birthdayEnabled && (
              <div className="space-y-2 pl-6 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-xs">Message d'anniversaire</Label>
                <div className="relative">
                  <textarea
                    value={birthdayMessage}
                    onChange={(e) => { if (e.target.value.length <= 120) setBirthdayMessage(e.target.value); }}
                    placeholder="Joyeux anniversaire ! Un cadeau vous attend 🎂"
                    rows={2}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className={`absolute bottom-2 right-3 text-[10px] tabular-nums ${birthdayMessage.length > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                    {birthdayMessage.length}/120
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/30" />

          {/* Welcome push */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Message de bienvenue</p>
                  <p className="text-[11px] text-muted-foreground">Envoyé dès qu'un nouveau client rejoint</p>
                </div>
              </div>
              <Switch checked={welcomePushEnabled} onCheckedChange={setWelcomePushEnabled} />
            </div>
            {welcomePushEnabled && (
              <div className="space-y-2 pl-6 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-xs">Message de bienvenue</Label>
                <div className="relative">
                  <textarea
                    value={welcomePushMessage}
                    onChange={(e) => { if (e.target.value.length <= 120) setWelcomePushMessage(e.target.value); }}
                    placeholder="Bienvenue ! Votre carte de fidélité est prête 🎉"
                    rows={2}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className={`absolute bottom-2 right-3 text-[10px] tabular-nums ${welcomePushMessage.length > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                    {welcomePushMessage.length}/120
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/30" />

          {/* VIP auto-segment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Passage VIP automatique</p>
                  <p className="text-[11px] text-muted-foreground">Promu au niveau Gold au-delà d'un seuil</p>
                </div>
              </div>
              <Switch checked={vipAutoEnabled} onCheckedChange={setVipAutoEnabled} />
            </div>
            {vipAutoEnabled && (
              <div className="space-y-2 pl-6 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-xs">Seuil de points pour devenir VIP</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={9999}
                    value={vipAutoThreshold}
                    onChange={(e) => setVipAutoThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                    className="rounded-xl text-sm w-28"
                  />
                  <span className="text-xs text-muted-foreground">points → niveau Gold automatique</span>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveAutomation}
            disabled={savingAuto}
            size="sm"
            className="rounded-xl bg-gradient-primary text-primary-foreground w-full"
          >
            {savingAuto ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Sauvegarde...</> : <><Check className="w-3.5 h-3.5 mr-2" />Sauvegarder les automatisations</>}
          </Button>
        </div>

        {/* Abonnement */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" /> Abonnement
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary text-xs">{business?.subscription_plan || "starter"}</Badge>
            <Badge variant="outline" className="text-xs">{business?.subscription_status || "inactive"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{planLabels[business?.subscription_plan || "starter"]}</p>

          {/* Plan cards */}
          <div className="grid gap-3 pt-2">
            {Object.entries(STRIPE_PLANS).map(([key, plan]) => {
              const isCurrent = business?.subscription_plan === key;
              return (
                <div key={key} className={`p-4 rounded-xl border transition-all ${
                  isCurrent ? "border-primary bg-primary/5" : "border-border/40 bg-secondary/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{plan.name}</p>
                        {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">Actuel</Badge>}
                        {"popular" in plan && plan.popular && !isCurrent && (
                          <Badge variant="outline" className="text-[10px]">Populaire</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{plan.features.slice(0, 3).join(" • ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold">{plan.price}€<span className="text-xs text-muted-foreground font-normal">/mois</span></p>
                      {!isCurrent && (
                        <SubscribeButton plan={key as PlanKey} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manage existing subscription */}
          {business?.stripe_subscription_id && (
            <ManageSubscriptionButton />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

function SubscribeButton({ plan }: { plan: PlanKey }) {
  const navigate = useNavigate();

  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-lg text-[11px] mt-1 gap-1"
      onClick={() => navigate(`/dashboard/checkout?plan=${plan}`)}
    >
      <CreditCard className="w-3 h-3" /> Souscrire
    </Button>
  );
}

function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="rounded-xl gap-2 w-full" onClick={handleManage} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      Gérer mon abonnement Stripe
    </Button>
  );
}

export default SettingsPage;
