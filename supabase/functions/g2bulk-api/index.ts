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
    function: 'g2bulk-api',
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

// Build authenticated request for G2Bulk API
function buildG2BulkRequest(
  endpoint: string, 
  apiKey: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): { url: string; options: RequestInit } {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  return {
    url: `${G2BULK_API_URL}${endpoint}`,
    options,
  };
}

// Actions that require admin authentication
const ADMIN_ACTIONS = new Set([
  'get_account_balance',
  'sync_products',
  'bulk_import_all',
  'sync_games_batch',
  'sync_game_catalogue',
  'get_orders',
  'get_game_orders',
  'get_transactions',
  'create_game_order',
  'purchase_product',
]);

// Actions allowed for authenticated users (not admin-only)
const USER_ACTIONS = new Set([
  'check_player_id',
]);

// Actions that can be called without authentication (internal use)
const PUBLIC_ACTIONS = new Set([
  'get_games',
  'get_game_catalogue',
  'get_categories',
  'get_products',
  'get_category_products',
  'get_game_fields',
  'get_game_servers',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`[G2Bulk-API] Action: ${action}`, JSON.stringify(params));

    // ============ AUTHENTICATION & AUTHORIZATION ============
    // Check if action requires authentication
    const requiresAdmin = ADMIN_ACTIONS.has(action);
    const requiresAuth = requiresAdmin || USER_ACTIONS.has(action);

    if (requiresAuth) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        log('WARN', 'Missing authorization header for protected action', { action });
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized - Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user with their token
      const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        log('WARN', 'Invalid or expired token', { action, error: userError?.message });
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized - Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For admin actions, verify admin role
      if (requiresAdmin) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleData) {
          log('WARN', 'Non-admin user attempted admin action', { action, userId: user.id });
          return new Response(
            JSON.stringify({ success: false, error: 'Forbidden - Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        log('INFO', 'Admin action authorized', { action, userId: user.id });
      } else {
        log('INFO', 'User action authorized', { action, userId: user.id });
      }
    }

    // Get G2Bulk credentials from database
    const { data: apiConfig, error: configError } = await supabase
      .from('api_configurations')
      .select('*')
      .eq('api_name', 'g2bulk')
      .single();

    if (configError || !apiConfig) {
      console.log('[G2Bulk-API] Config not found:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'G2Bulk API not configured. Please set up in Admin → API tab.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiConfig.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'G2Bulk API is disabled.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = apiConfig.api_secret;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'G2Bulk API key not configured.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response: Response;
    let data: unknown;

    switch (action) {
      // ============ GET USER INFO / BALANCE ============
      case 'get_account_balance': {
        const request = buildG2BulkRequest('/getMe', apiKey);
        console.log('[G2Bulk-API] Fetching account:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET CATEGORIES ============
      case 'get_categories': {
        const request = buildG2BulkRequest('/category', apiKey);
        console.log('[G2Bulk-API] Fetching categories:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET PRODUCTS ============
      case 'get_products': {
        const request = buildG2BulkRequest('/products', apiKey);
        console.log('[G2Bulk-API] Fetching products:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET CATEGORY PRODUCTS ============
      case 'get_category_products': {
        const { category_id } = params;
        if (!category_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'category_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const request = buildG2BulkRequest(`/category/${category_id}`, apiKey);
        console.log('[G2Bulk-API] Fetching category products:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET GAMES ============
      case 'get_games': {
        const request = buildG2BulkRequest('/games', apiKey);
        console.log('[G2Bulk-API] Fetching games:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET GAME CATALOGUE ============
      case 'get_game_catalogue': {
        const { game_code } = params;
        if (!game_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_code is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const request = buildG2BulkRequest(`/games/${game_code}/catalogue`, apiKey);
        console.log('[G2Bulk-API] Fetching game catalogue:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET GAME FIELDS ============
      case 'get_game_fields': {
        const { game_code } = params;
        if (!game_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_code is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const request = buildG2BulkRequest('/games/fields', apiKey, 'POST', { game: game_code });
        console.log('[G2Bulk-API] Fetching game fields:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET GAME SERVERS ============
      case 'get_game_servers': {
        const { game_code } = params;
        if (!game_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_code is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const request = buildG2BulkRequest('/games/servers', apiKey, 'POST', { game: game_code });
        console.log('[G2Bulk-API] Fetching game servers:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ CHECK PLAYER ID ============
      case 'check_player_id': {
        const { game_code, user_id, server_id } = params;
        if (!game_code || !user_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_code and user_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const body: Record<string, string> = { game: game_code, user_id };
        if (server_id) body.server_id = server_id;
        
        const request = buildG2BulkRequest('/games/checkPlayerId', apiKey, 'POST', body);
        console.log('[G2Bulk-API] Checking player ID:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ CREATE GAME ORDER ============
      case 'create_game_order': {
        const { game_code, catalogue_name, player_id, server_id, remark, callback_url, mch_order_id } = params;
        if (!game_code || !catalogue_name || !player_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_code, catalogue_name, and player_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const orderBody: Record<string, string> = {
          catalogue_name,
          player_id,
        };
        if (server_id) orderBody.server_id = server_id;
        if (remark) orderBody.remark = remark;
        if (callback_url) orderBody.callback_url = callback_url;
        if (mch_order_id) orderBody.remark = `order_id:${mch_order_id}`;

        const request = buildG2BulkRequest(`/games/${game_code}/order`, apiKey, 'POST', orderBody);
        console.log('[G2Bulk-API] Creating game order:', request.url, JSON.stringify(orderBody));
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ CHECK ORDER STATUS ============
      case 'check_order_status': {
        const { order_id, game_code } = params;
        if (!order_id || !game_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'order_id and game_code are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const request = buildG2BulkRequest('/games/order/status', apiKey, 'POST', { order_id, game: game_code });
        console.log('[G2Bulk-API] Checking order status:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET GAME ORDERS ============
      case 'get_game_orders': {
        const request = buildG2BulkRequest('/games/orders', apiKey);
        console.log('[G2Bulk-API] Fetching game orders:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET ALL ORDERS ============
      case 'get_orders': {
        const request = buildG2BulkRequest('/orders', apiKey);
        console.log('[G2Bulk-API] Fetching orders:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ PURCHASE PRODUCT (voucher/key) ============
      case 'purchase_product': {
        const { product_id, quantity = 1 } = params;
        if (!product_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'product_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const request = buildG2BulkRequest(`/products/${product_id}/purchase`, apiKey, 'POST', { quantity });
        console.log('[G2Bulk-API] Purchasing product:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ GET TRANSACTIONS ============
      case 'get_transactions': {
        const request = buildG2BulkRequest('/transactions', apiKey);
        console.log('[G2Bulk-API] Fetching transactions:', request.url);
        response = await fetch(request.url, request.options);
        data = await response.json();
        break;
      }

      // ============ SYNC PRODUCTS ============
      case 'sync_products': {
        console.log('[G2Bulk-API] Starting product sync...');
        
        const allProducts: Array<{
          g2bulk_type_id: string;
          g2bulk_product_id: string;
          game_name: string;
          product_name: string;
          denomination: string;
          price: number;
          currency: string;
          fields: unknown;
          product_type: string;
        }> = [];

        // ========== SYNC GAMES (Direct Top-up) ==========
        const gamesRequest = buildG2BulkRequest('/games', apiKey);
        const gamesResponse = await fetch(gamesRequest.url, gamesRequest.options);
        const gamesResult = await gamesResponse.json();

        if (gamesResult.success && gamesResult.games) {
          console.log(`[G2Bulk-API] Found ${gamesResult.games.length} games`);
          
          for (const game of gamesResult.games) {
            try {
              // Get catalogue for each game
              const catRequest = buildG2BulkRequest(`/games/${game.code}/catalogue`, apiKey);
              const catResponse = await fetch(catRequest.url, catRequest.options);
              const catResult = await catResponse.json();

              if (catResult.success && catResult.catalogues) {
                for (const catalogue of catResult.catalogues) {
                  allProducts.push({
                    g2bulk_type_id: String(catalogue.id),
                    g2bulk_product_id: `game_${game.code}_${catalogue.id}`,
                    game_name: game.name,
                    product_name: catalogue.name,
                    denomination: catalogue.name,
                    price: parseFloat(catalogue.amount) || 0,
                    currency: 'USD',
                    fields: { game_code: game.code },
                    product_type: 'recharge',
                  });
                }
                console.log(`[G2Bulk-API] Found ${catResult.catalogues.length} catalogues for ${game.name}`);
              }
            } catch (e) {
              console.error(`[G2Bulk-API] Error fetching catalogue for game ${game.code}:`, e);
            }
          }
        }

        // ========== SYNC PRODUCTS (Vouchers/Cards/Keys) ==========
        const productsRequest = buildG2BulkRequest('/products', apiKey);
        const productsResponse = await fetch(productsRequest.url, productsRequest.options);
        const productsResult = await productsResponse.json();

        if (productsResult.success && productsResult.products) {
          console.log(`[G2Bulk-API] Found ${productsResult.products.length} products`);
          
          for (const product of productsResult.products) {
            allProducts.push({
              g2bulk_type_id: String(product.id),
              g2bulk_product_id: `card_${product.id}`,
              game_name: product.category_title || 'Vouchers',
              product_name: product.title,
              denomination: product.title,
              price: parseFloat(product.unit_price) || 0,
              currency: 'USD',
              fields: { stock: product.stock },
              product_type: 'card',
            });
          }
        }

        // Upsert all products to database
        if (allProducts.length > 0) {
          const { error: upsertError } = await supabase
            .from('g2bulk_products')
            .upsert(allProducts, { 
              onConflict: 'g2bulk_product_id',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            console.error('[G2Bulk-API] Upsert error:', upsertError);
            throw upsertError;
          }
        }

        console.log(`[G2Bulk-API] Synced ${allProducts.length} products total`);
        
        data = {
          success: true,
          data: {
            synced: allProducts.length,
            categories: new Set(allProducts.map(p => p.game_name)).size
          }
        };
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ BULK IMPORT ALL GAMES & PACKAGES ============
      case 'bulk_import_all': {
        const { 
          price_markup_percent = 10, 
          update_existing_prices = false,
          selected_game_codes = null // null means all games
        } = params;
        const markup = 1 + (price_markup_percent / 100);
        
        console.log(`[G2Bulk-API] Starting bulk import with ${price_markup_percent}% markup, update_prices=${update_existing_prices}, selected_games=${selected_game_codes?.length || 'all'}...`);

        let gamesCreated = 0;
        let packagesCreated = 0;
        let gamesSkipped = 0;
        let packagesSkipped = 0;
        let packagesUpdated = 0;

        // Get existing games to avoid duplicates
        const { data: existingGames } = await supabase
          .from('games')
          .select('id, name, g2bulk_category_id');
        
        const existingGameNames = new Set((existingGames || []).map(g => g.name.toLowerCase()));
        const existingCategoryIds = new Set((existingGames || []).filter(g => g.g2bulk_category_id).map(g => g.g2bulk_category_id));
        const gameIdByCode = new Map((existingGames || []).filter(g => g.g2bulk_category_id).map(g => [g.g2bulk_category_id, g.id]));
        const gameIdByName = new Map((existingGames || []).map(g => [g.name.toLowerCase(), g.id]));

        // Get existing packages to avoid duplicates or update prices
        const { data: existingPackages } = await supabase
          .from('packages')
          .select('id, g2bulk_product_id, price')
          .not('g2bulk_product_id', 'is', null);
        
        const existingProductIds = new Set((existingPackages || []).map(p => p.g2bulk_product_id));
        const packageByProductId = new Map((existingPackages || []).map(p => [p.g2bulk_product_id, { id: p.id, price: p.price }]));

        // ========== FETCH ALL GAMES FROM G2BULK ==========
        const gamesRequest = buildG2BulkRequest('/games', apiKey);
        const gamesResponse = await fetch(gamesRequest.url, gamesRequest.options);
        const gamesResult = await gamesResponse.json();

        if (!gamesResult.success || !gamesResult.games) {
          throw new Error('Failed to fetch games from G2Bulk');
        }

        console.log(`[G2Bulk-API] Found ${gamesResult.games.length} games from G2Bulk`);

        // Filter games if specific ones are selected
        const gamesToProcess = selected_game_codes && selected_game_codes.length > 0
          ? gamesResult.games.filter((g: { code: string }) => selected_game_codes.includes(g.code))
          : gamesResult.games;
        
        console.log(`[G2Bulk-API] Processing ${gamesToProcess.length} games`);

        // Process each game
        for (const game of gamesToProcess) {
          try {
            const gameCode = game.code;
            const gameName = game.name;

            // Check if game already exists
            const gameExists = existingGameNames.has(gameName.toLowerCase()) || existingCategoryIds.has(gameCode);
            let gameId: string | null = null;

            if (gameExists) {
              console.log(`[G2Bulk-API] Game exists: ${gameName}`);
              gamesSkipped++;
              gameId = gameIdByCode.get(gameCode) || gameIdByName.get(gameName.toLowerCase()) || null;
            } else {
              // Create the game
              const { data: newGame, error: gameError } = await supabase
                .from('games')
                .insert({
                  name: gameName,
                  image: game.image || '',
                  g2bulk_category_id: gameCode,
                })
                .select('id')
                .single();

              if (gameError) {
                console.error(`[G2Bulk-API] Error creating game ${gameName}: ${gameError.message}`);
                continue;
              }

              gamesCreated++;
              gameId = newGame.id;
              existingGameNames.add(gameName.toLowerCase());
              gameIdByCode.set(gameCode, newGame.id);
              console.log(`[G2Bulk-API] Created game: ${gameName}`);
            }

            if (!gameId) continue;

            // Fetch catalogue for this game
            const catRequest = buildG2BulkRequest(`/games/${gameCode}/catalogue`, apiKey);
            const catResponse = await fetch(catRequest.url, catRequest.options);
            const catResult = await catResponse.json();

            if (catResult.success && catResult.catalogues) {
              console.log(`[G2Bulk-API] Found ${catResult.catalogues.length} catalogues for ${gameName}`);
              
              for (const catalogue of catResult.catalogues) {
                const productId = `game_${gameCode}_${catalogue.id}`;
                const basePrice = parseFloat(catalogue.amount) || 0;
                const finalPrice = Math.round(basePrice * markup * 100) / 100;
                
                if (existingProductIds.has(productId)) {
                  // Package exists - check if we should update price
                  if (update_existing_prices) {
                    const existingPkg = packageByProductId.get(productId);
                    if (existingPkg && Number(existingPkg.price) !== finalPrice) {
                      const { error: updateError } = await supabase
                        .from('packages')
                        .update({ price: finalPrice })
                        .eq('id', existingPkg.id);
                      
                      if (!updateError) {
                        packagesUpdated++;
                        console.log(`[G2Bulk-API] Updated price for ${catalogue.name}: ${existingPkg.price} -> ${finalPrice}`);
                      }
                    }
                  }
                  packagesSkipped++;
                  continue;
                }

                const { error: pkgError } = await supabase
                  .from('packages')
                  .insert({
                    game_id: gameId,
                    name: catalogue.name,
                    amount: catalogue.name,
                    price: finalPrice,
                    g2bulk_product_id: productId,
                    g2bulk_type_id: String(catalogue.id),
                  });

                if (pkgError) {
                  console.error(`[G2Bulk-API] Error creating package: ${pkgError.message}`);
                } else {
                  packagesCreated++;
                  existingProductIds.add(productId);
                }
              }
            }
          } catch (e) {
            console.error(`[G2Bulk-API] Error processing game ${game.name}:`, e);
          }
        }

        console.log(`[G2Bulk-API] Bulk import complete: ${gamesCreated} games, ${packagesCreated} packages created, ${packagesUpdated} prices updated`);
        
        data = {
          success: true,
          data: {
            games_created: gamesCreated,
            games_skipped: gamesSkipped,
            packages_created: packagesCreated,
            packages_skipped: packagesSkipped,
            packages_updated: packagesUpdated,
            price_markup_percent: price_markup_percent,
          }
        };
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ GET G2BULK GAMES LIST (for selection) ============
      case 'get_g2bulk_games_list': {
        const gamesRequest = buildG2BulkRequest('/games', apiKey);
        const gamesResponse = await fetch(gamesRequest.url, gamesRequest.options);
        const gamesResult = await gamesResponse.json();

        if (!gamesResult.success || !gamesResult.games) {
          throw new Error('Failed to fetch games from G2Bulk');
        }

        data = {
          success: true,
          data: gamesResult.games.map((g: { code: string; name: string; image?: string }) => ({
            code: g.code,
            name: g.name,
            image: g.image || '',
          }))
        };
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ SYNC SINGLE GAME CATALOGUE ============
      case 'sync_game_catalogue': {
        const { game_code, game_name } = params;
        if (!game_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_code is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[G2Bulk-API] Syncing catalogue for game: ${game_code}`);

        const catRequest = buildG2BulkRequest(`/games/${game_code}/catalogue`, apiKey);
        const catResponse = await fetch(catRequest.url, catRequest.options);
        const catResult = await catResponse.json();

        if (!catResult.success || !catResult.catalogues) {
          return new Response(
            JSON.stringify({ success: false, error: `No catalogue found for ${game_code}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const products = catResult.catalogues.map((catalogue: { id: number; name: string; amount: number }) => ({
          g2bulk_type_id: String(catalogue.id),
          g2bulk_product_id: `game_${game_code}_${catalogue.id}`,
          game_name: game_name || game_code,
          product_name: catalogue.name,
          denomination: catalogue.name,
          price: parseFloat(String(catalogue.amount)) || 0,
          currency: 'USD',
          fields: { game_code },
          product_type: 'recharge',
        }));

        if (products.length > 0) {
          const { error: upsertError } = await supabase
            .from('g2bulk_products')
            .upsert(products, { 
              onConflict: 'g2bulk_product_id',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            console.error('[G2Bulk-API] Upsert error:', upsertError);
            throw upsertError;
          }
        }

        console.log(`[G2Bulk-API] Synced ${products.length} products for ${game_code}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { game_code, synced: products.length } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ BATCH SYNC GAMES CATALOGUES ============
      case 'sync_games_batch': {
        const { game_codes = [] } = params;
        
        if (!game_codes.length) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_codes array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[G2Bulk-API] Batch syncing ${game_codes.length} games...`);

        let totalSynced = 0;
        const results: Array<{ code: string; synced: number; error?: string }> = [];

        for (const gameCode of game_codes) {
          try {
            const catRequest = buildG2BulkRequest(`/games/${gameCode}/catalogue`, apiKey);
            const catResponse = await fetch(catRequest.url, catRequest.options);
            const catResult = await catResponse.json();

            if (catResult.success && catResult.catalogues) {
              const products = catResult.catalogues.map((catalogue: { id: number; name: string; amount: number }) => ({
                g2bulk_type_id: String(catalogue.id),
                g2bulk_product_id: `game_${gameCode}_${catalogue.id}`,
                game_name: gameCode,
                product_name: catalogue.name,
                denomination: catalogue.name,
                price: parseFloat(String(catalogue.amount)) || 0,
                currency: 'USD',
                fields: { game_code: gameCode },
                product_type: 'recharge',
              }));

              if (products.length > 0) {
                await supabase
                  .from('g2bulk_products')
                  .upsert(products, { onConflict: 'g2bulk_product_id', ignoreDuplicates: false });
              }

              totalSynced += products.length;
              results.push({ code: gameCode, synced: products.length });
            } else {
              results.push({ code: gameCode, synced: 0, error: 'No catalogue' });
            }
          } catch (e) {
            results.push({ code: gameCode, synced: 0, error: String(e) });
          }
        }

        console.log(`[G2Bulk-API] Batch sync complete: ${totalSynced} products`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { total_synced: totalSynced, games: results.length, details: results } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Check for API errors
    const responseData = data as Record<string, unknown>;
    if (responseData.success === false) {
      console.error('[G2Bulk-API] API Error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: responseData.message || responseData.detail || 'API request failed', data }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[G2Bulk-API] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});