import { useSiteSettings } from "./useSiteSettings";
import { STRIPE_PLANS } from "@/lib/stripePlans";

export interface PricingPlan {
  key: string;
  name: string;
  price: number;
  features: string[];
  price_id: string;
  product_id: string;
  popular: boolean;
  cta: string;
}

function parseFeatures(json: string | undefined, fallback: readonly string[]): string[] {
  if (!json) return [...fallback];
  try { return JSON.parse(json); } catch { return [...fallback]; }
}

export function usePricingPlans(): { starter: PricingPlan; pro: PricingPlan; isLoading: boolean } {
  const { data: s, isLoading } = useSiteSettings();

  const starter: PricingPlan = {
    key: "starter",
    name: s?.plan_starter_name || STRIPE_PLANS.starter.name,
    price: parseInt(s?.plan_starter_price || "") || STRIPE_PLANS.starter.price,
    features: parseFeatures(s?.plan_starter_features, STRIPE_PLANS.starter.features),
    price_id: s?.stripe_price_starter || STRIPE_PLANS.starter.price_id,
    product_id: s?.stripe_product_starter || STRIPE_PLANS.starter.product_id,
    popular: false,
    cta: "S'abonner",
  };

  const pro: PricingPlan = {
    key: "pro",
    name: s?.plan_pro_name || STRIPE_PLANS.pro.name,
    price: parseInt(s?.plan_pro_price || "") || STRIPE_PLANS.pro.price,
    features: parseFeatures(s?.plan_pro_features, STRIPE_PLANS.pro.features),
    price_id: s?.stripe_price_pro || STRIPE_PLANS.pro.price_id,
    product_id: s?.stripe_product_pro || STRIPE_PLANS.pro.product_id,
    popular: true,
    cta: "Démarrer maintenant",
  };

  return { starter, pro, isLoading };
}
