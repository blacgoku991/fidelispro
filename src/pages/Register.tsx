import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Check, Zap, Shield, Crown } from "lucide-react";
import { toast } from "sonner";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripePlans";
import { motion, AnimatePresence } from "framer-motion";

const planIcons: Record<PlanKey, React.ElementType> = {
  starter: Zap,
  pro: Crown,
  enterprise: Shield,
};

const planColors: Record<PlanKey, string> = {
  starter: "from-blue-500 to-cyan-500",
  pro: "from-violet-500 to-purple-600",
  enterprise: "from-amber-500 to-orange-500",
};

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"plan" | "account">("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("pro");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleRegister = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding?plan=${selectedPlan}`,
        queryParams: { plan: selectedPlan },
      },
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !email.trim() || !password.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { business_name: businessName.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard/checkout?plan=${selectedPlan}`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Compte créé ! Vérifiez votre email puis vous serez redirigé vers le paiement.");
      navigate(`/dashboard/checkout?plan=${selectedPlan}`);
    }
  };

  const plan = STRIPE_PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-card items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-purple-300 blur-3xl" />
        </div>
        <div className="max-w-md relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-primary-foreground">FidéliPro</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-primary-foreground leading-tight">
            Lancez votre programme de fidélité dès aujourd'hui.
          </h2>
          <p className="mt-4 text-primary-foreground/60 leading-relaxed">
            Choisissez votre plan, créez votre compte et commencez immédiatement.
          </p>
          <div className="mt-10 space-y-3">
            {[
              "Carte Apple & Google Wallet en quelques clics",
              "Notifications clients intelligentes et ciblées",
              "Tableau de bord et analytics en temps réel",
              "Support français dédié 7j/7",
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-primary-foreground/80">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center p-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold">FidéliPro</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {["plan", "account"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? "bg-primary text-primary-foreground" :
                  (step === "account" && s === "plan") ? "bg-emerald-500 text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {step === "account" && s === "plan" ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === "plan" ? "Votre plan" : "Votre compte"}
                </span>
                {i < 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === "plan" ? (
              <motion.div
                key="plan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-2xl font-display font-bold mb-1">Choisissez votre plan</h1>
                <p className="text-sm text-muted-foreground mb-6">Commencez à fidéliser vos clients dès aujourd'hui</p>

                <div className="space-y-3 mb-6">
                  {(Object.entries(STRIPE_PLANS) as [PlanKey, typeof STRIPE_PLANS.pro][]).map(([key, p]) => {
                    const Icon = planIcons[key];
                    const isSelected = selectedPlan === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedPlan(key)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                          isSelected ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${planColors[key]} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4.5 h-4.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-sm">{p.name}</span>
                              {"popular" in p && p.popular && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">Populaire</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {p.features.slice(0, 3).join(" · ")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display font-bold text-lg">{p.price}€</p>
                            <p className="text-[10px] text-muted-foreground">/mois</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${isSelected ? "border-primary bg-primary" : "border-border"}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setStep("account")}
                  className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold gap-2"
                >
                  Continuer avec {plan.name} — {plan.price}€/mois
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Déjà un compte ? <Link to="/login" className="text-primary font-medium hover:underline">Se connecter</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button onClick={() => setStep("plan")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Changer de plan
                </button>

                {/* Plan recap */}
                <div className="mb-6 p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${planColors[selectedPlan]} flex items-center justify-center`}>
                    {(() => { const Icon = planIcons[selectedPlan]; return <Icon className="w-4 h-4 text-white" />; })()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Plan {plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.price}€/mois · Paiement immédiat</p>
                  </div>
                  <button onClick={() => setStep("plan")} className="text-xs text-primary hover:underline">Changer</button>
                </div>

                <h1 className="text-2xl font-display font-bold mb-1">Créer votre compte</h1>
                <p className="text-sm text-muted-foreground mb-6">Puis vous serez redirigé vers le paiement</p>

                {/* Google OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleRegister}
                  className="w-full h-11 rounded-xl font-medium border-border/60 hover:bg-secondary/60 flex items-center gap-3 mb-4"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuer avec Google
                </Button>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                  <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-background px-3">ou</span></div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business">Nom de votre commerce</Label>
                    <Input id="business" placeholder="Boucherie Laurent" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel</Label>
                    <Input id="email" type="email" placeholder="vous@commerce.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 caractères"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-xl pr-10"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Créer et payer <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    En créant votre compte, vous acceptez nos <a href="/legal" className="underline hover:text-primary">CGU</a> et notre <a href="/privacy" className="underline hover:text-primary">politique de confidentialité</a>.
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Register;
