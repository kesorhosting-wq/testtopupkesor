-- Fix 1: Payment QR Settings - Remove public access, require authentication
DROP POLICY IF EXISTS "Anyone can view payment QR settings" ON public.payment_qr_settings;

-- Allow authenticated users to view payment QR settings (needed for checkout)
CREATE POLICY "Authenticated users can view payment QR settings" 
ON public.payment_qr_settings 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 2: Topup Orders - Require authentication for order creation to prevent spam
DROP POLICY IF EXISTS "Anyone can create orders" ON public.topup_orders;

-- Require authentication for order creation
CREATE POLICY "Authenticated users can create orders" 
ON public.topup_orders 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Update the user_id to be set from the authenticated user
-- Note: This requires frontend to stop sending null user_id