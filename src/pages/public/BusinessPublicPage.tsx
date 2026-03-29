import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Globe, Star, Sparkles, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";

type Step = "landing" | "register" | "card";

const BusinessPublicPage = () => {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const isAppleDevice = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

  const handleAddToWallet = async (cardCode: string) => {
    setWalletLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-pass`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_code: cardCode }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cardCode}.pkpass`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Carte ajoutée au Wallet !");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Impossible de générer la carte Wallet");
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId) return;
      const { data } = await supabase
        .from("businesses")
        .select("id, name, description, primary_color, secondary_color, card_style, max_points_per_card, reward_description, address, city, phone, website, category, logo_url")
        .eq("id", businessId)
        .maybeSingle();
      if (data) setBusiness(data);
      setLoading(false);
    };
    fetchBusiness();
  }, [businessId]);

  const handleRegister = async () => {
    if (!name.trim() && !phone.trim() && !email.trim()) {
      toast.error("Entrez au moins un moyen de contact");
      return;
    }
    if (!business) return;
    setSubmitting(true);

    // Check if customer already exists by email or phone
    let existingCustomer = null;
    if (email.trim()) {
      const { data } = await supabase
        .from("customers")
        .select("*, customer_cards(*)")
        .eq("business_id", business.id)
        .eq("email", email.trim())
        .maybeSingle();
      existingCustomer = data;
    }
    if (!existingCustomer && phone.trim()) {
      const { data } = await supabase
        .from("customers")
        .select("*, customer_cards(*)")
        .eq("business_id", business.id)
        .eq("phone", phone.trim())
        .maybeSingle();
      existingCustomer = data;
    }

    if (existingCustomer) {
      setCustomer(existingCustomer);
      const existingCard = existingCustomer.customer_cards?.[0];
      if (existingCard) setCard(existingCard);
      setStep("card");
      setSubmitting(false);
      toast.success("Bon retour parmi nous ! 🎉");
      return;
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from("customers")
      .insert({
        business_id: business.id,
        full_name: name.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      })
      .select()
      .single();

    if (error || !newCustomer) {
      toast.error("Erreur lors de l'inscription");
      setSubmitting(false);
      return;
    }

    // Auto-create loyalty card
    const { data: newCard } = await supabase
      .from("customer_cards")
      .insert({
        customer_id: newCustomer.id,
        business_id: business.id,
        max_points: business.max_points_per_card || 10,
      })
      .select()
      .single();

    setCustomer(newCustomer);
    setCard(newCard);
    setStep("card");
    setSubmitting(false);
    toast.success("Bienvenue ! Votre carte de fidélité est prête 🎉");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">Commerce introuvable</h1>
          <p className="text-muted-foreground mt-2">Ce lien n'est pas valide.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: `linear-gradient(135deg, ${business.primary_color}15 0%, ${business.secondary_color}15 100%)`,
      }}
    >
      <AnimatePresence mode="wait">
        {step === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div
              className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-white font-display font-bold text-2xl"
              style={{ background: `linear-gradient(135deg, ${business.primary_color}, ${business.secondary_color})` }}
            >
              {business.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">{business.name}</h1>
              {business.description && (
                <p className="text-muted-foreground mt-2">{business.description}</p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
              {business.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{business.city}</span>
              )}
              {business.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{business.phone}</span>
              )}
              {business.website && (
                <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{business.website}</span>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 text-left space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-accent" />
                <span>Gagnez des points à chaque visite</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Carte de fidélité digitale gratuite</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>{business.reward_description || "Récompense offerte !"}</span>
              </div>
            </div>

            <Button
              onClick={() => setStep("register")}
              className="w-full h-14 text-lg rounded-2xl text-white font-semibold"
              style={{ background: `linear-gradient(135deg, ${business.primary_color}, ${business.secondary_color})` }}
            >
              Obtenir ma carte de fidélité
            </Button>
          </motion.div>
        )}

        {step === "register" && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold">Inscrivez-vous</h2>
              <p className="text-muted-foreground text-sm mt-1">Rapide et gratuit — 10 secondes</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
              <div className="space-y-2">
                <Label>Votre nom</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@email.com" className="rounded-xl h-12" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="rounded-xl h-12" />
              </div>
              <Button
                onClick={handleRegister}
                disabled={submitting}
                className="w-full h-14 text-lg rounded-2xl text-white font-semibold"
                style={{ background: `linear-gradient(135deg, ${business.primary_color}, ${business.secondary_color})` }}
              >
                {submitting ? "Création..." : "Créer ma carte 🎉"}
              </Button>
              <button onClick={() => setStep("landing")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Retour
              </button>
            </div>
          </motion.div>
        )}

        {step === "card" && customer && card && (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-5xl"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-display font-bold">Votre carte est prête !</h2>

            <LoyaltyCard
              businessName={business.name}
              customerName={customer.full_name || "Client"}
              points={card.current_points || 0}
              maxPoints={card.max_points || 10}
              level={customer.level || "bronze"}
              cardId={card.card_code || card.id}
              accentColor={business.primary_color}
            />

            <div className="p-4 rounded-2xl bg-card border border-border/50">
              <p className="text-sm text-muted-foreground">Votre code carte</p>
              <p className="text-2xl font-mono font-bold tracking-wider mt-1">{card.card_code}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Présentez ce code en magasin pour gagner des points
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              {business.reward_description || "Récompense offerte"} après {card.max_points} points !
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BusinessPublicPage;
