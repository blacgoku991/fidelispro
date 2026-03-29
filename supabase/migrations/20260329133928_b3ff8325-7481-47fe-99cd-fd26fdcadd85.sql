
-- Add advanced configuration columns to businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS loyalty_type text DEFAULT 'points' CHECK (loyalty_type IN ('points', 'stamps', 'cashback')),
ADD COLUMN IF NOT EXISTS points_per_visit integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS points_per_euro integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_bg_type text DEFAULT 'gradient' CHECK (card_bg_type IN ('solid', 'gradient', 'image')),
ADD COLUMN IF NOT EXISTS card_bg_image_url text,
ADD COLUMN IF NOT EXISTS show_customer_name boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_qr_code boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_points boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_expiration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_rewards_preview boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS onboarding_mode text DEFAULT 'instant' CHECK (onboarding_mode IN ('instant', 'email', 'phone')),
ADD COLUMN IF NOT EXISTS notif_frequency text DEFAULT 'daily' CHECK (notif_frequency IN ('unlimited', 'daily', 'weekly', 'custom')),
ADD COLUMN IF NOT EXISTS notif_time_start time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS notif_time_end time DEFAULT '20:00',
ADD COLUMN IF NOT EXISTS notif_custom_interval_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS auto_reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reminder_days integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS reward_alert_threshold integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS feature_gamification boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feature_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feature_wallet boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_analytics boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS business_template text DEFAULT 'custom';

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-logos');

-- Allow public read of logos
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'business-logos');

-- Allow owners to update/delete their logos
CREATE POLICY "Users can update their logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'business-logos');

CREATE POLICY "Users can delete their logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'business-logos');
