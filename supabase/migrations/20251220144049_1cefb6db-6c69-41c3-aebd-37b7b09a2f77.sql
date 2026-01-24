-- Add label column to packages table
ALTER TABLE public.packages ADD COLUMN label text DEFAULT NULL;

-- Add label column to special_packages table as well
ALTER TABLE public.special_packages ADD COLUMN label text DEFAULT NULL;