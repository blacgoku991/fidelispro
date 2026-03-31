-- =============================================================================
-- FidéliPro — Schéma Supabase complet
-- À coller dans : Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- ─── EXTENSIONS ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('super_admin', 'business_owner');
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'pro', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'trialing', 'past_due', 'canceled');
CREATE TYPE public.loyalty_level AS ENUM ('bronze', 'silver', 'gold');
CREATE TYPE public.notification_type AS ENUM ('proximity', 'points_reminder', 'special_offer', 'win_back', 'reward_earned', 'custom');

-- ─── FONCTIONS UTILITAIRES ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ─── TABLE : user_roles ───────────────────────────────────────────────────────
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- ─── TABLE : profiles ─────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ─── TABLE : businesses ───────────────────────────────────────────────────────
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  website TEXT,
  category TEXT DEFAULT 'general',
  -- Card design
  primary_color TEXT DEFAULT '#6B46C1',
  secondary_color TEXT DEFAULT '#F6AD55',
  accent_color TEXT DEFAULT '#F59E0B',
  card_style TEXT DEFAULT 'classic',
  card_bg_type TEXT DEFAULT 'gradient' CHECK (card_bg_type IN ('solid', 'gradient', 'image')),
  card_bg_image_url TEXT,
  show_customer_name BOOLEAN DEFAULT true,
  show_qr_code BOOLEAN DEFAULT true,
  show_points BOOLEAN DEFAULT true,
  show_expiration BOOLEAN DEFAULT false,
  show_rewards_preview BOOLEAN DEFAULT true,
  promo_text TEXT,
  -- Loyalty config
  loyalty_type TEXT DEFAULT 'points' CHECK (loyalty_type IN ('points', 'stamps', 'cashback')),
  points_per_visit INTEGER DEFAULT 1,
  points_per_euro INTEGER DEFAULT 0,
  max_points_per_card INTEGER DEFAULT 10,
  reward_description TEXT DEFAULT 'Récompense offerte !',
  business_template TEXT DEFAULT 'custom',
  -- Subscription
  subscription_plan subscription_plan DEFAULT 'starter',
  subscription_status subscription_status DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  -- Geofencing
  geofence_enabled BOOLEAN DEFAULT false,
  geofence_radius INTEGER DEFAULT 200,
  geofence_message TEXT DEFAULT 'Passez nous voir, on vous attend ! 🎉',
  geofence_time_start TIME DEFAULT '09:00',
  geofence_time_end TIME DEFAULT '20:00',
  geofence_satellite_points JSONB DEFAULT '[]'::jsonb,
  -- Automations
  birthday_notif_enabled BOOLEAN DEFAULT false,
  birthday_notif_message TEXT DEFAULT 'Joyeux anniversaire ! Un cadeau vous attend 🎂',
  welcome_push_enabled BOOLEAN DEFAULT true,
  welcome_push_message TEXT DEFAULT 'Bienvenue ! Votre carte de fidélité est prête 🎉',
  vip_auto_enabled BOOLEAN DEFAULT false,
  vip_auto_threshold INTEGER DEFAULT 50,
  -- Notifications
  auto_notifications BOOLEAN DEFAULT false,
  notif_frequency TEXT DEFAULT 'daily' CHECK (notif_frequency IN ('unlimited', 'daily', 'weekly', 'custom')),
  notif_time_start TIME DEFAULT '09:00',
  notif_time_end TIME DEFAULT '20:00',
  notif_custom_interval_hours INTEGER DEFAULT 24,
  auto_reminder_enabled BOOLEAN DEFAULT false,
  auto_reminder_days INTEGER DEFAULT 7,
  reward_alert_threshold INTEGER DEFAULT 2,
  -- Features
  feature_gamification BOOLEAN DEFAULT true,
  feature_notifications BOOLEAN DEFAULT true,
  feature_wallet BOOLEAN DEFAULT false,
  feature_analytics BOOLEAN DEFAULT true,
  feature_customer_scoring BOOLEAN DEFAULT true,
  feature_special_events BOOLEAN DEFAULT true,
  feature_rich_notifications BOOLEAN DEFAULT true,
  -- Scoring thresholds
  score_vip_threshold INTEGER DEFAULT 80,
  score_loyal_threshold INTEGER DEFAULT 60,
  score_regular_threshold INTEGER DEFAULT 40,
  score_at_risk_threshold INTEGER DEFAULT 20,
  vip_min_visits INTEGER DEFAULT 10,
  vip_min_total_spent NUMERIC DEFAULT 0,
  notification_frequency_limit TEXT DEFAULT 'daily',
  card_animation_intensity TEXT DEFAULT 'medium',
  -- Onboarding
  onboarding_mode TEXT DEFAULT 'instant' CHECK (onboarding_mode IN ('instant', 'email', 'phone')),
  -- Public vitrine
  slug TEXT UNIQUE,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX businesses_slug_idx ON public.businesses(slug);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own business" ON public.businesses FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can update own business" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Super admins can view all businesses" ON public.businesses FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all businesses" ON public.businesses FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view business basic info" ON public.businesses FOR SELECT TO anon USING (true);

