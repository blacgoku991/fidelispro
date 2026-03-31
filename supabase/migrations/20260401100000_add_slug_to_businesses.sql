-- Add slug column to businesses for public vitrine page
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs for existing businesses from their name
UPDATE businesses
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '[àâäáãå]', 'a', 'g'),
      '[éèêë]', 'e', 'g'
    ),
    '[^a-z0-9]+', '-', 'g'
  )
)
WHERE slug IS NULL AND name IS NOT NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS businesses_slug_idx ON businesses(slug);
