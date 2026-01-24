-- Drop and recreate trigger function to ONLY trigger on 'paid' status
-- This prevents double-triggering when status goes pending -> paid -> processing

CREATE OR REPLACE FUNCTION public.trigger_process_topup_on_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- ONLY trigger when status changes TO 'paid' (not on 'processing')
  -- This prevents double-execution of G2Bulk orders
  IF (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'processing', 'completed', 'failed'))) THEN
    -- Make async HTTP request to the edge function using pg_net
    PERFORM net.http_post(
      url := 'https://buenyfjcxqfjbcjaebnt.supabase.co/functions/v1/process-topup',
      body := jsonb_build_object(
        'action', 'fulfill',
        'orderId', NEW.id::text
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1ZW55ZmpjeHFmamJjamFlYm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjI1NTAsImV4cCI6MjA4NDc5ODU1MH0.gQooV1kfTcjBnMc4MM5R-0K8exadmcgbOIXBBhfzhuI'
      )
    );
    
    RAISE LOG 'Triggered process-topup for order % (status: paid)', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;