import { motion } from "framer-motion";
import { UserPlus, Palette, TrendingUp } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const defaultSteps = [
  { icon: UserPlus, title: "Inscris-toi en 2 minutes", desc: "Crée ton compte gratuitement et configure ta carte de fidélité en quelques clics.", color: "from-violet-500 to-purple-600" },
  { icon: Palette, title: "Crée ta carte de fidélité", desc: "Personnalise le design, les couleurs et les récompenses. Prête pour Apple & Google Wallet.", color: "from-blue-500 to-cyan-600" },
  { icon: TrendingUp, title: "Tes clients reviennent", desc: "Envoie des notifications ciblées, suis tes stats et regarde ton chiffre grimper.", color: "from-emerald-500 to-teal-600" },
];

const icons = [UserPlus, Palette, TrendingUp];

export function HowItWorksSection() {
  const { data: settings } = useSiteSettings();

  const steps = defaultSteps.map((s, i) => ({
    icon: icons[i],
    color: s.color,
    title: settings?.[`how_step_${i + 1}_title`] || s.title,
    desc: settings?.[`how_step_${i + 1}_desc`] || s.desc,
  }));

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide uppercase mb-5">
            Simple & Rapide
          </span>
          <h2 className="text-3xl lg:text-5xl font-display font-extrabold text-balance">
            Comment ça <span className="text-gradient">marche ?</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Lancez votre programme de fidélité en moins de 5 minutes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px border-t-2 border-dashed border-primary/20 z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="relative text-center z-10"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                  <step.icon className="w-9 h-9 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-primary text-primary text-xs font-bold flex items-center justify-center shadow-sm">
                  {i + 1}
                </div>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px] mx-auto">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
