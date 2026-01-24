-- Allow anyone to read payment_gateways (needed to check if IKhode is enabled on checkout)
CREATE POLICY "Anyone can view payment gateways"
ON public.payment_gateways
FOR SELECT
USING (true);