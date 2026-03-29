-- Table to store Apple Wallet device registrations (PassKit web service)
CREATE TABLE public.wallet_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_library_id text NOT NULL,
  pass_type_id text NOT NULL DEFAULT 'pass.app.lovable.fidelispro',
  serial_number text NOT NULL,
  push_token text NOT NULL,
  authentication_token text NOT NULL,
  customer_id uuid,
  business_id uuid,
  card_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(device_library_id, pass_type_id, serial_number)
);

ALTER TABLE public.wallet_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view wallet registrations"
  ON public.wallet_registrations FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Super admins can view all wallet registrations"
  ON public.wallet_registrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anon can manage wallet registrations"
  ON public.wallet_registrations FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Table to track pass updates for serial numbers
CREATE TABLE public.wallet_pass_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text NOT NULL,
  pass_type_id text NOT NULL DEFAULT 'pass.app.lovable.fidelispro',
  last_updated timestamptz NOT NULL DEFAULT now(),
  change_message text,
  campaign_id uuid,
  UNIQUE(serial_number, pass_type_id)
);

ALTER TABLE public.wallet_pass_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read wallet pass updates"
  ON public.wallet_pass_updates FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can manage wallet pass updates"
  ON public.wallet_pass_updates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Table to log APNs push attempts
CREATE TABLE public.wallet_apns_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  serial_number text NOT NULL,
  push_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  apns_response text,
  error_message text,
  campaign_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_apns_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their APNs logs"
  ON public.wallet_apns_logs FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Authenticated can insert APNs logs"
  ON public.wallet_apns_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Add wallet tracking columns to customer_cards
ALTER TABLE public.customer_cards ADD COLUMN IF NOT EXISTS wallet_auth_token text;
ALTER TABLE public.customer_cards ADD COLUMN IF NOT EXISTS wallet_installed_at timestamptz;
ALTER TABLE public.customer_cards ADD COLUMN IF NOT EXISTS wallet_last_fetched_at timestamptz;
ALTER TABLE public.customer_cards ADD COLUMN IF NOT EXISTS wallet_change_message text;