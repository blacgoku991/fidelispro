-- Automation & engagement settings for businesses

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS birthday_notif_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthday_notif_message text DEFAULT 'Joyeux anniversaire ! Un cadeau vous attend 🎂',
  ADD COLUMN IF NOT EXISTS welcome_push_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS welcome_push_message text DEFAULT 'Bienvenue ! Votre carte de fidélité est prête 🎉',
  ADD COLUMN IF NOT EXISTS vip_auto_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_auto_threshold integer DEFAULT 50;
