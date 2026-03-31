import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Bell, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function HeroSection() {
  const { data: settings } = useSiteSettings();

  const headline = settings?.hero_headline || "Vos clients reviennent.";
  const headlineGradient = settings?.hero_headline_gradient || "Encore et encore.";
  const subtitle = settings?.hero_subtitle || "Créez des cartes de fidélité digitales premium, envoyez des notifications intelligentes et boostez votre chiffre d'affaires. Compatible Apple Wallet & Google Wallet.";
  const ctaPrimary = settings?.hero_cta_primary || "Commencer gratuitement";
  const ctaSecondary = settings?.hero_cta_secondary || "Voir les tarifs";
  const badge = settings?.hero_badge || "La fidélité réinventée";
  const stat1 = settings?.hero_stat_1 || "🏪 +200 commerçants";
  const stat2 = settings?.hero_stat_2 || "⭐ 4.9/5";
  const stat3 = settings?.hero_stat_3 || "📲 50 000 cartes générées";

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 opacity-30" style={{
        background: "radial-gradient(ellipse 80% 60% at 20% 40%, hsl(245 58% 51% / 0.15), transparent), radial-gradient(ellipse 60% 50% at 80% 30%, hsl(270 65% 55% / 0.1), transparent), radial-gradient(ellipse 50% 40% at 50% 80%, hsl(38 92% 50% / 0.05), transparent)"
      }} />

      <div className="container relative z-10 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center sm:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Sparkles className="w-4 h-4" />
              {badge}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight">
              {headline}{" "}
              <span className="text-gradient">{headlineGradient}</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
              {subtitle}
            </p>

            {/* Stats band */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5"
            >
              {[stat1, stat2, stat3].map((stat, i) => (
                <motion.span
                  key={i}
                  className="px-3 py-1.5 rounded-full bg-card border border-border/50 text-xs sm:text-sm font-medium shadow-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  {stat}
                </motion.span>
              ))}
            </motion.div>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity rounded-xl px-8 h-12 text-base font-semibold">
                <Link to="/register">
                  {ctaPrimary}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-8 h-12 text-base">
                <a href="#pricing">{ctaSecondary}</a>
              </Button>
            </div>
            <div className="mt-6 sm:mt-8 flex items-center justify-center sm:justify-start gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <span>✓ Sans engagement</span>
              <span>✓ Essai gratuit 14 jours</span>
            </div>
          </motion.div>

          {/* Right - Floating card with decorative elements */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center relative"
          >
            {/* Floating badge: level up */}
            <motion.div
              className="absolute -top-2 -left-2 sm:top-4 sm:left-0 z-20 px-3 py-2 rounded-xl bg-card border border-border/50 shadow-lg flex items-center gap-2"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Award className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold">Bronze → Silver 🎉</span>
            </motion.div>

            {/* Floating notification mockup */}
            <motion.div
              className="absolute -bottom-2 -right-2 sm:bottom-4 sm:right-0 z-20 px-3 py-2 rounded-xl bg-card border border-border/50 shadow-lg flex items-center gap-2 max-w-[180px]"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Bell className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Votre récompense vous attend !</span>
            </motion.div>

            {/* Floating points badge */}
            <motion.div
              className="absolute top-1/2 -right-4 sm:right-[-20px] z-20 px-2.5 py-1.5 rounded-full bg-gradient-accent text-accent-foreground shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <span className="text-xs font-bold">+1 pt</span>
            </motion.div>

            <div className="animate-float">
              <LoyaltyCard
                businessName="Boucherie Laurent"
                customerName="Marie Dupont"
                points={7}
                maxPoints={10}
                level="gold"
                cardId="demo-card-001"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
