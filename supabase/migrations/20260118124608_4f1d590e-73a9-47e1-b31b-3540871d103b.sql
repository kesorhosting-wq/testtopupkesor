-- Fix 1: Recreate payment_gateways_public view with security_invoker=on
-- This prevents the SECURITY DEFINER vulnerability
DROP VIEW IF EXISTS public.payment_gateways_public;

CREATE VIEW public.payment_gateways_public
WITH (security_invoker=on) AS
SELECT 
  id, 
  slug, 
  name, 
  enabled, 
  created_at,
  updated_at,
  -- Only include non-sensitive config fields (exclude webhook_secret, api keys, etc.)
  jsonb_build_object(
    'websocket_url', config->'websocket_url'
  ) as config
FROM public.payment_gateways;

-- Grant access to the view for all users
GRANT SELECT ON public.payment_gateways_public TO anon, authenticated;