-- Rename the table from seagm_products to g2bulk_products
ALTER TABLE public.seagm_products RENAME TO g2bulk_products;

-- Rename columns
ALTER TABLE public.g2bulk_products RENAME COLUMN seagm_product_id TO g2bulk_product_id;
ALTER TABLE public.g2bulk_products RENAME COLUMN seagm_type_id TO g2bulk_type_id;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Admins can delete SEAGM products" ON public.g2bulk_products;
DROP POLICY IF EXISTS "Admins can insert SEAGM products" ON public.g2bulk_products;
DROP POLICY IF EXISTS "Admins can update SEAGM products" ON public.g2bulk_products;
DROP POLICY IF EXISTS "Anyone can view SEAGM products" ON public.g2bulk_products;

-- Create new RLS policies with G2Bulk naming
CREATE POLICY "Admins can delete G2Bulk products" 
ON public.g2bulk_products 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert G2Bulk products" 
ON public.g2bulk_products 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update G2Bulk products" 
ON public.g2bulk_products 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view G2Bulk products" 
ON public.g2bulk_products 
FOR SELECT 
USING (true);

-- Also update the packages and special_packages columns
ALTER TABLE public.packages RENAME COLUMN seagm_product_id TO g2bulk_product_id;
ALTER TABLE public.packages RENAME COLUMN seagm_type_id TO g2bulk_type_id;

ALTER TABLE public.special_packages RENAME COLUMN seagm_product_id TO g2bulk_product_id;
ALTER TABLE public.special_packages RENAME COLUMN seagm_type_id TO g2bulk_type_id;

-- Update games table column
ALTER TABLE public.games RENAME COLUMN seagm_category_id TO g2bulk_category_id;