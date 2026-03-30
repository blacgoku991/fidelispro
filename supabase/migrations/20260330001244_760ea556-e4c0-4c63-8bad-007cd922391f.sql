-- Fix RLS for frontend upserts on web push subscriptions
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Reset policies to avoid conflicts
DROP POLICY IF EXISTS anon_manage_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS owners_read_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS public_insert_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS public_select_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS public_update_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS public_delete_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS service_role_all ON public.web_push_subscriptions;

-- Service role full access
CREATE POLICY service_role_all
ON public.web_push_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Frontend flows (works for both anon and authenticated sessions)
CREATE POLICY public_insert_push_subs
ON public.web_push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  business_id IS NOT NULL
  AND endpoint IS NOT NULL
  AND p256dh IS NOT NULL
  AND auth IS NOT NULL
);

CREATE POLICY public_select_push_subs
ON public.web_push_subscriptions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY public_update_push_subs
ON public.web_push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  business_id IS NOT NULL
  AND endpoint IS NOT NULL
  AND p256dh IS NOT NULL
  AND auth IS NOT NULL
);

CREATE POLICY public_delete_push_subs
ON public.web_push_subscriptions
FOR DELETE
TO anon, authenticated
USING (true);