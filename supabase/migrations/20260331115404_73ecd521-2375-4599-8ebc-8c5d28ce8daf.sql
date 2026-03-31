
-- Reward templates for empty state suggestions
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

CREATE POLICY "Public can read visible reward templates" ON public.reward_templates
  FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated can read reward templates" ON public.reward_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage reward templates" ON public.reward_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed reward templates
INSERT INTO public.reward_templates (name, description, points_required, emoji, sort_order) VALUES
  ('Café offert', 'Un café au choix offert', 10, '☕', 1),
  ('-10% sur votre prochaine commande', 'Réduction de 10% applicable sur tout le magasin', 20, '🎁', 2),
  ('Dessert offert', 'Un dessert au choix offert avec votre repas', 15, '🍽️', 3),
  ('Article offert', 'Un article au choix offert dans la boutique', 30, '🛍️', 4);

-- Seed onboarding steps in site_settings
INSERT INTO public.site_settings (key, value) VALUES
  ('onboarding_step_1', 'Personnaliser votre carte'),
  ('onboarding_step_2', 'Ajouter une récompense'),
  ('onboarding_step_3', 'Scanner votre premier client'),
  ('onboarding_step_4', 'Créer votre première campagne')
ON CONFLICT (key) DO NOTHING;
