
-- Table for editable site settings (key-value store)
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (public landing page)
CREATE POLICY "Public can read site settings" ON public.site_settings
  FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read site settings" ON public.site_settings
  FOR SELECT TO authenticated USING (true);

-- Only super admins can modify
CREATE POLICY "Super admins can manage site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Table for testimonials
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

CREATE POLICY "Public can read visible testimonials" ON public.testimonials
  FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated can read testimonials" ON public.testimonials
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Table for FAQ items
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

CREATE POLICY "Public can read visible FAQ" ON public.faq_items
  FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated can read FAQ" ON public.faq_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage FAQ" ON public.faq_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed site_settings
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_headline', 'Vos clients reviennent.'),
  ('hero_headline_gradient', 'Encore et encore.'),
  ('hero_subtitle', 'Créez des cartes de fidélité digitales premium, envoyez des notifications intelligentes et boostez votre chiffre d''affaires. Compatible Apple Wallet & Google Wallet.'),
  ('hero_cta_primary', 'Commencer gratuitement'),
  ('hero_cta_secondary', 'Voir les tarifs'),
  ('hero_badge', 'La fidélité réinventée'),
  ('hero_stat_1', '🏪 +200 commerçants'),
  ('hero_stat_2', '⭐ 4.9/5'),
  ('hero_stat_3', '📲 50 000 cartes générées'),
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
  ('social_linkedin', 'https://linkedin.com/company/fidelispro');

-- Seed testimonials
INSERT INTO public.testimonials (business_name, category, quote, rating, sort_order) VALUES
  ('Boucherie Laurent', 'Boucherie', 'Depuis FidéliPro, mes clients reviennent 2x plus souvent. Le système est ultra simple.', 5, 1),
  ('Café de la Place', 'Café', 'Mes habitués adorent recevoir des notifications quand ils passent devant. Génial !', 5, 2),
  ('Boulangerie Moreau', 'Boulangerie', 'On est passé du tampon papier au digital en 10 minutes. Mes clients adorent.', 5, 3),
  ('Salon Élégance', 'Coiffeur', 'Le dashboard me donne une vue parfaite sur la fidélité de mes clientes.', 4, 4),
  ('Pizzeria Roma', 'Restaurant', 'Le taux de retour a augmenté de 35% en 3 mois. Impressionnant.', 5, 5);

-- Seed FAQ items
INSERT INTO public.faq_items (question, answer, sort_order) VALUES
  ('Comment ça fonctionne concrètement ?', 'Vous créez votre compte, personnalisez votre carte de fidélité, et vos clients l''ajoutent sur leur téléphone via Apple Wallet ou Google Wallet. Chaque visite est validée par un simple scan QR code.', 1),
  ('Est-ce que mes clients doivent installer une app ?', 'Non ! La carte de fidélité s''ajoute directement dans Apple Wallet ou Google Wallet. Aucune application à télécharger.', 2),
  ('Combien de temps pour être opérationnel ?', 'Moins de 5 minutes. Inscrivez-vous, choisissez un template, personnalisez vos couleurs et c''est prêt.', 3),
  ('Puis-je envoyer des notifications à mes clients ?', 'Oui, via Apple Wallet Push. Vous pouvez envoyer des notifications ciblées par segment client, proximité géographique ou comportement.', 4),
  ('Y a-t-il un engagement ?', 'Aucun engagement. Vous pouvez annuler à tout moment. Vous bénéficiez d''un essai gratuit de 14 jours.', 5),
  ('Mes données sont-elles sécurisées ?', 'Absolument. Toutes les données sont chiffrées, hébergées en Europe et conformes au RGPD.', 6);
