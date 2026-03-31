import { motion } from "framer-motion";
import { Bell, CreditCard, Gauge, QrCode, Shield, Smartphone } from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Cartes Premium",
    description: "Cartes de fidélité digitales avec design personnalisable, compatibles Apple Wallet et Google Pay.",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    badge: null,
  },
  {
    icon: QrCode,
    title: "Scan Instantané",
    description: "Scannez le QR code client en une seconde. Plus rapide et plus fiable qu'un tampon papier.",
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    badge: "Populaire",
  },
  {
    icon: Bell,
    title: "Notifications Intelligentes",
    description: "Envoyez des notifications ciblées basées sur la proximité, le niveau et le comportement client.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    badge: "Nouveau",
  },
  {
    icon: Gauge,
    title: "Dashboard Puissant",
    description: "Suivez vos KPIs en temps réel : clients actifs, taux de retour, récompenses distribuées.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    badge: null,
  },
  {
    icon: Shield,
    title: "Sécurisé & Fiable",
    description: "Données chiffrées, conformité RGPD totale, infrastructure cloud haute disponibilité.",
    color: "from-slate-500 to-slate-700",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    badge: null,
  },
  {
    icon: Smartphone,
    title: "Gamification",
    description: "Niveaux Bronze/Silver/Gold, badges de fidélité, streaks. Transformez chaque visite en jeu.",
    color: "from-pink-500 to-rose-600",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    badge: "Nouveau",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-background" id="features">
      <div className="container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide uppercase mb-5">
            Fonctionnalités
          </span>
          <h2 className="text-3xl lg:text-5xl font-display font-extrabold text-balance">
            Tout ce qu'il faut pour <span className="text-gradient">fidéliser</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-lg text-pretty">
            Une plateforme complète pour transformer vos clients occasionnels en habitués fidèles.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className={`group relative p-6 rounded-2xl border border-border/50 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 ${feature.bg}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
            >
              {/* Badge Nouveau / Populaire */}
              {feature.badge && (
                <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  feature.badge === "Populaire"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                }`}>
                  {feature.badge === "Populaire" ? "⭐ " : "✨ "}{feature.badge}
                </span>
              )}

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-display font-bold mb-2.5 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>

              {/* Amber accent line at bottom on hover */}
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
