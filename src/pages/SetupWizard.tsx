import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Store, Palette, Gift, CheckCircle2,
  ArrowRight, ArrowLeft, Loader2, CreditCard, Check, QrCode, Copy,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MAX_RETRIES = 15;

const STEPS = [
  { id: 1, label: "Bienvenue",   icon: Sparkles },
  { id: 2, label: "Commerce",   icon: Store },
  { id: 3, label: "Apparence",  icon: Palette },
  { id: 4, label: "Récompense", icon: Gift },
  { id: 5, label: "Prêt !",     icon: CheckCircle2 },
];

const CATEGORIES = [
  "Restaurant", "Boulangerie / Pâtisserie", "Boucherie / Charcuterie",
  "Café / Bar", "Épicerie / Superette", "Coiffeur / Barbier",
  "Institut de beauté / Spa", "Pharmacie / Parapharmacie",
  "Sport & Fitness", "Librairie / Papeterie", "Fleuriste",
  "Mode & Vêtements", "Autre",
];

const COLOR_PRESETS = [
  "#7C3AED", "#2563EB", "#059669", "#DC2626",
  "#D97706", "#DB2777", "#0891B2", "#1a1a2e",
];

const SetupWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);

  // ── Vérification paiement après redirect Stripe ──────────────────────────
  const isCheckoutSuccess = searchParams.get("checkout") === "success";
  const sessionId = searchParams.get("session_id");
  const [checkingPayment, setCheckingPayment] = useState(isCheckoutSuccess);
  const [paymentError, setPaymentError] = useState(false);
  const [pollProgress, setPollProgress] = useState(5);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isCheckoutSuccess) return;
    const verify = async () => {
      try {
        const { data } = await supabase.functions.invoke("check-subscription", {
          body: sessionId ? { session_id: sessionId } : {},
        });
        if (data?.subscribed === true || data?.active === true) {
          setPollProgress(100);
          setTimeout(() => window.location.replace("/dashboard"), 600);
          return;
        }
      } catch { /* retry */ }
      retryCount.current += 1;
      setPollProgress(Math.min(90, Math.round((retryCount.current / MAX_RETRIES) * 90) + 5));
      if (retryCount.current < MAX_RETRIES) {
        retryTimer.current = setTimeout(verify, 2000);
      } else {
        setCheckingPayment(false);
        setPaymentError(true);
      }
    };
    verify();
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, []);

  // Step 2 — commerce info
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  // Step 3 — appearance
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 4 — reward
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardPoints, setRewardPoints] = useState(10);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) { navigate("/login"); return; }

        const { data: biz, error } = await supabase
          .from("businesses")
          .select("id, name, category, city, primary_color, logo_url, slug, subscription_status, subscription_plan, onboarding_completed")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (error || !biz) { navigate("/dashboard"); return; }

        // Wizard déjà complété → dashboard
        if ((biz as any).onboarding_completed) {
          window.location.replace("/dashboard");
          return;
        }

        // Sécurité : navigation directe sans paiement → redirection checkout
        if (!isCheckoutSuccess && (biz as any).subscription_status !== "active") {
          navigate(
            `/dashboard/checkout?plan=${(biz as any).subscription_plan || "starter"}`,
            { replace: true }
          );
          return;
        }

        setBusinessId(biz.id);
        setBusinessSlug((biz as any).slug ?? null);
        setBusinessName((biz as any).name ?? "");
        setCategory((biz as any).category ?? "");
        setCity((biz as any).city ?? "");
        if ((biz as any).primary_color) setPrimaryColor((biz as any).primary_color);
        if ((biz as any).logo_url) setLogoUrl((biz as any).logo_url);
      } catch {
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const saveStep2 = async () => {
    if (!businessId) return;
    setSaving(true);
    await supabase.from("businesses").update({
      ...(businessName.trim() ? { name: businessName.trim() } : {}),
      ...(category ? { category } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
    }).eq("id", businessId);
    setSaving(false);
    setStep(3);
  };

  const saveStep3 = async () => {
    if (!businessId) return;
    setSaving(true);
    await supabase.from("businesses").update({
      primary_color: primaryColor,
      ...(logoUrl.trim() ? { logo_url: logoUrl.trim() } : {}),
    }).eq("id", businessId);
    setSaving(false);
    setStep(4);
  };

  const saveStep4 = async () => {
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
    setStep(5);
  };

  const finish = async () => {
    if (!businessId) return;
    setSaving(true);
    await supabase.from("businesses").update({ onboarding_completed: true } as any).eq("id", businessId);
    setSaving(false);
    toast.success("Configuration terminée ! Bienvenue sur FidéliPro 🎉");
    window.location.replace("/dashboard");
  };

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const qrUrl = businessSlug
    ? `${appUrl}/vitrine/${businessSlug}`
    : businessId ? `${appUrl}/b/${businessId}` : "";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Vérification paiement en cours ────────────────────────────────────────
  if (checkingPayment) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="font-display font-semibold text-xl">Vérification du paiement en cours…</p>
          <p className="text-sm text-muted-foreground">
            Synchronisation avec Stripe — veuillez patienter
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <div className="w-full h-2 bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pollProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right tabular-nums">{pollProgress}%</p>
        </div>
        <p className="text-xs text-muted-foreground">Cette opération prend généralement moins de 10 secondes</p>
      </div>
    );
  }

  // ── Timeout : paiement non confirmé ──────────────────────────────────────
  if (paymentError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <p className="font-display font-semibold text-xl">Impossible de confirmer le paiement</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Votre paiement a peut-être été traité mais nous n'avons pas pu le confirmer dans les délais.
            Vérifiez votre email ou contactez le support.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => window.location.replace(
              "/setup?checkout=success" + (sessionId ? `&session_id=${sessionId}` : "")
            )}
            className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
          >
            Réessayer
          </button>
          <a
            href="mailto:support@fidelispro.fr"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
          >
            Contacter le support
          </a>
        </div>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-display font-bold">FidéliPro</span>
      </div>

      {/* Progress bar — masquée sur l'écran de bienvenue */}
      {step > 1 && (
        <div className="w-full max-w-lg mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center gap-1 flex-shrink-0`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      done  ? "bg-emerald-500 border-emerald-500" :
                      active ? "bg-primary border-primary" :
                               "bg-background border-border"
                    }`}>
                      {done
                        ? <Check className="w-3.5 h-3.5 text-white" />
                        : <Icon className={`w-3.5 h-3.5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      }
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-[-18px] transition-all ${done ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">

          {/* ─ Étape 1 : Bienvenue ───────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="s1"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold">Bienvenue sur FidéliPro ! 🎉</h2>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed max-w-sm mx-auto">
                  Votre abonnement est actif. Configurons ensemble votre programme de fidélité en quelques étapes rapides.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: Store,    text: "Infos de votre commerce" },
                  { icon: Palette,  text: "Apparence de votre carte" },
                  { icon: Gift,     text: "Première récompense" },
                  { icon: QrCode,   text: "Votre QR code caisse" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-bold gap-2"
              >
                Commencer la configuration <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* ─ Étape 2 : Commerce ────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="s2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5"
            >
              <div>
                <h2 className="text-xl font-display font-bold">Votre commerce</h2>
                <p className="text-sm text-muted-foreground mt-1">Confirmez ou complétez les informations de votre établissement.</p>
              </div>
              <div className="space-y-2">
                <Label>Nom du commerce</Label>
                <Input
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Ex : Boulangerie Martin"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ex : Paris"
                  className="h-11 rounded-xl"
                />
              </div>
              <StepActions onBack={() => setStep(1)} onSkip={() => setStep(3)} onNext={saveStep2} saving={saving} />
            </motion.div>
          )}

          {/* ─ Étape 3 : Apparence ───────────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="s3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5"
            >
              <div>
                <h2 className="text-xl font-display font-bold">Apparence de votre carte</h2>
                <p className="text-sm text-muted-foreground mt-1">Choisissez les couleurs qui représentent votre commerce.</p>
              </div>
              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setPrimaryColor(c)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-full cursor-pointer border border-border"
                    title="Couleur personnalisée"
                  />
                </div>
                <div
                  className="mt-3 h-16 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` }}
                >
                  {businessName || "Votre commerce"} — Carte de fidélité
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo <span className="text-muted-foreground font-normal">(optionnel — URL)</span></Label>
                <Input
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://monsite.fr/logo.png"
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">Copiez l'URL de votre logo depuis votre site ou réseaux sociaux.</p>
              </div>
              <StepActions onBack={() => setStep(2)} onSkip={() => setStep(4)} onNext={saveStep3} saving={saving} />
            </motion.div>
          )}

          {/* ─ Étape 4 : Récompense ──────────────────────────────────────── */}
          {step === 4 && (
            <motion.div key="s4"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5"
            >
              <div>
                <h2 className="text-xl font-display font-bold">Créez votre première récompense</h2>
                <p className="text-sm text-muted-foreground mt-1">Définissez ce que vos clients obtiendront en échange de leurs points.</p>
              </div>
              <div className="space-y-2">
                <Label>Titre de la récompense</Label>
                <Input
                  value={rewardTitle}
                  onChange={e => setRewardTitle(e.target.value)}
                  placeholder="Ex : Café offert, Remise 10%…"
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
              <StepActions onBack={() => setStep(3)} onSkip={() => setStep(5)} onNext={saveStep4} saving={saving} />
            </motion.div>
          )}

          {/* ─ Étape 5 : QR Code & Terminé ───────────────────────────────── */}
          {step === 5 && (
            <motion.div key="s5"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold">Vous êtes prêt !</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-sm mx-auto">
                  Voici votre QR code à afficher en caisse. Vos clients le scannent pour rejoindre votre programme de fidélité.
                </p>
              </div>

              {qrUrl && (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 rounded-2xl bg-white border border-border/50 shadow-sm inline-block">
                    <QRCodeSVG value={qrUrl} size={160} />
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(qrUrl); toast.success("Lien copié !"); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copier le lien
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: Palette,      label: "Carte personnalisée" },
                  { icon: Gift,         label: "Récompense créée" },
                  { icon: CheckCircle2, label: "Programme prêt" },
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

      {step > 1 && (
        <p className="text-xs text-muted-foreground mt-6">Étape {step} sur {STEPS.length}</p>
      )}
    </div>
  );
};

function StepActions({
  onBack, onSkip, onNext, saving,
}: {
  onBack?: () => void;
  onSkip: () => void;
  onNext: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="gap-1.5 rounded-xl">
          <ArrowLeft className="w-4 h-4" /> Précédent
        </Button>
      )}
      <Button variant="ghost" onClick={onSkip} className="text-muted-foreground rounded-xl ml-auto">
        Passer cette étape
      </Button>
      <Button onClick={onNext} disabled={saving} className="bg-gradient-primary text-primary-foreground rounded-xl gap-1.5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Suivant <ArrowRight className="w-4 h-4" /></>}
      </Button>
    </div>
  );
}

export default SetupWizard;