-- ─── TABLE : customers ────────────────────────────────────────────────────────
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  level loyalty_level DEFAULT 'bronze',
  total_points INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  badges TEXT[] DEFAULT '{}',
  push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage their customers" ON public.customers FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admins can view all customers" ON public.customers FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Anon can create customer profile" ON public.customers FOR INSERT TO anon
  WITH CHECK (business_id IS NOT NULL AND full_name IS NOT NULL);
CREATE POLICY "Anyone can view customer" ON public.customers FOR SELECT TO anon USING (true);

-- ─── TABLE : customer_cards ───────────────────────────────────────────────────
CREATE TABLE public.customer_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  current_points INTEGER DEFAULT 0,
  max_points INTEGER DEFAULT 10,
  rewards_earned INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  card_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  last_visit TIMESTAMPTZ,
  wallet_auth_token TEXT,
  wallet_installed_at TIMESTAMPTZ,
  wallet_last_fetched_at TIMESTAMPTZ,
  wallet_change_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage their cards" ON public.customer_cards FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Anon can create customer card" ON public.customer_cards FOR INSERT TO anon
  WITH CHECK (business_id IS NOT NULL AND customer_id IS NOT NULL);
CREATE POLICY "Anyone can view card by code" ON public.customer_cards FOR SELECT TO anon USING (true);

-- ─── TABLE : points_history ───────────────────────────────────────────────────
CREATE TABLE public.points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES public.customer_cards(id) ON DELETE CASCADE NOT NULL,
  points_added INTEGER NOT NULL DEFAULT 1,
  action TEXT DEFAULT 'scan',
  note TEXT,
  scanned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage points" ON public.points_history FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ─── TABLE : rewards ──────────────────────────────────────────────────────────
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage rewards" ON public.rewards FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ─── TABLE : notification_templates ──────────────────────────────────────────
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  trigger_distance INTEGER,
  trigger_days_inactive INTEGER,
  trigger_points_remaining INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage notifications" ON public.notification_templates FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ─── TABLE : notifications_log ────────────────────────────────────────────────
CREATE TABLE public.notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  campaign_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  media_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  segment TEXT,
  delivery_status TEXT DEFAULT 'sent',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can view their notification logs" ON public.notifications_log FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Business owners can insert notification logs" ON public.notifications_log FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ─── TABLE : notification_campaigns ──────────────────────────────────────────
CREATE TABLE public.notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  media_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  send_mode TEXT NOT NULL DEFAULT 'now',
  send_at TIMESTAMPTZ,
  frequency_limit TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  recipients_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_campaigns_business_id ON public.notification_campaigns(business_id);
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage notification campaigns" ON public.notification_campaigns FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ─── TABLE : customer_scores ──────────────────────────────────────────────────
CREATE TABLE public.customer_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  customer_id UUID NOT NULL UNIQUE,
  score NUMERIC NOT NULL DEFAULT 0,
  segment TEXT NOT NULL DEFAULT 'regular',
  visits_score INTEGER NOT NULL DEFAULT 0,
  spend_score INTEGER NOT NULL DEFAULT 0,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  recency_score INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  inactivity_days INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_scores_business_id ON public.customer_scores(business_id);
ALTER TABLE public.customer_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage their customer scores" ON public.customer_scores FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ─── TABLE : special_events ───────────────────────────────────────────────────
CREATE TABLE public.special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  start_hour TIME,
  end_hour TIME,
  reward_multiplier NUMERIC NOT NULL DEFAULT 1,
  eligible_segment TEXT NOT NULL DEFAULT 'all',
  notification_message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage special events" ON public.special_events FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ─── TABLE : wallet_registrations ────────────────────────────────────────────
