import { motion } from "framer-motion";
import { UserPlus, Palette, TrendingUp } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const defaultSteps = [
  { icon: UserPlus, title: "Inscris-toi en 2 minutes", desc: "Crée ton compte gratuitement et configure ta carte de fidélité en quelques clics." },
  { icon: Palette, title: "Crée ta carte de fidélité", desc: "Personnalise le design, les couleurs et les récompenses. Prête pour Apple & Google Wallet." },
  { icon: TrendingUp, title: "Tes clients reviennent", desc: "Envoie des notifications ciblées, suis tes stats et regarde ton chiffre grimper." },
];

const icons = [UserPlus, Palette, TrendingUp];

export function HowItWorksSection() {
  const { data: settings } = useSiteSettings();

  const steps = defaultSteps.map((s, i) => ({
    icon: icons[i],
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
          <h2 className="text-3xl lg:text-4xl font-display font-bold">
            Comment ça <span className="text-gradient">marche ?</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="relative text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-5 shadow-glow">
                <step.icon className="w-7 h-7 text-primary-foreground" />
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow-md">
                  {i + 1}
                </div>
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-primary/20" />
              )}
              <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
