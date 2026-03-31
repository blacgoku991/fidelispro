import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Palette, Gift, Settings2, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, CreditCard, Check, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: 1, label: "Votre carte", icon: Palette },
  { id: 2, label: "Récompense", icon: Gift },
  { id: 3, label: "Programme", icon: Settings2 },
  { id: 4, label: "Terminé", icon: CheckCircle2 },
];

const COLOR_PRESETS = [
  "#7C3AED", "#2563EB", "#059669", "#DC2626",
  "#D97706", "#DB2777", "#0891B2", "#1a1a2e",
];

const SetupWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");

  // Step 1 — card
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [cardName, setCardName] = useState("");

  // Step 2 — reward
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardPoints, setRewardPoints] = useState(10);

  // Step 3 — program
  const [pointsPerVisit, setPointsPerVisit] = useState(1);
  const [maxPoints, setMaxPoints] = useState(10);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) { navigate("/login"); return; }

        const { data: biz, error } = await supabase
          .from("businesses")
          .select("id, name, primary_color, points_per_visit, max_points_per_card, onboarding_completed")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (error || !biz) { navigate("/dashboard"); return; }

        if ((biz as any).onboarding_completed) {
          window.location.replace("/dashboard");
          return;
        }

        setBusinessId(biz.id);
        setBusinessName((biz as any).name || "");
        setCardName((biz as any).name || "");
        if ((biz as any).primary_color) setPrimaryColor((biz as any).primary_color);
        if ((biz as any).points_per_visit) setPointsPerVisit((biz as any).points_per_visit);
        if ((biz as any).max_points_per_card) setMaxPoints((biz as any).max_points_per_card);
      } catch {
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const saveStep1 = async () => {
    if (!businessId) return;
    setSaving(true);
    await supabase.from("businesses").update({
      primary_color: primaryColor,
      name: cardName.trim() || businessName,
    }).eq("id", businessId);
    setSaving(false);
    setStep(2);
  };

  const saveStep2 = async () => {
    if (!businessId) return;
    if (rewardTitle.trim()) {
      setSaving(true);
      await supabase.from("rewards").insert({
        business_id: businessId,
        title: rewardTitle.trim(),
        points_required: rewardPoints,
        is_active: true,
      });
      setSaving(false);
    }
    setStep(3);
  };

  const saveStep3 = async () => {
    if (!businessId) return;
    setSaving(true);
    await supabase.from("businesses").update({
      points_per_visit: pointsPerVisit,
      max_points_per_card: maxPoints,
    }).eq("id", businessId);
    setSaving(false);
    setStep(4);
  };

  const finish = async () => {
    if (!businessId) return;
    setSaving(true);
    await supabase.from("businesses").update({ onboarding_completed: true } as any).eq("id", businessId);
    setSaving(false);
    toast.success("Configuration terminée ! Bienvenue sur FidéliPro 🎉");
    // Force reload pour re-fetcher subscription_status à jour depuis Supabase
    window.location.replace("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
          <CreditCard className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <span className="text-xl font-display font-bold">FidéliPro</span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex flex-col items-center gap-1 flex-shrink-0 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done ? "bg-emerald-500 border-emerald-500" :
                    active ? "bg-primary border-primary" :
                    "bg-background border-border"
                  }`}>
                    {done ? <Check className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-18px] transition-all ${done ? "bg-emerald-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-xl font-display font-bold">Personnalisez votre carte</h2>
                <p className="text-sm text-muted-foreground mt-1">Choisissez la couleur et le nom qui apparaîtront sur vos cartes de fidélité.</p>
              </div>

              <div className="space-y-2">
                <Label>Nom affiché sur la carte</Label>
                <Input
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder={businessName}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setPrimaryColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border border-border"
                    title="Couleur personnalisée"
                  />
                </div>
                <div className="mt-3 h-16 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm transition-all"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` }}>
                  {cardName || businessName} — Carte de fidélité
                </div>
              </div>

              <StepActions
                onSkip={() => setStep(2)}
                onNext={saveStep1}
                saving={saving}
                isFirst
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-xl font-display font-bold">Créez votre première récompense</h2>
                <p className="text-sm text-muted-foreground mt-1">Définissez ce que vos clients obtiendront en échange de leurs points.</p>
              </div>

              <div className="space-y-2">
                <Label>Titre de la récompense *</Label>
                <Input
                  value={rewardTitle}
                  onChange={e => setRewardTitle(e.target.value)}
                  placeholder="Ex : Café offert, Remise 10%, Produit offert…"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Points nécessaires</Label>
                  <span className="text-2xl font-display font-bold text-primary">{rewardPoints} pts</span>
                </div>
                <Slider
                  value={[rewardPoints]}
                  onValueChange={([v]) => setRewardPoints(v)}
                  min={1} max={50} step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Recommandé : 5–15 points pour encourager la fidélité.</p>
              </div>

              <StepActions
                onBack={() => setStep(1)}
                onSkip={() => setStep(3)}
                onNext={saveStep2}
                saving={saving}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-xl font-display font-bold">Configurez votre programme</h2>
                <p className="text-sm text-muted-foreground mt-1">Définissez combien de points vos clients gagnent à chaque visite.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Points par visite</Label>
                  <span className="text-2xl font-display font-bold text-primary">{pointsPerVisit} pt{pointsPerVisit > 1 ? "s" : ""}</span>
                </div>
                <Slider
                  value={[pointsPerVisit]}
                  onValueChange={([v]) => setPointsPerVisit(v)}
                  min={1} max={10} step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Maximum de points par carte</Label>
                  <span className="text-2xl font-display font-bold text-primary">{maxPoints} pts</span>
                </div>
                <Slider
                  value={[maxPoints]}
                  onValueChange={([v]) => setMaxPoints(v)}
                  min={5} max={100} step={5}
                  className="w-full"
                />
                <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
                  Avec ces paramètres, un client atteindra la récompense après <strong>{Math.ceil(maxPoints / pointsPerVisit)} visites</strong>.
                </div>
              </div>

              <StepActions
                onBack={() => setStep(2)}
                onSkip={() => setStep(4)}
                onNext={saveStep3}
                saving={saving}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold">Votre programme est prêt !</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  Tout est configuré. Vous pouvez maintenant scanner vos premiers clients et commencer à les fidéliser.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: Palette, label: "Carte personnalisée" },
                  { icon: Gift, label: "Récompense créée" },
                  { icon: Settings2, label: "Programme configuré" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="p-3 rounded-xl bg-muted/50 space-y-1">
                    <Icon className="w-5 h-5 text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={finish}
                disabled={saving}
                className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-bold gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accéder à mon dashboard <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step counter */}
      <p className="text-xs text-muted-foreground mt-6">Étape {step} sur {STEPS.length}</p>
    </div>
  );
};

function StepActions({
  onBack, onSkip, onNext, saving, isFirst,
}: {
  onBack?: () => void;
  onSkip: () => void;
  onNext: () => void;
  saving: boolean;
  isFirst?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {!isFirst && onBack && (
        <Button variant="outline" onClick={onBack} className="gap-1.5 rounded-xl">
          <ArrowLeft className="w-4 h-4" /> Précédent
        </Button>
      )}
      <Button variant="ghost" onClick={onSkip} className="text-muted-foreground rounded-xl ml-auto">
        Faire plus tard
      </Button>
      <Button onClick={onNext} disabled={saving} className="bg-gradient-primary text-primary-foreground rounded-xl gap-1.5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Suivant <ArrowRight className="w-4 h-4" /></>}
      </Button>
    </div>
  );
}

export default SetupWizard;
