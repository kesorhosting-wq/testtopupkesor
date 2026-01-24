-- Create function to auto-sync new games to game_verification_configs
CREATE OR REPLACE FUNCTION public.sync_game_to_verification_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_name TEXT;
  api_code TEXT;
  needs_zone BOOLEAN;
BEGIN
  -- Check if a verification config already exists for this game name
  IF EXISTS (
    SELECT 1 FROM public.game_verification_configs 
    WHERE LOWER(game_name) = LOWER(NEW.name)
  ) THEN
    RETURN NEW;
  END IF;

  -- Normalize game name to create API code
  normalized_name := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]', '-', 'g'));
  normalized_name := REGEXP_REPLACE(normalized_name, '-+', '-', 'g');
  normalized_name := TRIM(BOTH '-' FROM normalized_name);
  
  -- Determine if zone is typically required (common patterns)
  needs_zone := (
    LOWER(NEW.name) LIKE '%mobile legends%' OR 
    LOWER(NEW.name) LIKE '%mlbb%' OR
    LOWER(NEW.name) LIKE '%magic chess%'
  );
  
  -- Map common game names to known API codes
  api_code := CASE
    WHEN LOWER(NEW.name) LIKE '%mobile legends%' OR LOWER(NEW.name) LIKE '%mlbb%' THEN 'mobile-legends'
    WHEN LOWER(NEW.name) LIKE '%magic chess%' THEN 'mobile-legends'
    WHEN LOWER(NEW.name) LIKE '%free fire%' THEN 'free-fire'
    WHEN LOWER(NEW.name) LIKE '%pubg%' THEN 'pubg-mobile'
    WHEN LOWER(NEW.name) LIKE '%genshin%' THEN 'genshin-impact'
    WHEN LOWER(NEW.name) LIKE '%honkai%' THEN 'honkai-star-rail'
    WHEN LOWER(NEW.name) LIKE '%valorant%' THEN 'valorant'
    WHEN LOWER(NEW.name) LIKE '%call of duty%' OR LOWER(NEW.name) LIKE '%cod%' THEN 'call-of-duty-mobile'
    WHEN LOWER(NEW.name) LIKE '%clash of clans%' OR LOWER(NEW.name) LIKE '%coc%' THEN 'clash-of-clans'
    WHEN LOWER(NEW.name) LIKE '%clash royale%' THEN 'clash-royale'
    WHEN LOWER(NEW.name) LIKE '%arena of valor%' OR LOWER(NEW.name) LIKE '%aov%' THEN 'arena-of-valor'
    WHEN LOWER(NEW.name) LIKE '%league of legends%' OR LOWER(NEW.name) LIKE '%lol%' THEN 'league-of-legends'
    ELSE normalized_name
  END;
  
  -- Insert new verification config with sensible defaults
  INSERT INTO public.game_verification_configs (
    game_name,
    api_code,
    api_provider,
    requires_zone,
    is_active
  ) VALUES (
    NEW.name,
    api_code,
    'rapidapi',
    needs_zone,
    true
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-sync games
DROP TRIGGER IF EXISTS trigger_sync_game_verification ON public.games;
CREATE TRIGGER trigger_sync_game_verification
AFTER INSERT ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.sync_game_to_verification_config();