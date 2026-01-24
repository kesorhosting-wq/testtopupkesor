-- Fix payment_gateways RLS: Remove admin-only SELECT policy since "Anyone can view" should cover all users
DROP POLICY IF EXISTS "Admins can read payment gateways" ON public.payment_gateways;

-- Make "Anyone can view payment gateways" PERMISSIVE (drop and recreate)
DROP POLICY IF EXISTS "Anyone can view payment gateways" ON public.payment_gateways;
CREATE POLICY "Anyone can view payment gateways" 
ON public.payment_gateways 
FOR SELECT 
TO public
USING (true);

-- Also fix topup_orders so anyone can create orders without auth issues
DROP POLICY IF EXISTS "Anyone can create orders" ON public.topup_orders;
CREATE POLICY "Anyone can create orders" 
ON public.topup_orders 
FOR INSERT 
TO public
WITH CHECK (true);