import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Zap, Crown, Shield, ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: 29,
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    description: "Parfait pour démarrer votre programme de fidélité.",
    features: [
      "Jusqu'à 200 clients",
      "Scanner QR code",
      "Cartes de fidélité digitales",
      "Gestion des récompenses",
      "Dashboard basique",
      "Support par email",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 79,
    icon: Crown,
    color: "from-violet-500 to-purple-600",
    popular: true,
    description: "Le plan complet pour les commerçants ambitieux.",
    features: [
      "Clients illimités",
      "Tout Starter +",
      "Apple Wallet & Google Wallet",
      "Notifications push ciblées",
      "Analytics avancés",
      "Scoring client",
      "Campagnes marketing",
      "Géofencing",
      "Support prioritaire",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 199,
    icon: Shield,
    color: "from-amber-500 to-orange-500",
    description: "Pour les chaînes et franchises avec besoins spécifiques.",
    features: [
      "Tout Pro +",
      "Multi-établissements",
      "Événements spéciaux",
      "Notifications riches (images)",
      "API personnalisée",
      "Onboarding dédié",
      "SLA garanti",
      "Support téléphonique",
    ],
  },
];

const comparison = [
  { feature: "Clients", starter: "200", pro: "Illimités", enterprise: "Illimités" },
  { feature: "Scanner QR code", starter: true, pro: true, enterprise: true },
  { feature: "Cartes de fidélité digitales", starter: true, pro: true, enterprise: true },
  { feature: "Gestion récompenses", starter: true, pro: true, enterprise: true },
  { feature: "Apple Wallet", starter: false, pro: true, enterprise: true },
  { feature: "Google Wallet", starter: false, pro: true, enterprise: true },
  { feature: "Notifications push", starter: false, pro: true, enterprise: true },
  { feature: "Analytics avancés", starter: false, pro: true, enterprise: true },
  { feature: "Scoring client", starter: false, pro: true, enterprise: true },
  { feature: "Campagnes marketing", starter: false, pro: true, enterprise: true },
  { feature: "Géofencing", starter: false, pro: true, enterprise: true },
  { feature: "Événements spéciaux", starter: false, pro: false, enterprise: true },
  { feature: "Notifications riches", starter: false, pro: false, enterprise: true },
  { feature: "API personnalisée", starter: false, pro: false, enterprise: true },
  { feature: "Multi-établissements", starter: false, pro: false, enterprise: true },
  { feature: "Support", starter: "Email", pro: "Prioritaire", enterprise: "Téléphone + SLA" },
];

const faqs = [
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment depuis votre dashboard. La facturation est ajustée au prorata.",
  },
  {
    q: "Y a-t-il un engagement minimum ?",
    a: "Non. Tous nos plans sont sans engagement, facturés mensuellement. Vous pouvez annuler à tout moment.",
  },
  {
    q: "Les cartes Apple Wallet fonctionnent-elles sur tous les iPhone ?",
    a: "Oui, les cartes Apple Wallet fonctionnent sur tous les iPhone sous iOS 6 et supérieur.",
  },
  {
    q: "Mes données clients sont-elles sécurisées ?",
    a: "Oui. Toutes les données sont hébergées en Europe, conformes au RGPD. Vos clients peuvent demander la suppression de leurs données.",
  },
  {
    q: "Y a-t-il des frais sur les transactions ?",
    a: "Non. FidéliPro est un abonnement mensuel fixe. Aucun frais caché ni commission sur vos ventes.",
  },
  {
    q: "Puis-je essayer avant de m'abonner ?",
    a: "Contactez-nous pour une démo personnalisée. Nous serons ravis de vous présenter FidéliPro en détail.",
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-secondary/40 transition-colors"
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

const Tarifs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 text-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Tarifs transparents</Badge>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight mb-4">
            Un plan pour chaque commerçant
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Sans engagement, sans frais cachés. Changez de plan à tout moment.
          </p>
        </motion.div>
      </section>

      {/* Plan cards */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative rounded-3xl border p-6 flex flex-col ${
                  plan.popular
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border/50 bg-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-sm px-3">Populaire</Badge>
                  </div>
                )}
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-display font-extrabold">{plan.price}€</span>
                  <span className="text-muted-foreground text-sm">/mois</span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`w-full rounded-xl gap-1.5 ${plan.popular ? "bg-gradient-primary text-primary-foreground" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  <Link to={`/register?plan=${plan.key}`}>
                    Commencer <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-display font-bold text-center mb-8">Comparatif détaillé</h2>
        <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-4 font-semibold">Fonctionnalité</th>
                {plans.map(p => (
                  <th key={p.key} className={`p-4 text-center font-semibold ${p.popular ? "text-primary" : ""}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/40 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="p-4 text-muted-foreground">{row.feature}</td>
                  <td className="p-4 text-center"><Cell value={row.starter} /></td>
                  <td className={`p-4 text-center ${plans[1].popular ? "bg-primary/5" : ""}`}><Cell value={row.pro} /></td>
                  <td className="p-4 text-center"><Cell value={row.enterprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-display font-bold text-center mb-8">Questions fréquentes</h2>
        <div className="space-y-3">
          {faqs.map(faq => <FaqItem key={faq.q} {...faq} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-card py-16 text-center px-4 mb-0">
        <h2 className="text-3xl font-display font-bold text-primary-foreground mb-3">Prêt à fidéliser vos clients ?</h2>
        <p className="text-primary-foreground/70 mb-6">Commencez dès aujourd'hui et fidélisez vos clients.</p>
        <Button asChild size="lg" className="bg-white text-primary font-bold rounded-xl gap-2 hover:bg-white/90">
          <Link to="/register">Créer mon compte <ArrowRight className="w-4 h-4" /></Link>
        </Button>
      </section>

      <Footer />
    </div>
  );
};

export default Tarifs;
