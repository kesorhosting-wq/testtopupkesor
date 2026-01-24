-- Add missing DELETE policy for payment_gateways table
CREATE POLICY "Admins can delete payment gateways" 
ON public.payment_gateways 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));