import { motion } from "framer-motion";
import { Bell, CreditCard, Gauge, QrCode, Shield, Smartphone } from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Cartes Premium",
    description: "Cartes de fidélité digitales avec design personnalisable, compatible Apple Wallet et Google Pay.",
  },
  {
    icon: QrCode,
    title: "Scan Instantané",
    description: "Scannez le QR code client en une seconde. Plus rapide qu'un tampon papier.",
  },
  {
    icon: Bell,
    title: "Notifications Intelligentes",
    description: "Envoyez des notifications ciblées basées sur la proximité et le comportement client.",
  },
  {
    icon: Gauge,
    title: "Dashboard Puissant",
    description: "Suivez vos KPIs : clients actifs, taux de retour, chiffre d'affaires généré.",
  },
  {
    icon: Shield,
    title: "Sécurisé & Fiable",
    description: "Données chiffrées, conformité RGPD, infrastructure cloud hautement disponible.",
  },
  {
    icon: Smartphone,
    title: "Gamification",
    description: "Niveaux Bronze/Silver/Gold, badges, streaks. Transformez la fidélité en jeu.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-secondary/50">
      <div className="container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl lg:text-4xl font-display font-bold">
            Tout ce qu'il faut pour <span className="text-gradient">fidéliser</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Une plateforme complète pour transformer vos clients occasionnels en habitués.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
