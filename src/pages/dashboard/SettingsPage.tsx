import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Shield, Crown, MapPin, Radar, Bell, Clock } from "lucide-react";
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
  const [geoTimeStart, setGeoTimeStart] = useState("09:00");
  const [geoTimeEnd, setGeoTimeEnd] = useState("20:00");
  const [savingGeo, setSavingGeo] = useState(false);

  useEffect(() => {
    if (user) setEmail(user.email || "");
  }, [user]);

  useEffect(() => {
    if (business) {
      setGeoEnabled(business.geofence_enabled || false);
      setGeoRadius(business.geofence_radius || 200);
      setAddress(business.address || "");
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

  const handleSaveGeofencing = async () => {
    if (!business) return;
    setSavingGeo(true);
    const { error } = await supabase.from("businesses").update({
      geofence_enabled: geoEnabled,
      geofence_radius: geoRadius,
      address: address,
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

              {/* Address */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Adresse de votre établissement
                </Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: 12 rue de la Paix, 75002 Paris"
                  className="rounded-xl text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  L'adresse est utilisée comme point central pour le rayon de détection.
                </p>
              </div>

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

              {/* Time window */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Plage horaire d'envoi
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    value={geoTimeStart}
                    onChange={(e) => setGeoTimeStart(e.target.value)}
                    className="rounded-xl text-sm w-28"
                  />
                  <span className="text-xs text-muted-foreground">à</span>
                  <Input
                    type="time"
                    value={geoTimeEnd}
                    onChange={(e) => setGeoTimeEnd(e.target.value)}
                    className="rounded-xl text-sm w-28"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Les notifications ne sont envoyées que pendant ces heures.
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
                      📍 Vous êtes à proximité ! Passez nous voir aujourd'hui
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
