-- Create table for storing SEAGM products/categories cache
CREATE TABLE public.seagm_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seagm_type_id TEXT NOT NULL,
  seagm_product_id TEXT NOT NULL UNIQUE,
  game_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  denomination TEXT,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  fields JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing orders
CREATE TABLE public.topup_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  game_name TEXT NOT NULL,
  package_name TEXT NOT NULL,
  player_id TEXT NOT NULL,
  server_id TEXT,
  player_name TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,
  seagm_order_id TEXT,
  seagm_product_id TEXT,
  status TEXT DEFAULT 'pending',
  status_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for seagm_products
ALTER TABLE public.seagm_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view products
CREATE POLICY "Anyone can view SEAGM products"
ON public.seagm_products
FOR SELECT
USING (true);

-- Only admins can manage products
CREATE POLICY "Admins can insert SEAGM products"
ON public.seagm_products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update SEAGM products"
ON public.seagm_products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete SEAGM products"
ON public.seagm_products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable RLS for topup_orders
ALTER TABLE public.topup_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.topup_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.topup_orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can create orders (for guest checkout)
CREATE POLICY "Anyone can create orders"
ON public.topup_orders
FOR INSERT
WITH CHECK (true);

-- Only system can update orders (via service role)
CREATE POLICY "Admins can update orders"
ON public.topup_orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_seagm_products_game ON public.seagm_products(game_name);
CREATE INDEX idx_seagm_products_active ON public.seagm_products(is_active);
CREATE INDEX idx_topup_orders_user ON public.topup_orders(user_id);
CREATE INDEX idx_topup_orders_status ON public.topup_orders(status);

-- Triggers for updated_at
CREATE TRIGGER update_seagm_products_updated_at
BEFORE UPDATE ON public.seagm_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topup_orders_updated_at
BEFORE UPDATE ON public.topup_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();