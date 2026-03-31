-- Add onboarding_completed flag to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
