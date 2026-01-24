-- Update the sync_game_to_verification_config function to use g2bulk instead of rapidapi
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

  -- Normalize game name to create API code (G2Bulk format)
  normalized_name := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]', '_', 'g'));
  normalized_name := REGEXP_REPLACE(normalized_name, '_+', '_', 'g');
  normalized_name := TRIM(BOTH '_' FROM normalized_name);
  
  -- Determine if zone is typically required (common patterns)
  needs_zone := (
    LOWER(NEW.name) LIKE '%mobile legends%' OR 
    LOWER(NEW.name) LIKE '%mlbb%' OR
    LOWER(NEW.name) LIKE '%magic chess%' OR
    LOWER(NEW.name) LIKE '%honor of kings%' OR
    LOWER(NEW.name) LIKE '%hok%'
  );
  
  -- Map common game names to G2Bulk API codes
  api_code := CASE
    WHEN LOWER(NEW.name) LIKE '%mobile legends russia%' THEN 'mlbb_ru'
    WHEN LOWER(NEW.name) LIKE '%mobile legends brazil%' THEN 'mlbb_br'
    WHEN LOWER(NEW.name) LIKE '%mobile legends global%' THEN 'mlbb_global'
    WHEN LOWER(NEW.name) LIKE '%mobile legends promo%' THEN 'mlbb_promo'
    WHEN LOWER(NEW.name) LIKE '%mobile legends special%' THEN 'mlbb_special'
    WHEN LOWER(NEW.name) LIKE '%mobile legends exclusive%' THEN 'mlbb_exclusive'
    WHEN LOWER(NEW.name) LIKE '%mobile legends%' OR LOWER(NEW.name) LIKE '%mlbb%' THEN 'mlbb'
    WHEN LOWER(NEW.name) LIKE '%magic chess%' THEN 'magic_chest_gogo'
    WHEN LOWER(NEW.name) LIKE '%free fire%' THEN 'freefire_global'
    WHEN LOWER(NEW.name) LIKE '%blood strike%' THEN 'bloodstrike'
    WHEN LOWER(NEW.name) LIKE '%pubg%' THEN 'pubgm'
    WHEN LOWER(NEW.name) LIKE '%honor of kings%' OR LOWER(NEW.name) LIKE '%hok%' THEN 'hok'
    WHEN LOWER(NEW.name) LIKE '%valorant cambodia%' THEN 'valorant_kh'
    WHEN LOWER(NEW.name) LIKE '%valorant%' THEN 'valorant'
    WHEN LOWER(NEW.name) LIKE '%delta force%' THEN 'deltaforce'
    WHEN LOWER(NEW.name) LIKE '%genshin%' THEN 'genshin'
    WHEN LOWER(NEW.name) LIKE '%honkai%' THEN 'honkai_star_rail'
    WHEN LOWER(NEW.name) LIKE '%call of duty%' OR LOWER(NEW.name) LIKE '%cod%' THEN 'codm'
    WHEN LOWER(NEW.name) LIKE '%arena of valor%' OR LOWER(NEW.name) LIKE '%aov%' THEN 'aov'
    WHEN LOWER(NEW.name) LIKE '%wild rift%' THEN 'wildrift'
    WHEN LOWER(NEW.name) LIKE '%clash of clans%' OR LOWER(NEW.name) LIKE '%coc%' THEN 'coc'
    WHEN LOWER(NEW.name) LIKE '%brawl stars%' THEN 'brawl_stars'
    WHEN LOWER(NEW.name) LIKE '%clash royale%' THEN 'clash_royale'
    ELSE normalized_name
  END;
  
  -- Insert new verification config with G2Bulk as provider
  INSERT INTO public.game_verification_configs (
    game_name,
    api_code,
    api_provider,
    requires_zone,
    is_active
  ) VALUES (
    NEW.name,
    api_code,
    'g2bulk',
    needs_zone,
    true
  );
  
  RETURN NEW;
END;
$function$;

-- Update existing configs to use g2bulk provider
UPDATE public.game_verification_configs 
SET api_provider = 'g2bulk'
WHERE api_provider = 'rapidapi';

-- Also update the default value for the api_provider column
ALTER TABLE public.game_verification_configs 
ALTER COLUMN api_provider SET DEFAULT 'g2bulk';