-- Add label styling columns to packages table
ALTER TABLE public.packages ADD COLUMN label_bg_color text DEFAULT '#dc2626';
ALTER TABLE public.packages ADD COLUMN label_text_color text DEFAULT '#ffffff';
ALTER TABLE public.packages ADD COLUMN label_icon text DEFAULT NULL;

-- Add label styling columns to special_packages table
ALTER TABLE public.special_packages ADD COLUMN label_bg_color text DEFAULT '#dc2626';
ALTER TABLE public.special_packages ADD COLUMN label_text_color text DEFAULT '#ffffff';
ALTER TABLE public.special_packages ADD COLUMN label_icon text DEFAULT NULL;