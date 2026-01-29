-- Enable realtime for topup_orders table for instant payment detection
ALTER PUBLICATION supabase_realtime ADD TABLE public.topup_orders;