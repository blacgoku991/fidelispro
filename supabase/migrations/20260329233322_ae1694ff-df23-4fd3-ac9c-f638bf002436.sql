
-- Drop old table and recreate clean
DROP TABLE IF EXISTS web_push_subscriptions;

CREATE TABLE web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  card_id UUID REFERENCES customer_cards(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert/update (public card page)
CREATE POLICY "anon_manage_push_subs" ON web_push_subscriptions
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow authenticated business owners to read
CREATE POLICY "owners_read_push_subs" ON web_push_subscriptions
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Allow service role full access (implicit, but explicit for clarity)
CREATE POLICY "service_role_all" ON web_push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
