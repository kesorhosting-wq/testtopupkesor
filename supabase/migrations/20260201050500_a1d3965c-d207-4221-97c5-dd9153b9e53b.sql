-- Add slug column to games table
ALTER TABLE public.games 
ADD COLUMN slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX games_slug_unique ON public.games(slug) WHERE slug IS NOT NULL;

-- Generate initial slugs from existing game names
UPDATE public.games 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;