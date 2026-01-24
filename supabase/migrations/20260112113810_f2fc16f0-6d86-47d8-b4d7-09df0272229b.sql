-- Add seagm_category_id column to games table for linking to SEAGM categories
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS seagm_category_id text DEFAULT NULL;