-- Add product_type column to distinguish between card/PIN and direct recharge products
ALTER TABLE public.seagm_products 
ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'recharge';

-- Add index for faster lookups by product type
CREATE INDEX IF NOT EXISTS idx_seagm_products_type ON public.seagm_products(product_type);

-- Add column to store card codes for completed card orders
ALTER TABLE public.topup_orders
ADD COLUMN IF NOT EXISTS card_codes jsonb DEFAULT NULL;