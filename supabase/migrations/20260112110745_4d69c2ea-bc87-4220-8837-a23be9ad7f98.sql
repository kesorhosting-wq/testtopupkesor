-- Add SEAGM product linking to packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS seagm_product_id text,
ADD COLUMN IF NOT EXISTS seagm_type_id text;

-- Add SEAGM product linking to special_packages table
ALTER TABLE public.special_packages 
ADD COLUMN IF NOT EXISTS seagm_product_id text,
ADD COLUMN IF NOT EXISTS seagm_type_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_packages_seagm_product_id ON public.packages(seagm_product_id);
CREATE INDEX IF NOT EXISTS idx_special_packages_seagm_product_id ON public.special_packages(seagm_product_id);