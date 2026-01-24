
-- Enable the pg_net extension for making HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the trigger function that calls process-topup edge function
CREATE OR REPLACE FUNCTION public.trigger_process_topup_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger when status changes TO 'paid' (from something else)
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Get the Supabase URL from environment
    edge_function_url := 'https://ceijlcvxetaqkebojdjy.supabase.co/functions/v1/process-topup';
    
    -- Make async HTTP request to the edge function
    PERFORM extensions.http_post(
      url := edge_function_url,
      body := json_build_object(
        'action', 'fulfill',
        'orderId', NEW.id::text
      )::text,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      )::jsonb
    );
    
    RAISE LOG 'Triggered process-topup for order %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on topup_orders table
DROP TRIGGER IF EXISTS on_order_status_paid ON public.topup_orders;
CREATE TRIGGER on_order_status_paid
  AFTER UPDATE OF status ON public.topup_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_topup_on_paid();
