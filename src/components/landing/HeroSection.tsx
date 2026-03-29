import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoyaltyCard } from "@/components/LoyaltyCard";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              La fidélité réinventée
            </div>
            <h1 className="text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight">
              Vos clients reviennent.{" "}
              <span className="text-gradient">Encore et encore.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Créez des cartes de fidélité digitales premium, envoyez des notifications
              intelligentes et boostez votre chiffre d'affaires. Compatible Apple Pay & Google Pay.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity rounded-xl px-8 h-12 text-base font-semibold">
                <Link to="/register">
                  Commencer gratuitement
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8 h-12 text-base">
                <Link to="/demo">Voir la démo</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span>✓ Sans engagement</span>
              <span>✓ Essai gratuit 14 jours</span>
            </div>
          </motion.div>

          {/* Right - Floating card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center animate-float"
          >
            <LoyaltyCard
              businessName="Boucherie Laurent"
              customerName="Marie Dupont"
              points={7}
              maxPoints={10}
              level="gold"
              cardId="demo-card-001"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
