-- Plan pricing settings gérés depuis le panel admin
-- Valeurs initiales : Starter 29€, Pro 59€
INSERT INTO site_settings (key, value) VALUES
  ('plan_starter_price',    '29'),
  ('plan_starter_name',     'Starter'),
  ('plan_starter_features', '["Scanner QR","Gestion clients","Cartes de fidélité","Récompenses","Jusqu''à 200 clients"]'),
  ('plan_pro_price',        '59'),
  ('plan_pro_name',         'Pro'),
  ('plan_pro_features',     '["Tout Starter +","Analytics avancés","Notifications push","Apple Wallet","Scoring client","Campagnes marketing","Clients illimités"]'),
  ('stripe_price_starter',   ''),
  ('stripe_price_pro',       ''),
  ('stripe_product_starter', ''),
  ('stripe_product_pro',     '')
ON CONFLICT (key) DO NOTHING;