CREATE TABLE public.wallet_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_library_id TEXT NOT NULL,
  pass_type_id TEXT NOT NULL DEFAULT 'pass.app.fidelispro',
  serial_number TEXT NOT NULL,
  push_token TEXT NOT NULL,
  authentication_token TEXT NOT NULL,
  customer_id UUID,
  business_id UUID,
  card_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_library_id, pass_type_id, serial_number)
);
ALTER TABLE public.wallet_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can view wallet registrations" ON public.wallet_registrations FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admins can view all wallet registrations" ON public.wallet_registrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Anon can manage wallet registrations" ON public.wallet_registrations FOR ALL TO anon
  USING (serial_number IS NOT NULL AND device_library_id IS NOT NULL)
  WITH CHECK (serial_number IS NOT NULL AND device_library_id IS NOT NULL AND push_token IS NOT NULL AND authentication_token IS NOT NULL);

-- ─── TABLE : wallet_pass_updates ─────────────────────────────────────────────
CREATE TABLE public.wallet_pass_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT NOT NULL,
  pass_type_id TEXT NOT NULL DEFAULT 'pass.app.fidelispro',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_message TEXT,
  campaign_id UUID,
  UNIQUE(serial_number, pass_type_id)
);
ALTER TABLE public.wallet_pass_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can read wallet pass updates" ON public.wallet_pass_updates FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can manage wallet pass updates" ON public.wallet_pass_updates FOR ALL TO authenticated
  USING (serial_number IS NOT NULL) WITH CHECK (serial_number IS NOT NULL);

-- ─── TABLE : wallet_apns_logs ─────────────────────────────────────────────────
CREATE TABLE public.wallet_apns_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  serial_number TEXT NOT NULL,
  push_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  apns_response TEXT,
  error_message TEXT,
  campaign_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_apns_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can view their APNs logs" ON public.wallet_apns_logs FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Authenticated can insert APNs logs" ON public.wallet_apns_logs FOR INSERT TO authenticated
  WITH CHECK (business_id IS NOT NULL AND serial_number IS NOT NULL AND push_token IS NOT NULL);

-- ─── TABLE : site_settings ────────────────────────────────────────────────────
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read site settings" ON public.site_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read site settings" ON public.site_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage site settings" ON public.site_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ─── TABLE : testimonials ─────────────────────────────────────────────────────
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Général',
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read visible testimonials" ON public.testimonials FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated can read testimonials" ON public.testimonials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ─── TABLE : faq_items ────────────────────────────────────────────────────────
CREATE TABLE public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read visible FAQ" ON public.faq_items FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated can read FAQ" ON public.faq_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage FAQ" ON public.faq_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ─── TABLE : reward_templates ─────────────────────────────────────────────────
CREATE TABLE public.reward_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL DEFAULT 10,
  emoji TEXT NOT NULL DEFAULT '🎁',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read visible reward templates" ON public.reward_templates FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated can read reward templates" ON public.reward_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage reward templates" ON public.reward_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ─── TABLE : digest_logs ──────────────────────────────────────────────────────
CREATE TABLE public.digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX digest_logs_merchant_id_idx ON public.digest_logs(merchant_id);
CREATE INDEX digest_logs_sent_at_idx ON public.digest_logs(sent_at DESC);
ALTER TABLE public.digest_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can insert digest logs" ON public.digest_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Super admins can read digest logs" ON public.digest_logs FOR SELECT USING (true);

-- ─── STORAGE BUCKET ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-logos');
CREATE POLICY "Public can read logos" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'business-logos');
CREATE POLICY "Users can update their logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'business-logos');
CREATE POLICY "Users can delete their logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-logos');

