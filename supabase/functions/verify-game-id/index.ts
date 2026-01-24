import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Structured logging helper
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'verify-game-id',
    message,
    ...data,
  };
  if (level === 'ERROR') {
    console.error(JSON.stringify(entry));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

interface GameVerificationConfig {
  game_name: string;
  api_code: string;
  api_provider: string;
  requires_zone: boolean;
  default_zone: string | null;
}

// Cache for game configs (refreshed every 5 minutes)
let configCache: Map<string, GameVerificationConfig> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getGameConfigs(): Promise<Map<string, GameVerificationConfig>> {
  const now = Date.now();
  
  // Return cached configs if still valid
  if (configCache && (now - cacheTimestamp) < CACHE_TTL) {
    return configCache;
  }
  
  // Fetch from database
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('game_verification_configs')
    .select('game_name, api_code, api_provider, requires_zone, default_zone')
    .eq('is_active', true);
  
  if (error) {
    log('ERROR', 'Failed to fetch game configs', { error: error.message });
    // Return empty map if fetch fails
    return configCache || new Map();
  }
  
  // Build lookup map (case-insensitive)
  const newCache = new Map<string, GameVerificationConfig>();
  for (const config of data || []) {
    // Store with original name
    newCache.set(config.game_name, config);
    // Also store lowercase version for case-insensitive lookup
    newCache.set(config.game_name.toLowerCase(), config);
  }
  
  configCache = newCache;
  cacheTimestamp = now;
  log('INFO', 'Loaded game verification configs from database', { count: data?.length || 0 });
  
  return configCache;
}

// Normalize game names for fuzzy matching
function normalizeGameName(gameName: string): string {
  const normalized = gameName.toLowerCase().trim();
  
  if (normalized.includes('mobile legends') || normalized === 'mlbb') return 'Mobile Legends';
  if (normalized.includes('magic chess')) return 'Magic Chess';
  if (normalized.includes('free fire') || normalized.includes('freefire') || normalized === 'ff') return 'Free Fire';
  if (normalized.includes('blood strike') || normalized.includes('bloodstrike')) return 'Blood Strike';
  if (normalized.includes('pubg')) return 'PUBG Mobile';
  if (normalized.includes('honor of kings') || normalized === 'hok') return 'Honor of Kings';
  if (normalized.includes('call of duty') || normalized.includes('cod') || normalized === 'codm') return 'Call of Duty Mobile';
  if (normalized.includes('arena of valor') || normalized === 'aov') return 'Arena of Valor';
  if (normalized.includes('valorant')) return 'Valorant';
  if (normalized.includes('genshin')) return 'Genshin Impact';
  if (normalized.includes('honkai') && normalized.includes('star')) return 'Honkai Star Rail';
  if (normalized.includes('zenless') || normalized === 'zzz') return 'Zenless Zone Zero';
  if (normalized.includes('wuthering')) return 'Wuthering Waves';
  if (normalized.includes('wild rift') || normalized === 'lolwr') return 'Wild Rift';
  if (normalized.includes('clash of clans') || normalized === 'coc') return 'Clash of Clans';
  if (normalized.includes('brawl stars')) return 'Brawl Stars';
  if (normalized.includes('delta force')) return 'Delta Force';
  if (normalized.includes('nikke')) return 'NIKKE';
  if (normalized.includes('punishing') || normalized === 'pgr') return 'Punishing Gray Raven';
  if (normalized.includes('arknights')) return 'Arknights';
  if (normalized.includes('blue archive')) return 'Blue Archive';
  if (normalized.includes('roblox')) return 'Roblox';
  if (normalized.includes('minecraft')) return 'Minecraft';
  
  return gameName;
}

// Find game config from database
async function findGameConfig(gameName: string): Promise<GameVerificationConfig | null> {
  const configs = await getGameConfigs();
  
  // Try exact match first
  let config = configs.get(gameName);
  if (config) return config;
  
  // Try lowercase match
  config = configs.get(gameName.toLowerCase());
  if (config) return config;
  
  // Try normalized name
  const normalized = normalizeGameName(gameName);
  config = configs.get(normalized);
  if (config) return config;
  
  config = configs.get(normalized.toLowerCase());
  if (config) return config;
  
  return null;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameName, userId, serverId } = await req.json();
    
    log('INFO', 'Verification request received', { requestId, gameName, userId, serverId: serverId || 'N/A' });

    if (!gameName || !userId) {
      log('WARN', 'Missing required parameters', { requestId, gameName, userId });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing gameName or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get RapidAPI key
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');

    // Find game config from database
    const gameConfig = await findGameConfig(gameName);
    log('DEBUG', 'Game config lookup', { requestId, gameName, configFound: !!gameConfig, apiProvider: gameConfig?.api_provider });

    // Handle Roblox games
    if (gameConfig?.api_provider === 'roblox') {
      try {
        console.log(`Using Roblox API for username: ${userId}`);
        const response = await fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [userId], excludeBannedUsers: true }),
        });
        
        const data = await response.json();
        console.log('Roblox API response:', JSON.stringify(data));
        
        if (data.data && data.data.length > 0) {
          const user = data.data[0];
          return new Response(
            JSON.stringify({
              success: true,
              username: user.displayName || user.name,
              userId: user.id.toString(),
              accountName: user.name,
              verifiedBy: 'Roblox',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Roblox username not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Roblox API error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to verify Roblox account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle Minecraft games
    if (gameConfig?.api_provider === 'minecraft') {
      try {
        console.log(`Using Mojang API for username: ${userId}`);
        const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(userId)}`);
        
        if (response.status === 200) {
          const data = await response.json();
          console.log('Mojang API response:', JSON.stringify(data));
          return new Response(
            JSON.stringify({
              success: true,
              username: data.name,
              userId: data.id,
              accountName: data.name,
              verifiedBy: 'Minecraft',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (response.status === 204 || response.status === 404) {
          return new Response(
            JSON.stringify({ success: false, error: 'Minecraft username not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error(`Mojang API returned status ${response.status}`);
        }
      } catch (error) {
        console.error('Minecraft API error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to verify Minecraft account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle RapidAPI games
    if (gameConfig?.api_provider === 'rapidapi' && rapidApiKey) {
      // Check if this game requires Zone ID from user
      if (gameConfig.requires_zone && !serverId) {
        console.log(`Game "${gameName}" requires Zone/Server ID but none provided`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `${gameName} requires a Server/Zone ID. Please enter your Server ID.`,
            requiresServerId: true
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Build RapidAPI URL: /api/game/{game-code}?id={userId}&zone={serverId}
        let apiUrl = `https://check-id-game1.p.rapidapi.com/api/game/${gameConfig.api_code}?id=${encodeURIComponent(userId)}`;
        
        // Add zone parameter - either from user input or default
        const zoneValue = serverId || gameConfig.default_zone;
        if (zoneValue) {
          apiUrl += `&zone=${encodeURIComponent(zoneValue)}`;
        }
        
        console.log(`Calling RapidAPI: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'check-id-game1.p.rapidapi.com',
          },
        });
        
        const data = await response.json();
        console.log('RapidAPI response:', JSON.stringify(data));
        
        // Parse response - check various formats
        if (data.success === true || data.status === true || data.data) {
          const responseData = data.data || data;
          const nickname = responseData.nickname || responseData.username || responseData.name || 
                          responseData.game_name || responseData.player_name || responseData.ign;
          
          if (nickname) {
            return new Response(
              JSON.stringify({
                success: true,
                username: nickname,
                userId: userId,
                serverId: serverId || undefined,
                accountName: nickname,
                verifiedBy: 'RapidAPI',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // Check if response has error
        if (data.success === false || data.status === false) {
          const errorMsg = data.message || data.error || data.msg || 'Account not found';
          console.log(`RapidAPI returned error: ${errorMsg}`);
          
          // Check if this is a game-specific error that indicates the user EXISTS
          // Error codes like 630 (Error_IAP_FirstChargeDoubbleBuyed) mean the account is valid
          const gameSpecificErrorCodes = ['630', 'Error_IAP', 'FirstCharge', 'DoubbleBuyed'];
          const isGameSpecificError = gameSpecificErrorCodes.some(code => 
            errorMsg.includes(code)
          );
          
          if (isGameSpecificError) {
            console.log('Game-specific error detected - user likely exists, falling back to free API');
            // Don't return error, let it fall through to free API
            throw new Error('Game-specific error, trying fallback');
          }
          
          // If it's a "zone required" error, try with a default zone
          if (errorMsg.toLowerCase().includes('zone') && !serverId && !gameConfig.default_zone) {
            console.log('Retrying with default zone...');
            const retryUrl = `${apiUrl}&zone=1`;
            const retryResponse = await fetch(retryUrl, {
              method: 'GET',
              headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': 'check-id-game1.p.rapidapi.com',
              },
            });
            const retryData = await retryResponse.json();
            console.log('RapidAPI retry response:', JSON.stringify(retryData));
            
            if (retryData.success === true || retryData.status === true || retryData.data) {
              const retryResponseData = retryData.data || retryData;
              const retryNickname = retryResponseData.nickname || retryResponseData.username || retryResponseData.name || 
                              retryResponseData.game_name || retryResponseData.player_name || retryResponseData.ign;
              
              if (retryNickname) {
                return new Response(
                  JSON.stringify({
                    success: true,
                    username: retryNickname,
                    userId: userId,
                    serverId: serverId || undefined,
                    accountName: retryNickname,
                    verifiedBy: 'RapidAPI',
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
          
          // Only return 404 for genuine "not found" errors
          const notFoundIndicators = ['not found', 'invalid', 'does not exist', 'no user', 'no account'];
          const isNotFound = notFoundIndicators.some(indicator => 
            errorMsg.toLowerCase().includes(indicator)
          );
          
          if (isNotFound) {
            return new Response(
              JSON.stringify({ success: false, error: errorMsg }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // For other errors, try fallback
          console.log('Unknown RapidAPI error, trying fallback APIs');
          throw new Error(errorMsg);
        }
        
        // Unknown response format - continue to fallback providers
        console.log('RapidAPI unknown response format; continuing to fallback providers');
        throw new Error(data?.message || 'RapidAPI unknown response format');
        
      } catch (error) {
        console.error('RapidAPI error:', error);
        // Fallback: try free API
      }
    }

    // Fallback: Try free api-cek-id-game for supported games
    const FREE_API_MAP: Record<string, string> = {
      'Mobile Legends': 'mobile_legends',
      'Magic Chess': 'mobile_legends',
      'Free Fire': 'free_fire',
      'Arena of Valor': 'arena_of_valor',
      'Call of Duty': 'call_of_duty',
      'Call of Duty Mobile': 'call_of_duty',
      'Valorant': 'valorant',
      'Point Blank': 'point_blank',
      'Hago': 'hago',
      '8 Ball Pool': 'eight_ball_pool',
    };
    
    const normalizedName = normalizeGameName(gameName);
    const freeGameType = FREE_API_MAP[gameName] || FREE_API_MAP[normalizedName];
    
    if (freeGameType) {
      try {
        let apiUrl = `https://api-cek-id-game-ten.vercel.app/api/check-id-game?type_name=${freeGameType}&userId=${userId}`;
        if (serverId) apiUrl += `&zoneId=${serverId}`;
        
        console.log(`Trying free API: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        
        const data = await response.json();
        console.log('Free API response:', JSON.stringify(data));
        
        if (data.status === true || data.success === true) {
          const nickname = data.nickname || data.username || data.name;
          if (nickname) {
            return new Response(
              JSON.stringify({
                success: true,
                username: nickname,
                userId: userId,
                serverId: serverId || undefined,
                accountName: nickname,
                verifiedBy: 'FreeAPI',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (error) {
        console.error('Free API error:', error);
      }
    }

    // No API available or all failed
    console.log(`No API available for "${gameName}"`);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Automatic verification is currently unavailable for ${gameName}. Please try again later.`,
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
