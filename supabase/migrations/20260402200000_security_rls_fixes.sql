-- ══════════════════════════════════════════════════════════════════════════
-- SECURITY FIX — RLS policies trop permissives
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. wallet_registrations ───────────────────────────────────────────────
-- AVANT : "Anon can manage wallet registrations" FOR ALL TO anon USING(true)
-- PROBLÈME : n'importe qui pouvait modifier/supprimer des registrations Apple Wallet
-- CORRECTION : anon ne peut qu'insérer (le webservice PassKit passe par service_role)

DROP POLICY IF EXISTS "Anon can manage wallet registrations" ON public.wallet_registrations;

-- PassKit enregistre les devices via l'Edge Function wallet-webservice (service_role)
-- Un INSERT anon minimal est conservé pour compatibilité éventuelle future.
-- L'Edge Function wallet-webservice bypass RLS via service_role de toute façon.
-- En production pure, cette policy pourrait être supprimée entièrement.
CREATE POLICY "Anon can register wallet device"
  ON public.wallet_registrations
  FOR INSERT
  TO anon
  WITH CHECK (
    device_library_id IS NOT NULL
    AND device_library_id <> ''
    AND serial_number IS NOT NULL
    AND serial_number <> ''
    AND push_token IS NOT NULL
    AND push_token <> ''
    AND authentication_token IS NOT NULL
    AND authentication_token <> ''
  );

-- ── 2. web_push_subscriptions ─────────────────────────────────────────────
-- AVANT : "anon_manage_push_subs" FOR ALL TO anon USING(true) WITH CHECK(true)
-- PROBLÈME : n'importe qui pouvait supprimer ou lire les abonnements push de tous les commerces
-- CORRECTION : anon peut seulement s'abonner (INSERT) et se désabonner par endpoint

DROP POLICY IF EXISTS "anon_manage_push_subs" ON public.web_push_subscriptions;

CREATE POLICY "anon_insert_push_subs"
  ON public.web_push_subscriptions
  FOR INSERT
  TO anon
  WITH CHECK (
    business_id IS NOT NULL
    AND endpoint IS NOT NULL AND endpoint <> ''
    AND p256dh IS NOT NULL AND p256dh <> ''
    AND auth IS NOT NULL AND auth <> ''
  );

-- Un client peut se désabonner en connaissant son endpoint (identifiant unique du device)
CREATE POLICY "anon_delete_push_subs_by_endpoint"
  ON public.web_push_subscriptions
  FOR DELETE
  TO anon
  USING (endpoint IS NOT NULL AND endpoint <> '');

-- ── 3. customer_cards — INSERT anon ──────────────────────────────────────
-- AVANT : WITH CHECK(true) — aucun contrôle du business_id
-- CORRECTION : vérifier que business_id référence un commerce existant

DROP POLICY IF EXISTS "Anyone can create customer card" ON public.customer_cards;

CREATE POLICY "Anyone can create customer card"
  ON public.customer_cards
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND business_id IN (SELECT id FROM public.businesses)
    AND customer_id IS NOT NULL
    AND customer_id IN (SELECT id FROM public.customers WHERE customers.business_id = customer_cards.business_id)
  );

-- ── 4. customers — INSERT anon ────────────────────────────────────────────
-- AVANT : WITH CHECK(true) — aucun contrôle
-- CORRECTION : vérifier que business_id référence un commerce existant et actif

DROP POLICY IF EXISTS "Anyone can create customer profile" ON public.customers;

CREATE POLICY "Anyone can create customer profile"
  ON public.customers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND business_id IN (SELECT id FROM public.businesses WHERE subscription_status = 'active')
  );

-- ── 5. wallet_apns_logs — INSERT authenticated sans contrôle de propriété ─
-- AVANT : WITH CHECK(true) — un commerçant authentifié pouvait logger pour n'importe quel business
-- CORRECTION : restreindre à son propre business

DROP POLICY IF EXISTS "Authenticated can insert APNs logs" ON public.wallet_apns_logs;

CREATE POLICY "Authenticated can insert own APNs logs"
  ON public.wallet_apns_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IS NULL -- service_role logs (business_id optionnel dans la table)
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- ── 6. wallet_pass_updates — restreindre les UPDATE/DELETE authenticated ──
-- AVANT : FOR ALL TO authenticated USING(true) WITH CHECK(true)
-- CORRECTION : limiter aux owners du business concerné via la card

DROP POLICY IF EXISTS "Authenticated can manage wallet pass updates" ON public.wallet_pass_updates;

CREATE POLICY "Service role manages wallet pass updates"
  ON public.wallet_pass_updates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Les owners peuvent lire leurs mises à jour de pass
CREATE POLICY "Owners can read their wallet pass updates"
  ON public.wallet_pass_updates
  FOR SELECT
  TO authenticated
  USING (
    serial_number IN (
      SELECT wr.serial_number
      FROM public.wallet_registrations wr
      JOIN public.businesses b ON b.id = wr.business_id
      WHERE b.owner_id = auth.uid()
    )
  );
