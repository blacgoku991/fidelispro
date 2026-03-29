import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "29",
    description: "Pour les petits commerces qui débutent",
    features: [
      "1 point de vente",
      "100 cartes de fidélité",
      "Notifications push basiques",
      "Dashboard simplifié",
      "Support par email",
    ],
    cta: "Commencer",
    popular: false,
  },
  {
    name: "Pro",
    price: "79",
    description: "Pour les commerces en croissance",
    features: [
      "5 points de vente",
      "Cartes illimitées",
      "Notifications intelligentes",
      "Gamification complète",
      "Dashboard avancé",
      "Branding personnalisé",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    description: "Pour les chaînes et franchises",
    features: [
      "Points de vente illimités",
      "API complète",
      "Intégrations caisse",
      "Manager dédié",
      "SLA garanti",
      "Formation équipes",
    ],
    cta: "Nous contacter",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24" id="pricing">
      <div className="container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl lg:text-4xl font-display font-bold">
            Des prix <span className="text-gradient">simples et transparents</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Choisissez le plan adapté à votre activité. Sans surprise.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-2 sm:px-0">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                plan.popular
                  ? "bg-gradient-card text-primary-foreground border-primary/30 shadow-glow md:scale-105"
                  : "bg-card border-border/50 hover:border-primary/20"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-accent text-xs font-semibold text-accent-foreground">
                  Le plus populaire
                </div>
              )}
              <h3 className="text-xl font-display font-bold">{plan.name}</h3>
              <p className={`text-sm mt-1 ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
              <div className="mt-6 mb-6">
                {plan.price !== "Sur mesure" ? (
                  <span className="text-4xl font-display font-bold">
                    {plan.price}€<span className="text-base font-normal opacity-60">/mois</span>
                  </span>
                ) : (
                  <span className="text-2xl font-display font-bold">{plan.price}</span>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.popular ? "text-accent" : "text-primary"}`} />
                    <span className={plan.popular ? "text-primary-foreground/90" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`w-full rounded-xl h-11 font-semibold ${
                  plan.popular
                    ? "bg-gradient-accent text-accent-foreground hover:opacity-90"
                    : "bg-gradient-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                <Link to="/register">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
