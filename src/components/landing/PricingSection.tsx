import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePricingPlans } from "@/hooks/usePricingPlans";

const PLAN_DESCRIPTIONS: Record<string, string> = {
  starter: "Pour les petits commerces qui débutent",
  pro: "Pour les commerces en croissance",
};

export function PricingSection() {
  const { starter, pro } = usePricingPlans();
  const plans = [
    { ...starter, description: PLAN_DESCRIPTIONS.starter },
    { ...pro,     description: PLAN_DESCRIPTIONS.pro },
  ];
  return (
    <section className="py-24" id="pricing">
      <div className="container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide uppercase mb-5">
            Tarifs
          </span>
          <h2 className="text-3xl lg:text-5xl font-display font-extrabold">
            Des prix <span className="text-gradient">simples et transparents</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-lg">
            Choisissez le plan adapté à votre activité. Sans surprise.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto px-2 sm:px-0">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                plan.popular
                  ? "bg-gradient-card text-primary-foreground border-primary/30 shadow-glow md:scale-105"
                  : "bg-card border-border/50 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
              }`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: plan.popular ? 0 : -4 }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-bold text-white shadow-lg shadow-amber-500/30">
                  <Zap className="w-3.5 h-3.5" />
                  Le plus populaire
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-xl font-display font-extrabold">{plan.name}</h3>
                <p className={`text-sm mt-1.5 ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-7">
                {plan.price > 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-display font-extrabold">{plan.price}€</span>
                    <span className={`text-sm ${plan.popular ? "text-primary-foreground/60" : "text-muted-foreground"}`}>/mois</span>
                  </div>
                ) : (
                  <span className="text-2xl font-display font-bold">Sur mesure</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      plan.popular ? "bg-amber-500/20" : "bg-primary/10"
                    }`}>
                      <Check className={`w-3 h-3 ${plan.popular ? "text-amber-300" : "text-primary"}`} />
                    </span>
                    <span className={plan.popular ? "text-primary-foreground/90" : ""}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full rounded-xl h-12 font-bold text-base ${
                  plan.popular
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-lg shadow-amber-500/30"
                    : "bg-gradient-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                <Link to={`/register?plan=${plan.key}`}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
