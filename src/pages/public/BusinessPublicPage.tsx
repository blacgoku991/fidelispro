import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Globe, Star, Sparkles, CreditCard, AlertCircle, RefreshCw, Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import addToWalletBadge from "@/assets/add-to-apple-wallet-fr.png";

type Step = "landing" | "register" | "card";

const BusinessPublicPage = () => {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [googleWalletLoading, setGoogleWalletLoading] = useState(false);

  const isAppleDevice = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;

  const handleAddToWallet = (cardCode: string) => {
    setWalletLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const walletUrl = `https://${projectId}.supabase.co/functions/v1/generate-pass?card_code=${encodeURIComponent(cardCode)}`;
      window.location.assign(walletUrl);
    } catch (e: any) {
      console.error("Wallet error:", e);
      toast.error(e.message || "Impossible de générer la carte Wallet");
    } finally {
      setTimeout(() => setWalletLoading(false), 3000);
    }
  };

  const handleAddToGoogleWallet = async (cardCode: string) => {
    setGoogleWalletLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/generate-google-pass?card_code=${encodeURIComponent(cardCode)}`
      );
      const data = await res.json();
      if (data.saveUrl) {
        window.open(data.saveUrl, "_blank");
      } else {
        toast.error(data.error || "Impossible de générer la carte Google Wallet");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur Google Wallet");
    } finally {
      setGoogleWalletLoading(false);
    }
  };

  const fetchBusiness = async () => {
    setLoading(true);
    setFetchError(null);

    if (!businessId) {
      setFetchError("Aucun identifiant de commerce dans l'URL.");
      setLoading(false);
      return;
    }

    console.log("[QR Debug] Fetching business:", businessId);

    try {
      // Use the REST API directly for anonymous access to avoid auth issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=id,name,description,primary_color,secondary_color,card_style,max_points_per_card,reward_description,address,city,phone,website,category,logo_url`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error("[QR Debug] HTTP error:", response.status, await response.text());
        setFetchError(`Erreur serveur (${response.status}). Réessayez.`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("[QR Debug] Result:", data);

      if (data && data.length > 0) {
        setBusiness(data[0]);
      } else {
        console.warn("[QR Debug] No business found for ID:", businessId);
        setFetchError("Ce commerce n'existe pas ou le lien est invalide.");
      }
    } catch (err: any) {
      console.error("[QR Debug] Fetch error:", err);
      setFetchError("Erreur de connexion. Vérifiez votre réseau.");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBusiness();
  }, [businessId]);

  useEffect(() => {
    if (!card?.card_code) return;
    localStorage.setItem("customer_last_card_path", `/card/${card.card_code}`);
    document.cookie = `customer_last_card_code=${encodeURIComponent(card.card_code)}; path=/; max-age=31536000; SameSite=Lax`;
  }, [card?.card_code]);

  const handleRegister = async () => {
    if (!name.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Veuillez entrer votre email ou numéro de téléphone");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Adresse email invalide");
      return;
    }
    if (phone.trim() && !/^[\d\s+()-]{7,20}$/.test(phone.trim())) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    if (!business) return;
    setSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      };

      // Check existing by email
      let existingCustomer = null;
      if (email.trim()) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/customers?business_id=eq.${business.id}&email=eq.${encodeURIComponent(email.trim())}&select=*,customer_cards(*)`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        const data = await res.json();
        if (data?.length > 0) existingCustomer = data[0];
      }
      if (!existingCustomer && phone.trim()) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/customers?business_id=eq.${business.id}&phone=eq.${encodeURIComponent(phone.trim())}&select=*,customer_cards(*)`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        const data = await res.json();
        if (data?.length > 0) existingCustomer = data[0];
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
      const custRes = await fetch(`${supabaseUrl}/rest/v1/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          business_id: business.id,
          full_name: name.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      const newCustomers = await custRes.json();
      const newCustomer = newCustomers?.[0];

      if (!newCustomer) {
        toast.error("Erreur lors de l'inscription");
        setSubmitting(false);
        return;
      }

      // Auto-create loyalty card
      const cardRes = await fetch(`${supabaseUrl}/rest/v1/customer_cards`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_id: newCustomer.id,
          business_id: business.id,
          max_points: business.max_points_per_card || 10,
        }),
      });
      const newCards = await cardRes.json();
      const newCard = newCards?.[0];

      setCustomer(newCustomer);
      setCard(newCard);
      setStep("card");
      toast.success("Bienvenue ! Votre carte de fidélité est prête 🎉");
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Erreur lors de l'inscription");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError || !business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold">Commerce introuvable</h1>
          <p className="text-muted-foreground text-sm">
            {fetchError || "Ce lien n'est pas valide."}
          </p>
          <Button onClick={fetchBusiness} variant="outline" className="gap-2 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </Button>
          <p className="text-xs text-muted-foreground">
            ID: {businessId || "manquant"}
          </p>
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
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-20 h-20 rounded-2xl mx-auto object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-white font-display font-bold text-2xl"
                style={{ background: `linear-gradient(135deg, ${business.primary_color}, ${business.secondary_color})` }}
              >
                {business.name.charAt(0)}
              </div>
            )}
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
                <Label>Votre nom <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" className="rounded-xl h-12" required />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@email.com" className="rounded-xl h-12" type="email" />
                <p className="text-[10px] text-muted-foreground">Email ou téléphone requis</p>
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="rounded-xl h-12" type="tel" />
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
              logoUrl={business.logo_url || undefined}
              accentColor={business.primary_color}
              secondaryColor={business.secondary_color}
              rewardDescription={business.reward_description}
              rewardsEarned={card.rewards_earned || 0}
            />

            {/* Apple Wallet */}
            {isAppleDevice && card.card_code && (
              <button
                onClick={() => handleAddToWallet(card.card_code)}
                disabled={walletLoading}
                className="w-full flex justify-center"
              >
                <img
                  src={addToWalletBadge}
                  alt="Ajouter à Apple Cartes"
                  className="h-14 hover:opacity-80 transition-opacity"
                  style={{ filter: walletLoading ? "grayscale(1) opacity(0.5)" : "none" }}
                />
              </button>
            )}

            {/* Google Wallet */}
            {!isAppleDevice && card.card_code && (
              <button
                onClick={() => handleAddToGoogleWallet(card.card_code)}
                disabled={googleWalletLoading}
                className="w-full flex justify-center"
              >
                <div
                  className="h-14 px-6 rounded-lg flex items-center gap-3 hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: "#1f1f1f",
                    filter: googleWalletLoading ? "grayscale(1) opacity(0.5)" : "none",
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                    <path d="M21.4 11.3l-1-1.6-2.1 1.2.1-2.4h-1.9l.1 2.4-2.1-1.2-1 1.6 2.1 1.2-2.1 1.2 1 1.6 2.1-1.2-.1 2.4h1.9l-.1-2.4 2.1 1.2 1-1.6-2.1-1.2 2.1-1.2z" fill="#FBBC04"/>
                    <path d="M7.5 20C4.5 20 2 17.5 2 14.5S4.5 9 7.5 9c1.7 0 3 .6 4 1.7l-1.6 1.5c-.6-.6-1.4-.9-2.4-.9-2 0-3.6 1.6-3.6 3.6s1.6 3.6 3.6 3.6c1.5 0 2.3-.6 2.8-1.1.4-.4.7-1 .8-1.8H7.5v-2.1h5.8c.1.3.1.7.1 1.1 0 1.3-.4 3-1.5 4.1-1.1 1.2-2.5 1.8-4.4 1.8z" fill="#4285F4"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 leading-none">Ajouter à</p>
                    <p className="text-white font-medium text-base leading-tight">Google Wallet</p>
                  </div>
                </div>
              </button>
            )}

            <p className="text-xs text-muted-foreground">
              Code : <span className="font-mono">{card.card_code}</span>
            </p>

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
