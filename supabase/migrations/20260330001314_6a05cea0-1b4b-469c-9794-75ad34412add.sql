-- Tighten web_push_subscriptions policies to avoid overly permissive non-SELECT rules
DROP POLICY IF EXISTS service_role_all ON public.web_push_subscriptions;
DROP POLICY IF EXISTS public_update_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS public_delete_push_subs ON public.web_push_subscriptions;
DROP POLICY IF EXISTS public_insert_push_subs ON public.web_push_subscriptions;

CREATE POLICY service_role_all
ON public.web_push_subscriptions
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY public_insert_push_subs
ON public.web_push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  business_id IS NOT NULL
  AND endpoint IS NOT NULL
  AND endpoint <> ''
  AND p256dh IS NOT NULL
  AND p256dh <> ''
  AND auth IS NOT NULL
  AND auth <> ''
);

CREATE POLICY public_update_push_subs
ON public.web_push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (
  business_id IS NOT NULL
  AND endpoint IS NOT NULL
  AND endpoint <> ''
)
WITH CHECK (
  business_id IS NOT NULL
  AND endpoint IS NOT NULL
  AND endpoint <> ''
  AND p256dh IS NOT NULL
  AND p256dh <> ''
  AND auth IS NOT NULL
  AND auth <> ''
);

CREATE POLICY public_delete_push_subs
ON public.web_push_subscriptions
FOR DELETE
TO anon, authenticated
USING (
  business_id IS NOT NULL
  AND endpoint IS NOT NULL
  AND endpoint <> ''
);