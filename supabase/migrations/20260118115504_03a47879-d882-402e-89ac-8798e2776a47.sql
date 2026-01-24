-- Drop existing trigger
DROP TRIGGER IF EXISTS on_order_status_paid ON public.topup_orders;

-- Update the trigger function to handle both 'paid' and 'processing' status changes
CREATE OR REPLACE FUNCTION public.trigger_process_topup_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trigger when status changes TO 'paid' or 'processing' (from something else)
  IF (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid')) OR
     (NEW.status = 'processing' AND (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'processing', 'completed', 'failed'))) THEN
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
    
    RAISE LOG 'Triggered process-topup for order % (status: %)', NEW.id, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_order_status_paid
  AFTER UPDATE OF status ON public.topup_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_topup_on_paid();