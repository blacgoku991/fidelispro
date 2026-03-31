-- Table to log weekly digest email sends
CREATE TABLE IF NOT EXISTS digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS digest_logs_merchant_id_idx ON digest_logs(merchant_id);
CREATE INDEX IF NOT EXISTS digest_logs_sent_at_idx ON digest_logs(sent_at DESC);

-- Enable RLS
ALTER TABLE digest_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) can insert; super admins can read all
CREATE POLICY "Service can insert digest logs" ON digest_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Super admins can read digest logs" ON digest_logs
  FOR SELECT USING (true);
