import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Euro, Users, Calendar } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function formatEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function RoiCalculatorSection() {
  const [clients, setClients] = useState(200);
  const [frequency, setFrequency] = useState(3);
  const [basket, setBasket] = useState(40);

  // Retention uplift model: fidelity programs typically increase visit frequency +15-25%
  const upliftRate = 0.20;
  const extraVisitsPerClient = frequency * upliftRate;
  const extraRevenuePerClient = extraVisitsPerClient * basket;
  const totalExtraRevenue = Math.round(extraRevenuePerClient * clients);
  const monthlyFideli = 79; // plan Pro
  const roi = Math.round((totalExtraRevenue / monthlyFideli) * 10) / 10;

  return (
    <section className="py-24 bg-secondary/20" id="roi">
      <div className="container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide uppercase mb-5">
            Calculateur ROI
          </span>
          <h2 className="text-3xl lg:text-5xl font-display font-extrabold text-balance">
            Combien allez-vous <span className="text-gradient-amber">gagner</span> ?
          </h2>
          <p className="mt-5 text-muted-foreground text-lg">
            Estimez le chiffre d'affaires supplémentaire généré par votre programme de fidélité.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Sliders */}
          <motion.div
            className="bg-card rounded-2xl border border-border/50 p-7 space-y-8 shadow-md"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            {/* Clients */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="w-4 h-4 text-primary" />
                  Nombre de clients
                </div>
                <span className="text-lg font-display font-bold text-primary">{clients}</span>
              </div>
              <Slider
                min={50} max={2000} step={50}
                value={[clients]}
                onValueChange={([v]) => setClients(v)}
                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>50</span><span>2 000</span>
              </div>
            </div>

            {/* Fréquence */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Visites / mois par client
                </div>
                <span className="text-lg font-display font-bold text-amber-600">{frequency}x</span>
              </div>
              <Slider
                min={1} max={8} step={1}
                value={[frequency]}
                onValueChange={([v]) => setFrequency(v)}
                className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-500 [&_.range]:bg-amber-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>1x</span><span>8x</span>
              </div>
            </div>

            {/* Panier moyen */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Euro className="w-4 h-4 text-emerald-500" />
                  Panier moyen
                </div>
                <span className="text-lg font-display font-bold text-emerald-600">{basket}€</span>
              </div>
              <Slider
                min={10} max={150} step={5}
                value={[basket]}
                onValueChange={([v]) => setBasket(v)}
                className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>10€</span><span>150€</span>
              </div>
            </div>
          </motion.div>

          {/* Results */}
          <motion.div
            className="bg-gradient-card rounded-2xl p-7 flex flex-col justify-between text-primary-foreground shadow-xl"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div>
              <p className="text-primary-foreground/60 text-sm font-semibold uppercase tracking-wide mb-2">CA fidélisation estimé / mois</p>
              <motion.p
                key={totalExtraRevenue}
                className="text-5xl font-display font-extrabold mb-1"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {formatEuro(totalExtraRevenue)}
              </motion.p>
              <p className="text-primary-foreground/60 text-sm">CA additionnel estimé grâce à la fidélisation (+20% de visites)</p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-sm text-primary-foreground/70">Coût FidéliPro Pro</span>
                <span className="font-bold">{formatEuro(monthlyFideli)}/mois</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-300" />
                  <span className="text-sm font-semibold text-amber-200">ROI estimé</span>
                </div>
                <motion.span
                  key={roi}
                  className="font-display font-extrabold text-amber-300 text-lg"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  ×{roi}
                </motion.span>
              </div>
              <p className="text-[11px] text-primary-foreground/40 leading-relaxed">
                * Estimation basée sur un taux de retour moyen +20% observé sur les programmes de fidélité digitaux. Résultats variables selon l'activité.
              </p>
            </div>

            <Button asChild size="lg" className="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-amber-500/30">
              <Link to="/register">Commencer maintenant</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
