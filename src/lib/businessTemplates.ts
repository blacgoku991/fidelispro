// Business type templates with pre-configured settings
export interface BusinessTemplate {
  id: string;
  label: string;
  emoji: string;
  description: string;
  config: Partial<BusinessConfig>;
}

export interface BusinessConfig {
  // Loyalty
  loyalty_type: "points" | "stamps" | "cashback";
  max_points_per_card: number;
  points_per_visit: number;
  points_per_euro: number;
  reward_description: string;
  // Card design
  primary_color: string;
  secondary_color: string;
  card_style: string;
  card_bg_type: "solid" | "gradient" | "image";
  show_customer_name: boolean;
  show_qr_code: boolean;
  show_points: boolean;
  show_expiration: boolean;
  show_rewards_preview: boolean;
  // Notifications
  notif_frequency: "unlimited" | "daily" | "weekly" | "custom";
  notif_time_start: string;
  notif_time_end: string;
  notif_custom_interval_hours: number;
  auto_notifications: boolean;
  auto_reminder_enabled: boolean;
  auto_reminder_days: number;
  reward_alert_threshold: number;
  // Geofencing
  geofence_enabled: boolean;
  geofence_radius: number;
  // Customer
  onboarding_mode: "instant" | "email" | "phone";
  // Features
  feature_gamification: boolean;
  feature_notifications: boolean;
  feature_wallet: boolean;
  feature_analytics: boolean;
  // Meta
  category: string;
  business_template: string;
}

export const defaultConfig: BusinessConfig = {
  loyalty_type: "points",
  max_points_per_card: 10,
  points_per_visit: 1,
  points_per_euro: 0,
  reward_description: "Récompense offerte !",
  primary_color: "#6B46C1",
  secondary_color: "#F6AD55",
  card_style: "classic",
  card_bg_type: "gradient",
  show_customer_name: true,
  show_qr_code: true,
  show_points: true,
  show_expiration: false,
  show_rewards_preview: true,
  notif_frequency: "daily",
  notif_time_start: "09:00",
  notif_time_end: "20:00",
  notif_custom_interval_hours: 24,
  auto_notifications: false,
  auto_reminder_enabled: false,
  auto_reminder_days: 7,
  reward_alert_threshold: 2,
  geofence_enabled: false,
  geofence_radius: 200,
  onboarding_mode: "instant",
  feature_gamification: true,
  feature_notifications: true,
  feature_wallet: false,
  feature_analytics: true,
  category: "general",
  business_template: "custom",
};

export const businessTemplates: BusinessTemplate[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    emoji: "🍽️",
    description: "Programme fidélité classique pour restaurants",
    config: {
      loyalty_type: "stamps",
      max_points_per_card: 10,
      points_per_visit: 1,
      reward_description: "Repas offert au 10ème passage !",
      primary_color: "#DC2626",
      secondary_color: "#F97316",
      card_style: "classic",
      category: "restaurant",
      geofence_radius: 500,
      auto_reminder_days: 14,
      business_template: "restaurant",
    },
  },
  {
    id: "coffee",
    label: "Coffee Shop",
    emoji: "☕",
    description: "Système de tampons pour cafés",
    config: {
      loyalty_type: "stamps",
      max_points_per_card: 8,
      points_per_visit: 1,
      reward_description: "Café offert au 8ème tampon !",
      primary_color: "#78350F",
      secondary_color: "#D97706",
      card_style: "coffee",
      category: "cafe",
      geofence_radius: 200,
      auto_reminder_days: 5,
      business_template: "coffee",
    },
  },
  {
    id: "beauty",
    label: "Salon de beauté",
    emoji: "💅",
    description: "Programme premium pour salons de beauté",
    config: {
      loyalty_type: "points",
      max_points_per_card: 12,
      points_per_visit: 1,
      reward_description: "Soin gratuit après 12 visites !",
      primary_color: "#BE185D",
      secondary_color: "#EC4899",
      card_style: "luxury",
      category: "coiffeur",
      geofence_radius: 1000,
      auto_reminder_days: 30,
      feature_gamification: true,
      business_template: "beauty",
    },
  },
  {
    id: "barber",
    label: "Barbier",
    emoji: "💈",
    description: "Fidélité simple et efficace pour barbiers",
    config: {
      loyalty_type: "stamps",
      max_points_per_card: 6,
      points_per_visit: 1,
      reward_description: "Coupe offerte à la 6ème visite !",
      primary_color: "#1E293B",
      secondary_color: "#64748B",
      card_style: "barber",
      category: "barbier",
      geofence_radius: 500,
      auto_reminder_days: 21,
      business_template: "barber",
    },
  },
  {
    id: "bakery",
    label: "Boulangerie",
    emoji: "🥖",
    description: "Programme quotidien pour boulangeries",
    config: {
      loyalty_type: "stamps",
      max_points_per_card: 10,
      points_per_visit: 1,
      reward_description: "Baguette offerte au 10ème achat !",
      primary_color: "#92400E",
      secondary_color: "#F59E0B",
      card_style: "classic",
      category: "boulangerie",
      geofence_radius: 200,
      auto_reminder_days: 3,
      business_template: "bakery",
    },
  },
  {
    id: "retail",
    label: "Commerce de détail",
    emoji: "🛍️",
    description: "Programme cashback pour commerces",
    config: {
      loyalty_type: "cashback",
      max_points_per_card: 100,
      points_per_euro: 5,
      points_per_visit: 0,
      reward_description: "5% de cashback sur vos achats !",
      primary_color: "#059669",
      secondary_color: "#10B981",
      card_style: "neon",
      category: "general",
      geofence_radius: 1000,
      auto_reminder_days: 14,
      feature_analytics: true,
      business_template: "retail",
    },
  },
];
