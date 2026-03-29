-- Advanced retention foundation: scoring, campaigns, events, location analytics

-- Business-level configuration for premium retention features
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS feature_customer_scoring boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_special_events boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_rich_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS score_vip_threshold integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS score_loyal_threshold integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS score_regular_threshold integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS score_at_risk_threshold integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS vip_min_visits integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS vip_min_total_spent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_frequency_limit text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS geofence_time_start time NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS geofence_time_end time NOT NULL DEFAULT '20:00:00',
  ADD COLUMN IF NOT EXISTS card_animation_intensity text NOT NULL DEFAULT 'medium';

-- Track richer notifications/campaign metadata
ALTER TABLE public.notifications_log
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS segment text;

-- Customer dynamic scores and segments
CREATE TABLE IF NOT EXISTS public.customer_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL UNIQUE,
  score numeric NOT NULL DEFAULT 0,
  segment text NOT NULL DEFAULT 'regular',
  visits_score integer NOT NULL DEFAULT 0,
  spend_score integer NOT NULL DEFAULT 0,
  engagement_score integer NOT NULL DEFAULT 0,
  recency_score integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  inactivity_days integer NOT NULL DEFAULT 0,
  calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_scores_business_id ON public.customer_scores(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_scores_segment ON public.customer_scores(segment);

ALTER TABLE public.customer_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can manage their customer scores" ON public.customer_scores;
CREATE POLICY "Business owners can manage their customer scores"
ON public.customer_scores
FOR ALL
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Direct notification center campaigns
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  segment text NOT NULL DEFAULT 'all',
  media_url text,
  video_url text,
  cta_label text,
  cta_url text,
  send_mode text NOT NULL DEFAULT 'now',
  send_at timestamp with time zone,
  frequency_limit text,
  status text NOT NULL DEFAULT 'draft',
  recipients_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_campaigns_business_id ON public.notification_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status ON public.notification_campaigns(status);

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can manage notification campaigns" ON public.notification_campaigns;
CREATE POLICY "Business owners can manage notification campaigns"
ON public.notification_campaigns
FOR ALL
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Special events / limited campaigns
CREATE TABLE IF NOT EXISTS public.special_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  start_hour time,
  end_hour time,
  reward_multiplier numeric NOT NULL DEFAULT 1,
  eligible_segment text NOT NULL DEFAULT 'all',
  notification_message text,
  media_url text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_special_events_business_id ON public.special_events(business_id);
CREATE INDEX IF NOT EXISTS idx_special_events_time_window ON public.special_events(starts_at, ends_at);

ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can manage special events" ON public.special_events;
CREATE POLICY "Business owners can manage special events"
ON public.special_events
FOR ALL
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Privacy-safe customer location snapshots (permission-based)
CREATE TABLE IF NOT EXISTS public.customer_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  latitude numeric,
  longitude numeric,
  city text,
  distance_meters integer,
  is_nearby boolean NOT NULL DEFAULT false,
  consent_granted boolean NOT NULL DEFAULT false,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_locations_business_id ON public.customer_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_locations_captured_at ON public.customer_locations(captured_at);

ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can manage customer locations" ON public.customer_locations;
CREATE POLICY "Business owners can manage customer locations"
ON public.customer_locations
FOR ALL
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Updated-at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_scores_updated_at ON public.customer_scores;
CREATE TRIGGER trg_customer_scores_updated_at
BEFORE UPDATE ON public.customer_scores
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_notification_campaigns_updated_at ON public.notification_campaigns;
CREATE TRIGGER trg_notification_campaigns_updated_at
BEFORE UPDATE ON public.notification_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_special_events_updated_at ON public.special_events;
CREATE TRIGGER trg_special_events_updated_at
BEFORE UPDATE ON public.special_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Score engine (evolvable)
CREATE OR REPLACE FUNCTION public.recompute_customer_scores(p_business_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  INSERT INTO public.customer_scores (
    business_id,
    customer_id,
    score,
    segment,
    visits_score,
    spend_score,
    engagement_score,
    recency_score,
    total_spent,
    inactivity_days,
    calculated_at
  )
  SELECT
    c.business_id,
    c.id,
    LEAST(
      100,
      GREATEST(
        0,
        COALESCE(c.total_visits, 0) * 3
        + COALESCE(ph.spend_score, 0)
        + COALESCE(cc.rewards_score, 0)
        + GREATEST(0, 30 - COALESCE(DATE_PART('day', now() - c.last_visit_at), 60))
      )
    ) AS score,
    CASE
      WHEN LEAST(
        100,
        GREATEST(
          0,
          COALESCE(c.total_visits, 0) * 3
          + COALESCE(ph.spend_score, 0)
          + COALESCE(cc.rewards_score, 0)
          + GREATEST(0, 30 - COALESCE(DATE_PART('day', now() - c.last_visit_at), 60))
        )
      ) >= b.score_vip_threshold
      THEN 'vip'
      WHEN LEAST(
        100,
        GREATEST(
          0,
          COALESCE(c.total_visits, 0) * 3
          + COALESCE(ph.spend_score, 0)
          + COALESCE(cc.rewards_score, 0)
          + GREATEST(0, 30 - COALESCE(DATE_PART('day', now() - c.last_visit_at), 60))
        )
      ) >= b.score_loyal_threshold
      THEN 'loyal'
      WHEN LEAST(
        100,
        GREATEST(
          0,
          COALESCE(c.total_visits, 0) * 3
          + COALESCE(ph.spend_score, 0)
          + COALESCE(cc.rewards_score, 0)
          + GREATEST(0, 30 - COALESCE(DATE_PART('day', now() - c.last_visit_at), 60))
        )
      ) >= b.score_regular_threshold
      THEN 'regular'
      WHEN LEAST(
        100,
        GREATEST(
          0,
          COALESCE(c.total_visits, 0) * 3
          + COALESCE(ph.spend_score, 0)
          + COALESCE(cc.rewards_score, 0)
          + GREATEST(0, 30 - COALESCE(DATE_PART('day', now() - c.last_visit_at), 60))
        )
      ) >= b.score_at_risk_threshold
      THEN 'at_risk'
      ELSE 'inactive'
    END AS segment,
    COALESCE(c.total_visits, 0) * 3 AS visits_score,
    COALESCE(ph.spend_score, 0) AS spend_score,
    COALESCE(cc.rewards_score, 0) AS engagement_score,
    GREATEST(0, 30 - COALESCE(DATE_PART('day', now() - c.last_visit_at), 60))::integer AS recency_score,
    COALESCE(ph.total_spent, 0) AS total_spent,
    COALESCE(DATE_PART('day', now() - c.last_visit_at), 9999)::integer AS inactivity_days,
    now()
  FROM public.customers c
  JOIN public.businesses b ON b.id = c.business_id
  LEFT JOIN (
    SELECT
      customer_id,
      COALESCE(SUM(GREATEST(points_added, 0)), 0)::numeric AS total_spent,
      LEAST(25, COALESCE(SUM(GREATEST(points_added, 0)), 0) / 5)::integer AS spend_score
    FROM public.points_history
    GROUP BY customer_id
  ) ph ON ph.customer_id = c.id
  LEFT JOIN (
    SELECT
      customer_id,
      LEAST(20, COALESCE(SUM(rewards_earned), 0) * 5)::integer AS rewards_score
    FROM public.customer_cards
    GROUP BY customer_id
  ) cc ON cc.customer_id = c.id
  WHERE p_business_id IS NULL OR c.business_id = p_business_id
  ON CONFLICT (customer_id)
  DO UPDATE SET
    score = EXCLUDED.score,
    segment = EXCLUDED.segment,
    visits_score = EXCLUDED.visits_score,
    spend_score = EXCLUDED.spend_score,
    engagement_score = EXCLUDED.engagement_score,
    recency_score = EXCLUDED.recency_score,
    total_spent = EXCLUDED.total_spent,
    inactivity_days = EXCLUDED.inactivity_days,
    calculated_at = now(),
    updated_at = now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;