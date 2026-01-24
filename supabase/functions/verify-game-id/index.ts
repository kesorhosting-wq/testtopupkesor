import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// G2Bulk API Base URL
const G2BULK_API_URL = 'https://api.g2bulk.com/v1';

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

// Map game names to G2Bulk game codes
function getG2BulkGameCode(gameName: string): string {
  const normalized = gameName.toLowerCase().trim();
  
  // Mobile Legends variants
  if (normalized.includes('mobile legends russia') || normalized === 'mlbb_ru') return 'mlbb_ru';
  if (normalized.includes('mobile legends brazil') || normalized === 'mlbb_br') return 'mlbb_br';
  if (normalized.includes('mobile legends global') || normalized === 'mlbb_global') return 'mlbb_global';
  if (normalized.includes('mobile legends promo') || normalized === 'mlbb_promo') return 'mlbb_promo';
  if (normalized.includes('mobile legends special') || normalized === 'mlbb_special') return 'mlbb_special';
  if (normalized.includes('mobile legends exclusive') || normalized === 'mlbb_exclusive') return 'mlbb_exclusive';
  if (normalized.includes('mobile legends') || normalized === 'mlbb') return 'mlbb';
  
  // Magic Chess
  if (normalized.includes('magic chess')) return 'magic_chest_gogo';
  
  // Other games
  if (normalized.includes('blood strike') || normalized.includes('bloodstrike')) return 'bloodstrike';
  if (normalized.includes('pubg')) return 'pubgm';
  if (normalized.includes('honor of kings') || normalized === 'hok') return 'hok';
  if (normalized.includes('free fire') || normalized.includes('freefire')) return 'freefire_global';
  if (normalized.includes('valorant cambodia') || normalized.includes('valorant_kh')) return 'valorant_kh';
  if (normalized.includes('valorant')) return 'valorant';
  if (normalized.includes('delta force')) return 'deltaforce';
  if (normalized.includes('genshin')) return 'genshin';
  if (normalized.includes('honkai') && normalized.includes('star')) return 'honkai_star_rail';
  if (normalized.includes('zenless') || normalized === 'zzz') return 'zzz';
  if (normalized.includes('call of duty') || normalized.includes('cod')) return 'codm';
  if (normalized.includes('arena of valor') || normalized === 'aov') return 'aov';
  if (normalized.includes('wild rift')) return 'wildrift';
  if (normalized.includes('clash of clans') || normalized === 'coc') return 'coc';
  if (normalized.includes('brawl stars')) return 'brawl_stars';
  if (normalized.includes('clash royale')) return 'clash_royale';
  
  // Default: try to create slug from name
  return normalized.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get G2Bulk API key from database
    const { data: apiConfig, error: configError } = await supabase
      .from('api_configurations')
      .select('*')
      .eq('api_name', 'g2bulk')
      .single();

    if (configError || !apiConfig) {
      log('ERROR', 'G2Bulk API not configured', { requestId, error: configError?.message });
      return new Response(
        JSON.stringify({ success: false, error: 'Verification service not configured. Please contact admin.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiConfig.is_enabled) {
      log('WARN', 'G2Bulk API is disabled', { requestId });
      return new Response(
        JSON.stringify({ success: false, error: 'Verification service is currently disabled.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = apiConfig.api_secret;

    if (!apiKey) {
      log('ERROR', 'G2Bulk API key not set', { requestId });
      return new Response(
        JSON.stringify({ success: false, error: 'Verification service not properly configured.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get G2Bulk game code
    const gameCode = getG2BulkGameCode(gameName);
    log('DEBUG', 'Game code mapping', { requestId, gameName, gameCode });

    // Build request body for G2Bulk checkPlayerIdPublic
    const requestBody: Record<string, string> = {
      game: gameCode,
      user_id: userId.toString(),
    };

    // Add server_id if provided
    if (serverId) {
      requestBody.server_id = serverId.toString();
    }

    log('INFO', 'Calling G2Bulk checkPlayerIdPublic', { requestId, requestBody });

    // Call G2Bulk API
    const response = await fetch(`${G2BULK_API_URL}/games/checkPlayerIdPublic`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    log('DEBUG', 'G2Bulk response', { requestId, status: response.status, data });

    // Check if valid
    if (data.valid === 'valid' && data.name) {
      log('INFO', 'Verification successful', { requestId, username: data.name, openid: data.openid });
      return new Response(
        JSON.stringify({
          success: true,
          username: data.name,
          userId: userId,
          serverId: serverId || undefined,
          accountName: data.name,
          openId: data.openid,
          verifiedBy: 'G2Bulk',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle invalid response
    if (data.valid === 'invalid' || data.error) {
      const errorMsg = data.message || data.error || 'Player ID not found or invalid';
      log('WARN', 'Verification failed', { requestId, error: errorMsg, data });
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle unexpected response format
    log('WARN', 'Unexpected G2Bulk response format', { requestId, data });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: data.message || 'Unable to verify player ID. Please check your ID and try again.' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('ERROR', 'Verification error', { requestId, error: String(error) });
    return new Response(
      JSON.stringify({ success: false, error: 'Verification service error. Please try again later.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
