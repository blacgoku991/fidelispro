import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, ArrowRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CATEGORIES = [
  "restaurant", "boulangerie", "boucherie", "café", "coiffeur",
  "barbier", "fleuriste", "épicerie", "pharmacie", "librairie",
  "sport", "mode", "beauté", "autre",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "pro";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    category: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // If business already exists, skip onboarding
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (business) {
      navigate(`/dashboard/checkout?plan=${plan}`);
      return;
    }

    // Pre-fill from user metadata if available
    const meta = user.user_metadata;
    if (meta?.full_name || meta?.name) {
      setForm(f => ({ ...f, businessName: meta.full_name || meta.name || "" }));
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.category) {
      toast.error("Le nom du commerce et la catégorie sont requis");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name: form.businessName.trim(),
      category: form.category,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      subscription_status: "inactive",
      subscription_plan: plan,
    });

    if (error) {
      toast.error("Erreur lors de la création du commerce");
      setSaving(false);
      return;
    }

    // Update profile
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: form.businessName.trim(),
      email: user.email,
    });

    toast.success("Commerce créé ! Finalisons votre abonnement…");
    navigate(`/dashboard/checkout?plan=${plan}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-card items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
        </div>
        <div className="max-w-md relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-primary-foreground">FidéliPro</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-primary-foreground leading-tight">
            Plus qu'une étape pour lancer votre fidélité.
          </h2>
          <p className="mt-4 text-primary-foreground/60 leading-relaxed">
            Dites-nous en plus sur votre commerce pour personnaliser votre expérience.
          </p>
          <div className="mt-8 p-4 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10">
            <p className="text-sm text-primary-foreground/80 font-medium mb-2">✓ Votre compte Google est connecté</p>
            <p className="text-xs text-primary-foreground/50">Il ne reste qu'à configurer votre commerce pour accéder à votre tableau de bord.</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold">FidéliPro</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Votre commerce</h1>
              <p className="text-xs text-muted-foreground">Quelques infos pour personnaliser votre compte</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nom du commerce *</Label>
              <Input
                id="businessName"
                placeholder="Boulangerie Martin"
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11 rounded-xl capitalize">
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Input
                id="address"
                placeholder="12 rue de la Paix, Paris"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Input
                id="phone"
                placeholder="+33 6 12 34 56 78"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="h-11 rounded-xl"
                type="tel"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold gap-2 mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuer vers le paiement <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
