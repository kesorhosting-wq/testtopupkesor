-- Fix 1: Create a public view for payment_gateways without sensitive config data
-- This view exposes only non-sensitive fields

CREATE OR REPLACE VIEW public.payment_gateways_public AS
SELECT 
  id, 
  slug, 
  name, 
  enabled, 
  created_at,
  updated_at,
  -- Only include non-sensitive config fields
  jsonb_build_object(
    'websocket_url', config->'websocket_url'
  ) as config
FROM public.payment_gateways;

-- Grant access to the view for all users
GRANT SELECT ON public.payment_gateways_public TO anon, authenticated;

-- Update policy on payment_gateways - remove public access to full table
DROP POLICY IF EXISTS "Anyone can view payment gateways" ON public.payment_gateways;

-- Only admins can view the full payment_gateways table (with secrets)
CREATE POLICY "Admins can view all payment gateways" 
ON public.payment_gateways 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add constraints to topup_orders for better input validation
-- Positive amount constraint
ALTER TABLE public.topup_orders DROP CONSTRAINT IF EXISTS topup_orders_amount_positive;
ALTER TABLE public.topup_orders ADD CONSTRAINT topup_orders_amount_positive CHECK (amount > 0);

-- Player ID length constraint
ALTER TABLE public.topup_orders DROP CONSTRAINT IF EXISTS topup_orders_player_id_length;
ALTER TABLE public.topup_orders ADD CONSTRAINT topup_orders_player_id_length CHECK (length(player_id) <= 100);

-- Game name length constraint
ALTER TABLE public.topup_orders DROP CONSTRAINT IF EXISTS topup_orders_game_name_length;
ALTER TABLE public.topup_orders ADD CONSTRAINT topup_orders_game_name_length CHECK (length(game_name) <= 200);

-- Package name length constraint
ALTER TABLE public.topup_orders DROP CONSTRAINT IF EXISTS topup_orders_package_name_length;
ALTER TABLE public.topup_orders ADD CONSTRAINT topup_orders_package_name_length CHECK (length(package_name) <= 200);