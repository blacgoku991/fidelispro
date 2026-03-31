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

const OnboardingBusiness = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", city: "" });

  useEffect(() => {
    const init = async () => {
      try {
        // getSession() lit depuis localStorage sans appel réseau → pas de spinner infini
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) { navigate("/login"); return; }

        const { data: business, error } = await supabase
          .from("businesses")
          .select("id, name, category, subscription_status, subscription_plan")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (error || !business) { navigate("/login"); return; }

        const name = (business as any).name;
        const status = (business as any).subscription_status;

        // Already onboarded, skip
        if (name && name !== "Mon Commerce") {
          if (status === "inactive") {
            navigate(`/dashboard/checkout?plan=${plan || (business as any).subscription_plan || "pro"}`);
          } else {
            navigate("/dashboard");
          }
          return;
        }

        setBusinessId(business.id);
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category) {
      toast.error("Le nom du commerce et la catégorie sont requis");
      return;
    }
    if (!businessId) return;

    setSaving(true);

    const updateData: Record<string, unknown> = {
      name: form.name.trim(),
      category: form.category,
      city: form.city.trim() || null,
    };

    updateData.subscription_plan = plan || "starter";

    const { error } = await supabase
      .from("businesses")
      .update(updateData)
      .eq("id", businessId);

    if (error) {
      toast.error("Erreur lors de la mise à jour du commerce");
      setSaving(false);
      return;
    }

    toast.success("Commerce configuré ! Finalisons votre abonnement…");
    navigate(`/dashboard/checkout?plan=${plan || "starter"}`);
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
            Personnalisez votre espace commerce.
          </h2>
          <p className="mt-4 text-primary-foreground/60 leading-relaxed">
            Ces informations apparaîtront sur vos cartes de fidélité et dans votre vitrine.
          </p>
          <div className="mt-8 p-4 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10">
            <p className="text-sm text-primary-foreground/80 font-medium mb-2">✓ Compte Google connecté</p>
            <p className="text-xs text-primary-foreground/50">
              Après cette étape, vous serez redirigé vers le paiement.
            </p>
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
              <Label htmlFor="name">Nom du commerce *</Label>
              <Input
                id="name"
                placeholder="Boulangerie Martin"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ville <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Input
                id="city"
                placeholder="Paris"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold gap-2 mt-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Continuer vers le paiement <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingBusiness;
