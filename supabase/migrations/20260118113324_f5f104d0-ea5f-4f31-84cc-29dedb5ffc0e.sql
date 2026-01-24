
-- Fix the trigger function to use correct pg_net syntax
CREATE OR REPLACE FUNCTION public.trigger_process_topup_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes TO 'paid' (from something else)
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Make async HTTP request to the edge function using pg_net
    PERFORM net.http_post(
      url := 'https://ceijlcvxetaqkebojdjy.supabase.co/functions/v1/process-topup',
      body := jsonb_build_object(
        'action', 'fulfill',
        'orderId', NEW.id::text
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaWpsY3Z4ZXRhcWtlYm9qZGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODczMjEsImV4cCI6MjA4NDI2MzMyMX0.IMZnCtHWMS0ZFqwM5G7hQFBUv2umg85EacRvKYmlzNw'
      )
    );
    
    RAISE LOG 'Triggered process-topup for order %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;
