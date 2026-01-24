-- Create game verification configs table
CREATE TABLE public.game_verification_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_name TEXT NOT NULL,
  api_code TEXT NOT NULL,
  api_provider TEXT NOT NULL DEFAULT 'rapidapi',
  requires_zone BOOLEAN NOT NULL DEFAULT false,
  default_zone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_game_verification_configs_game_name ON public.game_verification_configs (game_name);
CREATE INDEX idx_game_verification_configs_active ON public.game_verification_configs (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.game_verification_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active verification configs"
ON public.game_verification_configs
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage verification configs"
ON public.game_verification_configs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_game_verification_configs_updated_at
BEFORE UPDATE ON public.game_verification_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data from hardcoded config
INSERT INTO public.game_verification_configs (game_name, api_code, api_provider, requires_zone, default_zone) VALUES
-- Mobile Legends variants
('Mobile Legends', 'mobile-legends', 'rapidapi', true, NULL),
('MLBB', 'mobile-legends', 'rapidapi', true, NULL),
('Mobile Legends Bang Bang', 'mobile-legends', 'rapidapi', true, NULL),
('Mobile Legends Brazil', 'mobile-legends', 'rapidapi', true, NULL),
('Mobile Legends: Bang Bang', 'mobile-legends', 'rapidapi', true, NULL),
('Mobile Legends Global', 'mobile-legends', 'rapidapi', true, NULL),
('Mobile Legends Adventure', 'mobile-legends', 'rapidapi', true, NULL),
('Magic Chess', 'mobile-legends', 'rapidapi', true, NULL),
('Magic Chess Gogo', 'mobile-legends', 'rapidapi', true, NULL),
('Magic Chess Go Go', 'mobile-legends', 'rapidapi', true, NULL),
('Magic Chess GoGo', 'mobile-legends', 'rapidapi', true, NULL),
('Magic Chess: Go Go', 'mobile-legends', 'rapidapi', true, NULL),
('Magic Chess: Bang Bang', 'mobile-legends', 'rapidapi', true, NULL),
-- Free Fire variants
('Free Fire', 'free-fire', 'rapidapi', true, NULL),
('Free Fire Brazil', 'free-fire', 'rapidapi', true, NULL),
('Free Fire Global', 'free-fire', 'rapidapi', true, NULL),
('Freefire Global', 'free-fire', 'rapidapi', true, NULL),
('FreeFire', 'free-fire', 'rapidapi', true, NULL),
('Garena Free Fire', 'free-fire', 'rapidapi', true, NULL),
('FF', 'free-fire', 'rapidapi', true, NULL),
('Free Fire MAX', 'free-fire', 'rapidapi', true, NULL),
-- Blood Strike
('Blood Strike', 'blood-strike', 'rapidapi', false, 'global'),
('BloodStrike', 'blood-strike', 'rapidapi', false, 'global'),
('Bloodstrike', 'blood-strike', 'rapidapi', false, 'global'),
-- PUBG Mobile
('PUBG', 'pubg-mobile', 'rapidapi', false, NULL),
('PUBG Mobile', 'pubg-mobile', 'rapidapi', false, NULL),
('PUBGM', 'pubg-mobile', 'rapidapi', false, NULL),
('PUBG Mobile Global', 'pubg-mobile', 'rapidapi', false, NULL),
-- Honor of Kings
('HOK', 'honor-of-kings', 'rapidapi', true, NULL),
('Honor of Kings', 'honor-of-kings', 'rapidapi', true, NULL),
('Honor of Kings Global', 'honor-of-kings', 'rapidapi', true, NULL),
-- Arena of Valor
('AOV', 'arena-of-valor', 'rapidapi', true, NULL),
('Arena of Valor', 'arena-of-valor', 'rapidapi', true, NULL),
('Garena AOV', 'arena-of-valor', 'rapidapi', true, NULL),
-- Call of Duty Mobile
('Call of Duty', 'call-of-duty-mobile', 'rapidapi', false, NULL),
('COD Mobile', 'call-of-duty-mobile', 'rapidapi', false, NULL),
('Call of Duty Mobile', 'call-of-duty-mobile', 'rapidapi', false, NULL),
('CODM', 'call-of-duty-mobile', 'rapidapi', false, NULL),
-- Valorant
('Valorant', 'valorant', 'rapidapi', false, NULL),
('VALORANT', 'valorant', 'rapidapi', false, NULL),
('Valorant Cambodia', 'valorant', 'rapidapi', false, NULL),
('Valorant Global', 'valorant', 'rapidapi', false, NULL),
-- Genshin Impact
('Genshin Impact', 'genshin-impact', 'rapidapi', true, NULL),
('Genshin', 'genshin-impact', 'rapidapi', true, NULL),
-- Honkai Star Rail
('Honkai Star Rail', 'honkai-star-rail', 'rapidapi', true, NULL),
('HSR', 'honkai-star-rail', 'rapidapi', true, NULL),
('Honkai: Star Rail', 'honkai-star-rail', 'rapidapi', true, NULL),
-- Zenless Zone Zero
('Zenless Zone Zero', 'zenless-zone-zero', 'rapidapi', true, NULL),
('ZZZ', 'zenless-zone-zero', 'rapidapi', true, NULL),
-- Wuthering Waves
('Wuthering Waves', 'wuthering-waves', 'rapidapi', true, NULL),
-- Supercell games
('Clash of Clans', 'clash-of-clans', 'rapidapi', false, NULL),
('COC', 'clash-of-clans', 'rapidapi', false, NULL),
('Brawl Stars', 'brawl-stars', 'rapidapi', false, NULL),
('Clash Royale', 'clash-royale', 'rapidapi', false, NULL),
-- Wild Rift
('Wild Rift', 'league-of-legends-wild-rift', 'rapidapi', false, NULL),
('League of Legends Wild Rift', 'league-of-legends-wild-rift', 'rapidapi', false, NULL),
('LoL Wild Rift', 'league-of-legends-wild-rift', 'rapidapi', false, NULL),
('LOLWR', 'league-of-legends-wild-rift', 'rapidapi', false, NULL),
-- Other games
('Stumble Guys', 'stumble-guys', 'rapidapi', false, NULL),
('8 Ball Pool', '8-ball-pool', 'rapidapi', false, NULL),
('8Ball Pool', '8-ball-pool', 'rapidapi', false, NULL),
('Hago', 'hago', 'rapidapi', false, NULL),
('Point Blank', 'point-blank', 'rapidapi', false, NULL),
('Dragon City', 'dragon-city', 'rapidapi', false, NULL),
('Higgs Domino', 'higgs-domino', 'rapidapi', false, NULL),
('Higgs Domino Island', 'higgs-domino', 'rapidapi', false, NULL),
('Sausage Man', 'sausage-man', 'rapidapi', false, NULL),
('Super Sus', 'super-sus', 'rapidapi', false, NULL),
('Auto Chess', 'auto-chess', 'rapidapi', false, NULL),
('Azur Lane', 'azur-lane', 'rapidapi', true, NULL),
('Aether Gazer', 'aether-gazer', 'rapidapi', true, NULL),
('Delta Force', 'delta-force', 'rapidapi', false, NULL),
('Tower of Fantasy', 'tower-of-fantasy', 'rapidapi', true, NULL),
('TOF', 'tower-of-fantasy', 'rapidapi', true, NULL),
('Eggy Party', 'eggy-party', 'rapidapi', false, NULL),
('Identity V', 'identity-v', 'rapidapi', false, NULL),
('LifeAfter', 'lifeafter', 'rapidapi', true, NULL),
('Life After', 'lifeafter', 'rapidapi', true, NULL),
('Lords Mobile', 'lords-mobile', 'rapidapi', false, NULL),
('Metal Slug', 'metal-slug-awakening', 'rapidapi', false, NULL),
('Metal Slug Awakening', 'metal-slug-awakening', 'rapidapi', false, NULL),
('Ragnarok M', 'ragnarok-m', 'rapidapi', true, NULL),
('Ragnarok M Eternal Love', 'ragnarok-m', 'rapidapi', true, NULL),
('Rise of Kingdoms', 'rise-of-kingdoms', 'rapidapi', false, NULL),
('ROK', 'rise-of-kingdoms', 'rapidapi', false, NULL),
('Tarisland', 'tarisland', 'rapidapi', false, NULL),
('World of Tanks', 'world-of-tanks-blitz', 'rapidapi', false, NULL),
('WOT Blitz', 'world-of-tanks-blitz', 'rapidapi', false, NULL),
('Ace Racer', 'ace-racer', 'rapidapi', false, NULL),
('Chess Rush', 'chess-rush', 'rapidapi', false, NULL),
('NIKKE', 'nikke', 'rapidapi', false, NULL),
('Goddess of Victory NIKKE', 'nikke', 'rapidapi', false, NULL),
('Goddess of Victory: NIKKE', 'nikke', 'rapidapi', false, NULL),
('Love and Deepspace', 'love-and-deepspace', 'rapidapi', true, NULL),
('Reverse 1999', 'reverse-1999', 'rapidapi', true, NULL),
('Reverse: 1999', 'reverse-1999', 'rapidapi', true, NULL),
('Punishing Gray Raven', 'punishing-gray-raven', 'rapidapi', true, NULL),
('PGR', 'punishing-gray-raven', 'rapidapi', true, NULL),
('Black Clover M', 'black-clover-m', 'rapidapi', true, NULL),
('Black Clover Mobile', 'black-clover-m', 'rapidapi', true, NULL),
('Arknights', 'arknights', 'rapidapi', true, NULL),
('Blue Archive', 'blue-archive', 'rapidapi', true, NULL),
-- Special providers
('Roblox', 'roblox', 'roblox', false, NULL),
('Minecraft', 'minecraft', 'minecraft', false, NULL);