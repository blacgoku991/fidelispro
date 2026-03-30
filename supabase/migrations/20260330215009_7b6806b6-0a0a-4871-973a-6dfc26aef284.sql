
-- Tighten customer insert: require business_id to be non-null
DROP POLICY IF EXISTS "Anyone can create customer profile" ON customers;
CREATE POLICY "Anon can create customer profile" ON customers
  FOR INSERT TO anon
  WITH CHECK (business_id IS NOT NULL AND full_name IS NOT NULL);

-- Tighten customer_cards insert: require business_id and customer_id
DROP POLICY IF EXISTS "Anyone can create customer card" ON customer_cards;
CREATE POLICY "Anon can create customer card" ON customer_cards
  FOR INSERT TO anon
  WITH CHECK (business_id IS NOT NULL AND customer_id IS NOT NULL);

-- Tighten wallet_apns_logs insert
DROP POLICY IF EXISTS "Authenticated can insert APNs logs" ON wallet_apns_logs;
CREATE POLICY "Authenticated can insert APNs logs" ON wallet_apns_logs
  FOR INSERT TO authenticated
  WITH CHECK (business_id IS NOT NULL AND serial_number IS NOT NULL AND push_token IS NOT NULL);

-- Tighten wallet_registrations: keep anon for Apple callbacks but validate fields
DROP POLICY IF EXISTS "Anon can manage wallet registrations" ON wallet_registrations;
CREATE POLICY "Anon can manage wallet registrations" ON wallet_registrations
  FOR ALL TO anon
  USING (serial_number IS NOT NULL AND device_library_id IS NOT NULL)
  WITH CHECK (serial_number IS NOT NULL AND device_library_id IS NOT NULL AND push_token IS NOT NULL AND authentication_token IS NOT NULL);

-- Tighten wallet_pass_updates
DROP POLICY IF EXISTS "Authenticated can manage wallet pass updates" ON wallet_pass_updates;
CREATE POLICY "Authenticated can manage wallet pass updates" ON wallet_pass_updates
  FOR ALL TO authenticated
  USING (serial_number IS NOT NULL)
  WITH CHECK (serial_number IS NOT NULL);
