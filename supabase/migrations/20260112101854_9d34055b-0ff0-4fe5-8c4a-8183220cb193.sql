-- Create payment_gateways table for IKhode configuration
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Only admins can read gateway configs
CREATE POLICY "Admins can read payment gateways"
ON public.payment_gateways
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update gateway configs
CREATE POLICY "Admins can update payment gateways"
ON public.payment_gateways
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert gateway configs
CREATE POLICY "Admins can insert payment gateways"
ON public.payment_gateways
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_payment_gateways_updated_at
BEFORE UPDATE ON public.payment_gateways
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default IKhode gateway config
INSERT INTO public.payment_gateways (slug, name, enabled, config)
VALUES (
  'ikhode-bakong',
  'IKhode Bakong KHQR',
  false,
  '{
    "node_api_url": "",
    "websocket_url": "",
    "webhook_secret": "",
    "custom_webhook_url": ""
  }'::jsonb
);