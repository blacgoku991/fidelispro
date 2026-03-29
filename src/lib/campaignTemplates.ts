// Campaign templates organized by category, adaptable to any business type
export interface CampaignTemplate {
  id: string;
  emoji: string;
  label: string;
  description: string;
  defaultMessage: string;
  category: "promo" | "fidelite" | "event" | "relance" | "flash";
  suggestedSegment: "all" | "active" | "inactive" | "vip" | "close_to_reward";
}

// {businessName} is replaced at render time
export const campaignTemplates: CampaignTemplate[] = [
  // — Promotions —
  {
    id: "buy2get1",
    emoji: "🎁",
    label: "2 achetés = 1 offert",
    description: "Offre classique pour booster les ventes",
    defaultMessage: "2 achetés = 1 offert aujourd'hui chez {businessName} ! 🎁",
    category: "promo",
    suggestedSegment: "all",
  },
  {
    id: "percent_off",
    emoji: "💥",
    label: "-20% sur tout",
    description: "Réduction générale pour attirer du monde",
    defaultMessage: "-20% sur tout aujourd'hui chez {businessName} ! 💥",
    category: "promo",
    suggestedSegment: "all",
  },
  {
    id: "free_item",
    emoji: "🆓",
    label: "Article offert",
    description: "Offrir un produit pour fidéliser",
    defaultMessage: "Votre {item} offert dès {montant}€ d'achat ! 🆓",
    category: "promo",
    suggestedSegment: "active",
  },
  // — Fidélité —
  {
    id: "double_points",
    emoji: "⚡",
    label: "Points x2",
    description: "Doublez les points aujourd'hui",
    defaultMessage: "Points x2 aujourd'hui chez {businessName} ! ⚡",
    category: "fidelite",
    suggestedSegment: "all",
  },
  {
    id: "reward_reminder",
    emoji: "🏆",
    label: "Rappel récompense",
    description: "Rappelez aux clients proches de leur récompense",
    defaultMessage: "Plus que quelques points avant votre récompense ! 🏆",
    category: "fidelite",
    suggestedSegment: "close_to_reward",
  },
  {
    id: "vip_exclusive",
    emoji: "👑",
    label: "Exclusivité VIP",
    description: "Offre réservée à vos meilleurs clients",
    defaultMessage: "Offre exclusive VIP : -30% pour vous ! 👑",
    category: "fidelite",
    suggestedSegment: "vip",
  },
  // — Événements —
  {
    id: "happy_hour",
    emoji: "🍹",
    label: "Happy Hour",
    description: "Annoncez un créneau promotionnel",
    defaultMessage: "Happy Hour 17h-19h : -50% chez {businessName} ! 🍹",
    category: "event",
    suggestedSegment: "all",
  },
  {
    id: "new_arrival",
    emoji: "✨",
    label: "Nouveauté",
    description: "Annoncez un nouveau produit ou service",
    defaultMessage: "Découvrez notre nouveauté chez {businessName} ! ✨",
    category: "event",
    suggestedSegment: "all",
  },
  {
    id: "anniversary",
    emoji: "🎂",
    label: "Anniversaire",
    description: "Célébrez un anniversaire avec une offre",
    defaultMessage: "C'est notre anniversaire ! -25% pour fêter ça 🎂",
    category: "event",
    suggestedSegment: "all",
  },
  // — Relance —
  {
    id: "miss_you",
    emoji: "💌",
    label: "On vous attend",
    description: "Relancez les clients inactifs",
    defaultMessage: "Ça fait longtemps ! Revenez avec -15% 💌",
    category: "relance",
    suggestedSegment: "inactive",
  },
  {
    id: "come_back",
    emoji: "🔄",
    label: "Offre de retour",
    description: "Incitez au retour avec un cadeau",
    defaultMessage: "Un cadeau vous attend chez {businessName} 🎁",
    category: "relance",
    suggestedSegment: "inactive",
  },
  // — Flash —
  {
    id: "flash_sale",
    emoji: "⏰",
    label: "Vente flash",
    description: "Offre limitée dans le temps",
    defaultMessage: "FLASH : -40% pendant 2h seulement ! ⏰",
    category: "flash",
    suggestedSegment: "all",
  },
  {
    id: "last_chance",
    emoji: "🔥",
    label: "Dernière chance",
    description: "Créez l'urgence pour une offre qui expire",
    defaultMessage: "Dernière chance ! L'offre expire ce soir 🔥",
    category: "flash",
    suggestedSegment: "active",
  },
];

export const campaignCategories = [
  { id: "all", label: "Tout", emoji: "📋" },
  { id: "promo", label: "Promos", emoji: "💥" },
  { id: "fidelite", label: "Fidélité", emoji: "⭐" },
  { id: "event", label: "Événements", emoji: "🎉" },
  { id: "relance", label: "Relance", emoji: "💌" },
  { id: "flash", label: "Flash", emoji: "⚡" },
] as const;
