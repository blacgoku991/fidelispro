
-- Allow public read of business info for public pages
CREATE POLICY "Public can view business basic info"
ON public.businesses
FOR SELECT
TO anon
USING (true);

-- Allow anonymous inserts to customers (for frictionless QR onboarding)
CREATE POLICY "Anyone can create customer profile"
ON public.customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous inserts to customer_cards
CREATE POLICY "Anyone can create customer card"
ON public.customer_cards
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public to read cards
CREATE POLICY "Anyone can view card by code"
ON public.customer_cards
FOR SELECT
TO anon
USING (true);

-- Allow public read of customer records
CREATE POLICY "Anyone can view customer"
ON public.customers
FOR SELECT
TO anon
USING (true);
