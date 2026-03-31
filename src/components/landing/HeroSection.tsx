import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Bell, Award, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function HeroSection() {
  const { data: settings } = useSiteSettings();

  const headline = settings?.hero_headline || "Vos clients reviennent.";
  const headlineGradient = settings?.hero_headline_gradient || "Encore et encore.";
  const subtitle = settings?.hero_subtitle || "Créez des cartes de fidélité digitales premium, envoyez des notifications intelligentes et boostez votre chiffre d'affaires. Compatible Apple Wallet & Google Wallet.";
  const ctaPrimary = settings?.hero_cta_primary || "Commencer maintenant";
  const ctaSecondary = settings?.hero_cta_secondary || "Voir les tarifs";
  const badge = settings?.hero_badge || "La fidélité réinventée";
  const stat1 = settings?.hero_stat_1 || "⭐ 4.9/5";
  const stat2 = settings?.hero_stat_2 || "📲 50 000 cartes générées";
  const stat3 = settings?.hero_stat_3 || "🚀 Activation immédiate";
  const liveMerchantCount = parseInt((settings as any)?.live_merchant_count) || 247;

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Mesh gradient background — violet/amber */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0" style={{
        background: [
          "radial-gradient(ellipse 90% 70% at 10% 30%, hsl(245 58% 51% / 0.18), transparent)",
          "radial-gradient(ellipse 60% 50% at 80% 20%, hsl(270 65% 55% / 0.12), transparent)",
          "radial-gradient(ellipse 55% 45% at 65% 80%, hsl(38 92% 50% / 0.10), transparent)",
          "radial-gradient(ellipse 40% 35% at 30% 90%, hsl(245 58% 51% / 0.08), transparent)",
        ].join(", ")
      }} />
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: "linear-gradient(hsl(245 58% 51%) 1px, transparent 1px), linear-gradient(90deg, hsl(245 58% 51%) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      <div className="container relative z-10 py-16 sm:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center sm:text-left"
          >
            {/* Badge principal */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              {badge}
            </div>

            {/* Live merchant badge — animé */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-2 mb-5 justify-center sm:justify-start"
            >
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <motion.span
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                🟢 {liveMerchantCount} commerçants actifs
              </span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-extrabold leading-[1.05] tracking-tight">
              {headline}{" "}
              <span className="text-gradient">{headlineGradient}</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
              {subtitle}
            </p>

            {/* Stats band */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3"
            >
              {[stat1, stat2, stat3].map((stat, i) => (
                <motion.span
                  key={i}
                  className="px-3 py-1.5 rounded-full bg-card border border-border/60 text-xs font-semibold shadow-sm"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 + i * 0.1 }}
                >
                  {stat}
                </motion.span>
              ))}
            </motion.div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity rounded-xl px-8 h-13 text-base font-bold">
                <Link to="/register">
                  {ctaPrimary}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-8 h-13 text-base border-border/60 hover:border-primary/30 hover:bg-primary/5">
                <a href="#pricing">{ctaSecondary}</a>
              </Button>
            </div>

            {/* Trust indicators avec micro-accents ambrés */}
            <div className="mt-7 flex items-center justify-center sm:justify-start gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px]">✓</span>
                Résiliation facile
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px]">✓</span>
                Activation immédiate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px]">✓</span>
                Support français
              </span>
            </div>
          </motion.div>

          {/* Right - Floating card */}
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="flex justify-center items-center relative px-8 py-14"
          >
            {/* Glow orb behind card */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 rounded-full bg-amber-400/10 blur-2xl" />
            </div>

            {/* Floating badge: level up */}
            <motion.div
              className="absolute top-4 left-0 z-20 px-3 py-2 rounded-xl bg-card border border-border/60 shadow-lg flex items-center gap-2"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold">Bronze → Silver 🎉</span>
            </motion.div>

            {/* Floating revenue badge */}
            <motion.div
              className="absolute top-1/4 -right-2 z-20 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-lg flex items-center gap-2"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">+23% CA</span>
            </motion.div>

            {/* Floating notification */}
            <motion.div
              className="absolute bottom-4 right-0 z-20 px-3 py-2 rounded-xl bg-card border border-border/60 shadow-lg flex items-center gap-2 max-w-[190px]"
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            >
              <Bell className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Récompense disponible !</span>
            </motion.div>

            {/* Points badge */}
            <motion.div
              className="absolute bottom-1/3 -left-2 z-20 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
              animate={{ scale: [1, 1.14, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <span className="text-xs font-bold">+1 pt</span>
            </motion.div>

            {/* Card wrapper */}
            <div className="animate-float w-full max-w-[360px] relative z-10">
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
