import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Shield, Crown, MapPin, Radar, Bell, Clock, Navigation } from "lucide-react";
import GeofenceMap from "@/components/dashboard/GeofenceMap";
import { toast } from "sonner";

const planLabels: Record<string, string> = {
  starter: "Starter — 29€/mois",
  pro: "Pro — 79€/mois",
  enterprise: "Enterprise — Sur devis",
};

const SettingsPage = () => {
  const { user, business } = useAuth();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
      setGeoEnabled(business.geofence_enabled || false);
      setGeoRadius(business.geofence_radius || 200);
      setAddress(business.address || "");
      setLatitude(business.latitude || null);
      setLongitude(business.longitude || null);
      setGeoMessage(business.geofence_message || "Passez nous voir, on vous attend ! 🎉");
      setGeoTimeStart(business.geofence_time_start || "09:00");
      setGeoTimeEnd(business.geofence_time_end || "20:00");
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
    setAddress(s.display_name);
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
    }).eq("id", business.id);

    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Paramètres de géolocalisation sauvegardés !");
    setSavingGeo(false);
  };

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
                  <GeofenceMap latitude={latitude} longitude={longitude} radius={geoRadius} />
                  <p className="text-[10px] text-muted-foreground text-center">
                    Si la position n'est pas exacte, ajustez l'adresse et relocalisez
                  </p>
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
              <div className="space-y-1.5">
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
              </div>

              {/* Time window */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Plage horaire d'envoi
                </Label>
                <div className="flex items-center gap-3">
                  <Input type="time" value={geoTimeStart} onChange={(e) => setGeoTimeStart(e.target.value)} className="rounded-xl text-sm w-28" />
                  <span className="text-xs text-muted-foreground">à</span>
                  <Input type="time" value={geoTimeEnd} onChange={(e) => setGeoTimeEnd(e.target.value)} className="rounded-xl text-sm w-28" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Les notifications ne sont envoyées que pendant ces heures.
                </p>
              </div>

              {/* Info box */}
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3.5 space-y-1.5">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  📱 Géré nativement par Apple Wallet
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  La notification s'affiche automatiquement sur l'iPhone du client quand il passe à proximité.
                  <strong> Maximum 1 fois par jour.</strong> Aucune app requise.
                </p>
              </div>

              {/* Preview */}
              <div className="rounded-2xl bg-muted/60 p-3.5 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Aperçu notification</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs truncate">{business?.name || "Votre commerce"}</p>
                      <span className="text-[10px] text-muted-foreground ml-2">maintenant</span>
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

        {/* Abonnement */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-3">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" /> Abonnement
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary text-xs">{business?.subscription_plan || "starter"}</Badge>
            <Badge variant="outline" className="text-xs">{business?.subscription_status || "trialing"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{planLabels[business?.subscription_plan || "starter"]}</p>
          {business?.trial_ends_at && (
            <p className="text-xs text-muted-foreground">
              Essai gratuit jusqu'au {new Date(business.trial_ends_at).toLocaleDateString("fr-FR")}
            </p>
          )}
          <Button variant="outline" size="sm" className="rounded-xl">Gérer l'abonnement</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