-- ─── TRIGGER : auto-create profile + business au signup ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'business_name', NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'business_owner');

  INSERT INTO public.businesses (owner_id, name, subscription_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_name', 'Mon Commerce'), 'inactive');

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── DONNÉES INITIALES : site_settings ───────────────────────────────────────
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_headline', 'Vos clients reviennent.'),
  ('hero_headline_gradient', 'Encore et encore.'),
  ('hero_subtitle', 'Créez des cartes de fidélité digitales premium, envoyez des notifications intelligentes et boostez votre chiffre d''affaires. Compatible Apple Wallet & Google Wallet.'),
  ('hero_cta_primary', 'Commencer gratuitement'),
  ('hero_cta_secondary', 'Voir les tarifs'),
  ('hero_badge', 'La fidélité réinventée'),
  ('hero_stat_1', '⭐ 4.9/5'),
  ('hero_stat_2', '📲 50 000 cartes générées'),
  ('hero_stat_3', '🚀 Sans engagement'),
  ('live_merchant_count', '247'),
  ('social_proof_title', 'Ils fidélisent avec FidéliPro'),
  ('how_step_1_title', 'Inscris-toi en 2 minutes'),
  ('how_step_1_desc', 'Crée ton compte gratuitement et configure ta carte de fidélité en quelques clics.'),
  ('how_step_2_title', 'Crée ta carte de fidélité'),
  ('how_step_2_desc', 'Personnalise le design, les couleurs et les récompenses. Prête pour Apple & Google Wallet.'),
  ('how_step_3_title', 'Tes clients reviennent'),
  ('how_step_3_desc', 'Envoie des notifications ciblées, suis tes stats et regarde ton chiffre grimper.'),
  ('footer_tagline', 'La fidélité digitale pour les commerces ambitieux.'),
  ('footer_legal_url', '/legal'),
  ('footer_privacy_url', '/privacy'),
  ('footer_contact_url', 'mailto:contact@fidelispro.com'),
  ('social_instagram', 'https://instagram.com/fidelispro'),
  ('social_linkedin', 'https://linkedin.com/company/fidelispro'),
  ('onboarding_step_1', 'Personnaliser votre carte'),
  ('onboarding_step_2', 'Ajouter une récompense'),
  ('onboarding_step_3', 'Scanner votre premier client'),
  ('onboarding_step_4', 'Créer votre première campagne')
ON CONFLICT (key) DO NOTHING;

-- ─── DONNÉES INITIALES : testimonials ────────────────────────────────────────
INSERT INTO public.testimonials (business_name, category, quote, rating, sort_order) VALUES
  ('Boucherie Laurent', 'Boucherie', 'Depuis FidéliPro, mes clients reviennent 2x plus souvent. Le système est ultra simple.', 5, 1),
  ('Café de la Place', 'Café', 'Mes habitués adorent recevoir des notifications quand ils passent devant. Génial !', 5, 2),
  ('Boulangerie Moreau', 'Boulangerie', 'On est passé du tampon papier au digital en 10 minutes. Mes clients adorent.', 5, 3),
  ('Salon Élégance', 'Coiffeur', 'Le dashboard me donne une vue parfaite sur la fidélité de mes clientes.', 4, 4),
  ('Pizzeria Roma', 'Restaurant', 'Le taux de retour a augmenté de 35% en 3 mois. Impressionnant.', 5, 5)
ON CONFLICT DO NOTHING;

-- ─── DONNÉES INITIALES : faq_items ───────────────────────────────────────────
INSERT INTO public.faq_items (question, answer, sort_order) VALUES
  ('Comment ça fonctionne concrètement ?', 'Vous créez votre compte, personnalisez votre carte de fidélité, et vos clients l''ajoutent sur leur téléphone via Apple Wallet ou Google Wallet. Chaque visite est validée par un simple scan QR code.', 1),
  ('Est-ce que mes clients doivent installer une app ?', 'Non ! La carte de fidélité s''ajoute directement dans Apple Wallet ou Google Wallet. Aucune application à télécharger.', 2),
  ('Combien de temps pour être opérationnel ?', 'Moins de 5 minutes. Inscrivez-vous, choisissez un template, personnalisez vos couleurs et c''est prêt.', 3),
  ('Puis-je envoyer des notifications à mes clients ?', 'Oui, via Apple Wallet Push. Vous pouvez envoyer des notifications ciblées par segment client, proximité géographique ou comportement.', 4),
  ('Y a-t-il un engagement ?', 'Aucun engagement. Vous pouvez annuler à tout moment.', 5),
  ('Mes données sont-elles sécurisées ?', 'Absolument. Toutes les données sont chiffrées, hébergées en Europe et conformes au RGPD.', 6)
ON CONFLICT DO NOTHING;

-- ─── DONNÉES INITIALES : reward_templates ────────────────────────────────────
INSERT INTO public.reward_templates (name, description, points_required, emoji, sort_order) VALUES
  ('Café offert', 'Un café au choix offert', 10, '☕', 1),
  ('-10% sur votre prochaine commande', 'Réduction de 10% applicable sur tout le magasin', 20, '🎁', 2),
  ('Dessert offert', 'Un dessert au choix offert avec votre repas', 15, '🍽️', 3),
  ('Article offert', 'Un article au choix offert dans la boutique', 30, '🛍️', 4)
ON CONFLICT DO NOTHING;

-- ─── SUPER ADMIN : remplacer par votre email ─────────────────────────────────
-- À exécuter APRÈS avoir créé votre compte :
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'super_admin' FROM auth.users WHERE email = 'votre@email.com';
