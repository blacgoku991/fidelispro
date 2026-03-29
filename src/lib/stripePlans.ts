export const STRIPE_PLANS = {
  starter: {
    product_id: "prod_UEuRDMQSWVTnoL",
    price_id: "price_1TGQcwFQlLT8Im0J1OI53niu",
    name: "Starter",
    price: 29,
    features: [
      "Scanner QR",
      "Gestion clients",
      "Cartes de fidélité",
      "Récompenses",
      "Jusqu'à 200 clients",
    ],
  },
  pro: {
    product_id: "prod_UEuSxVTVVLAifJ",
    price_id: "price_1TGQdDFQlLT8Im0J7YQ9OWuG",
    name: "Pro",
    price: 79,
    popular: true,
    features: [
      "Tout Starter +",
      "Analytics avancés",
      "Notifications push",
      "Apple Wallet",
      "Scoring client",
      "Campagnes marketing",
      "Clients illimités",
    ],
  },
  enterprise: {
    product_id: "prod_UEuSC2IkdrsKfV",
    price_id: "price_1TGQdVFQlLT8Im0JMB3Y4hmT",
    name: "Enterprise",
    price: 199,
    features: [
      "Tout Pro +",
      "Géofencing avancé",
      "Événements spéciaux",
      "Notifications riches",
      "Support prioritaire",
      "API personnalisée",
    ],
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;
