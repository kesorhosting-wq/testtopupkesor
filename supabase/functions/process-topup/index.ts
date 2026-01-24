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
    function: 'process-topup',
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

const G2BULK_API_URL = 'https://api.g2bulk.com/v1';

// Telegram notification function
async function sendTelegramNotification(message: string, isError: boolean = false) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  
  if (!botToken || !chatId) {
    console.log('[Telegram] Bot token or chat ID not configured, skipping notification');
    return;
  }

  const emoji = isError ? '❌' : '✅';
  const formattedMessage = `${emoji} ${message}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('[Telegram] Failed to send notification:', result.description);
    } else {
      console.log('[Telegram] Notification sent successfully');
    }
  } catch (error) {
    console.error('[Telegram] Error sending notification:', error);
  }
}

// Determine if product is card/voucher type or direct game recharge
async function getProductType(supabase: any, productId: string): Promise<'card' | 'recharge'> {
  const { data: product } = await supabase
    .from('g2bulk_products')
    .select('product_type')
    .eq('g2bulk_product_id', productId)
    .maybeSingle();
  
  return product?.product_type === 'card' ? 'card' : 'recharge';
}

// Fulfill card/voucher order (immediate delivery of codes/keys)
async function fulfillCardOrder(
  supabase: any, 
  orderId: string, 
  order: any, 
  apiKey: string
) {
  console.log(`[Fulfill-Card] Creating card order for: ${orderId}`);

  // Extract product_id from g2bulk_product_id (format: card_ID)
  const productId = order.g2bulk_product_id.replace('card_', '');

  const response = await fetch(`${G2BULK_API_URL}/products/${productId}/purchase`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ quantity: 1 })
  });

  const result = await response.json();
  console.log('[Fulfill-Card] G2Bulk response:', JSON.stringify(result));

  if (result.success) {
    const g2bulkOrderId = result.order_id || result.transaction_id;
    const deliveryItems = result.delivery_items || [];
    
    let finalStatus = 'completed';
    let statusMessage = `G2Bulk Card Order: ${g2bulkOrderId}. ${deliveryItems.length} code(s) delivered.`;
    let cardCodesJson: any = null;

    if (deliveryItems.length > 0) {
      cardCodesJson = deliveryItems.map((item: string) => ({
        code: item,
        serial: '',
        expire: ''
      }));
    }

    await supabase
      .from('topup_orders')
      .update({ 
        g2bulk_order_id: String(g2bulkOrderId),
        status: finalStatus,
        status_message: statusMessage,
        card_codes: cardCodesJson
      })
      .eq('id', orderId);

    // Send Telegram notification for completed card order
    await sendTelegramNotification(
      `<b>Card Order Completed</b>\n` +
      `🎮 Game: ${order.game_name}\n` +
      `📦 Package: ${order.package_name}\n` +
      `👤 Player: ${order.player_id}\n` +
      `💰 Amount: $${order.amount}\n` +
      `🔢 Order ID: ${orderId}\n` +
      `📋 G2Bulk Order: ${g2bulkOrderId}\n` +
      `🎫 Codes: ${deliveryItems.length} delivered`
    );

    return { success: true, g2bulk_order_id: g2bulkOrderId, status: finalStatus, cards: cardCodesJson };
  } else {
    const errorMsg = result.message || result.detail?.message || 'Card purchase failed';
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'failed',
        status_message: `G2Bulk Card Error: ${errorMsg}`
      })
      .eq('id', orderId);

    // Send Telegram notification for failed card order
    await sendTelegramNotification(
      `<b>Card Order Failed</b>\n` +
      `🎮 Game: ${order.game_name}\n` +
      `📦 Package: ${order.package_name}\n` +
      `👤 Player: ${order.player_id}\n` +
      `💰 Amount: $${order.amount}\n` +
      `🔢 Order ID: ${orderId}\n` +
      `⚠️ Error: ${errorMsg}`,
      true
    );

    return { success: false, error: errorMsg };
  }
}

// Fulfill direct game recharge order
async function fulfillRechargeOrder(
  supabase: any, 
  orderId: string, 
  order: any, 
  apiKey: string
) {
  console.log(`[Fulfill-Recharge] ========== START ==========`);
  console.log(`[Fulfill-Recharge] Order ID: ${orderId}`);
  console.log(`[Fulfill-Recharge] g2bulk_product_id: ${order.g2bulk_product_id}`);
  console.log(`[Fulfill-Recharge] player_id: ${order.player_id}`);
  console.log(`[Fulfill-Recharge] server_id: ${order.server_id}`);

  let gameCode = '';
  let catalogueName = '';

  // PRIORITY 1: Get from g2bulk_products table (most accurate source)
  // This table has the exact game_code and catalogue_name from G2Bulk
  const { data: g2bulkProduct } = await supabase
    .from('g2bulk_products')
    .select('fields, product_name, g2bulk_product_id')
    .eq('g2bulk_product_id', order.g2bulk_product_id)
    .maybeSingle();

  if (g2bulkProduct) {
    // fields contains { game_code: "..." }
    if (g2bulkProduct.fields?.game_code) {
      gameCode = g2bulkProduct.fields.game_code;
    }
    // product_name is the exact catalogue_name from G2Bulk
    if (g2bulkProduct.product_name) {
      catalogueName = g2bulkProduct.product_name;
    }
    console.log(`[Fulfill-Recharge] From g2bulk_products: gameCode=${gameCode}, catalogueName=${catalogueName}`);
  }

  // PRIORITY 2: Extract game_code and catalogue_id from g2bulk_product_id format: game_{CODE}_{id}
  let catalogueId = '';
  if (order.g2bulk_product_id?.startsWith('game_')) {
    const parts = order.g2bulk_product_id.split('_');
    // Format: game_CODE_id - extract CODE (can have underscores like ragnarok_idle)
    if (parts.length >= 3) {
      // Last part is the catalogue ID
      catalogueId = parts[parts.length - 1];
      // Remove 'game' prefix and last part (id) to get game code
      if (!gameCode) {
        gameCode = parts.slice(1, -1).join('_');
      }
      console.log(`[Fulfill-Recharge] Extracted gameCode: ${gameCode}, catalogueId: ${catalogueId}`);
    }
  }

  // PRIORITY 3: Fallback to packages + games table for game_code
  if (!gameCode) {
    console.log(`[Fulfill-Recharge] Looking up from packages/games tables...`);
    
    const { data: packageData } = await supabase
      .from('packages')
      .select('name, g2bulk_type_id, games!inner(g2bulk_category_id)')
      .eq('g2bulk_product_id', order.g2bulk_product_id)
      .maybeSingle();
    
    if (packageData) {
      if (!gameCode && packageData.games?.g2bulk_category_id) {
        gameCode = packageData.games.g2bulk_category_id;
        console.log(`[Fulfill-Recharge] Got gameCode from games.g2bulk_category_id: ${gameCode}`);
      }
      if (!catalogueId && packageData.g2bulk_type_id) {
        catalogueId = packageData.g2bulk_type_id;
        console.log(`[Fulfill-Recharge] Got catalogueId from package.g2bulk_type_id: ${catalogueId}`);
      }
    }
  }

  // PRIORITY 4: Fetch catalogue name from G2Bulk API using catalogueId
  if (gameCode && catalogueId && !catalogueName) {
    console.log(`[Fulfill-Recharge] Fetching catalogue from G2Bulk API for game: ${gameCode}, catalogueId: ${catalogueId}`);
    try {
      const catalogueResponse = await fetch(`${G2BULK_API_URL}/games/${gameCode}/catalogue`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey,
        },
      });
      
      const catalogueData = await catalogueResponse.json();
      if (catalogueData.catalogues && Array.isArray(catalogueData.catalogues)) {
        const matchedCatalogue = catalogueData.catalogues.find(
          (c: { id: number; name: string }) => c.id.toString() === catalogueId
        );
        if (matchedCatalogue) {
          catalogueName = matchedCatalogue.name;
          console.log(`[Fulfill-Recharge] Found catalogue from API: ${catalogueName} (id: ${catalogueId})`);
        }
      }
    } catch (catalogueError) {
      console.error(`[Fulfill-Recharge] Error fetching catalogue: ${catalogueError}`);
    }
  }

  // Validate required data
  if (!gameCode) {
    const errorMsg = `Could not determine game_code for product: ${order.g2bulk_product_id}`;
    console.error(`[Fulfill-Recharge] ERROR: ${errorMsg}`);
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'failed',
        status_message: errorMsg
      })
      .eq('id', orderId);
    return { success: false, error: errorMsg };
  }

  if (!catalogueName) {
    const errorMsg = `Could not determine catalogue_name for product: ${order.g2bulk_product_id}`;
    console.error(`[Fulfill-Recharge] ERROR: ${errorMsg}`);
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'failed',
        status_message: errorMsg
      })
      .eq('id', orderId);
    return { success: false, error: errorMsg };
  }

  // Build callback URL for status updates
  const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/g2bulk-webhook`;

  // Build order body for G2Bulk API
  const orderBody: Record<string, string> = {
    catalogue_name: catalogueName,
    player_id: order.player_id,
    remark: `order_id:${orderId}`,
    callback_url: callbackUrl,
  };

  if (order.server_id) {
    orderBody.server_id = order.server_id;
  }

  console.log(`[Fulfill-Recharge] API URL: ${G2BULK_API_URL}/games/${gameCode}/order`);
  console.log(`[Fulfill-Recharge] Request body:`, JSON.stringify(orderBody));

  const response = await fetch(`${G2BULK_API_URL}/games/${gameCode}/order`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(orderBody)
  });

  const result = await response.json();
  console.log('[Fulfill-Recharge] G2Bulk response:', JSON.stringify(result));

  if (result.success && result.order) {
    const g2bulkOrderId = result.order.order_id;
    const status = result.order.status;
    
    let finalStatus = 'processing';
    let statusMessage = `G2Bulk Order: ${g2bulkOrderId}. Status: ${status}`;
    
    if (status === 'COMPLETED') {
      finalStatus = 'completed';
      statusMessage = `Successfully delivered via G2Bulk. Order: ${g2bulkOrderId}`;
    } else if (status === 'FAILED') {
      finalStatus = 'failed';
      statusMessage = `G2Bulk delivery failed. Order: ${g2bulkOrderId}`;
    }

    await supabase
      .from('topup_orders')
      .update({ 
        g2bulk_order_id: String(g2bulkOrderId),
        status: finalStatus,
        status_message: statusMessage
      })
      .eq('id', orderId);

    // Send Telegram notification based on status
    if (finalStatus === 'completed') {
      await sendTelegramNotification(
        `<b>Recharge Order Completed</b>\n` +
        `🎮 Game: ${order.game_name}\n` +
        `📦 Package: ${order.package_name}\n` +
        `👤 Player: ${order.player_id}${order.server_id ? ` (Server: ${order.server_id})` : ''}\n` +
        `💰 Amount: $${order.amount}\n` +
        `🔢 Order ID: ${orderId}\n` +
        `📋 G2Bulk Order: ${g2bulkOrderId}`
      );
    } else if (finalStatus === 'failed') {
      await sendTelegramNotification(
        `<b>Recharge Order Failed</b>\n` +
        `🎮 Game: ${order.game_name}\n` +
        `📦 Package: ${order.package_name}\n` +
        `👤 Player: ${order.player_id}${order.server_id ? ` (Server: ${order.server_id})` : ''}\n` +
        `💰 Amount: $${order.amount}\n` +
        `🔢 Order ID: ${orderId}\n` +
        `📋 G2Bulk Order: ${g2bulkOrderId}\n` +
        `⚠️ Status: ${status}`,
        true
      );
    }

    console.log(`[Fulfill-Recharge] ========== SUCCESS ==========`);
    return { success: true, g2bulk_order_id: g2bulkOrderId, status: finalStatus };
  } else {
    const errorMsg = result.message || result.detail?.message || JSON.stringify(result);
    console.error(`[Fulfill-Recharge] G2Bulk Error: ${errorMsg}`);
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'failed',
        status_message: `G2Bulk Error: ${errorMsg}`
      })
      .eq('id', orderId);

    // Send Telegram notification for API error
    await sendTelegramNotification(
      `<b>Recharge Order Failed</b>\n` +
      `🎮 Game: ${order.game_name}\n` +
      `📦 Package: ${order.package_name}\n` +
      `👤 Player: ${order.player_id}${order.server_id ? ` (Server: ${order.server_id})` : ''}\n` +
      `💰 Amount: $${order.amount}\n` +
      `🔢 Order ID: ${orderId}\n` +
      `⚠️ Error: ${errorMsg}`,
      true
    );

    console.log(`[Fulfill-Recharge] ========== FAILED ==========`);
    return { success: false, error: errorMsg };
  }
}

async function fulfillG2BulkOrder(supabase: any, orderId: string) {
  console.log(`[Fulfill] ========== STARTING G2BULK FULFILLMENT ==========`);
  console.log(`[Fulfill] Order ID: ${orderId}`);
  
  const { data: order, error: orderError } = await supabase
    .from('topup_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  
  if (orderError || !order) {
    console.error('[Fulfill] Order not found:', orderError);
    return { success: false, error: 'Order not found' };
  }

  // GUARD: Prevent double-execution - only process if status is 'paid' or 'pending'
  // If already processing/completed/failed, skip to prevent duplicate G2Bulk orders
  const allowedStatuses = ['paid', 'pending'];
  if (!allowedStatuses.includes(order.status)) {
    console.log(`[Fulfill] Order already ${order.status}, skipping to prevent double-execution`);
    return { success: true, status: order.status, message: 'Already processed' };
  }

  // IMMEDIATELY update to 'processing' to prevent double-execution and show user status
  console.log(`[Fulfill] Updating order ${orderId} to processing status`);
  await supabase
    .from('topup_orders')
    .update({ 
      status: 'processing',
      status_message: 'Processing order with G2Bulk...'
    })
    .eq('id', orderId);

  console.log(`[Fulfill] Order found:`, JSON.stringify({
    id: order.id,
    g2bulk_product_id: order.g2bulk_product_id,
    player_id: order.player_id,
    status: order.status
  }));

  let g2bulkProductId: string | null = order.g2bulk_product_id;

  // If order doesn't have g2bulk_product_id, try to resolve it from packages/special_packages
  if (!g2bulkProductId) {
    console.log('[Fulfill] No g2bulk_product_id on order; attempting to resolve from packages...');

    const { data: pkg } = await supabase
      .from('packages')
      .select('g2bulk_product_id, games!inner(name)')
      .eq('name', order.package_name)
      .eq('games.name', order.game_name)
      .maybeSingle();

    if (pkg?.g2bulk_product_id) {
      g2bulkProductId = pkg.g2bulk_product_id;
    } else {
      const { data: spkg } = await supabase
        .from('special_packages')
        .select('g2bulk_product_id, games!inner(name)')
        .eq('name', order.package_name)
        .eq('games.name', order.game_name)
        .maybeSingle();

      if (spkg?.g2bulk_product_id) {
        g2bulkProductId = spkg.g2bulk_product_id;
      }
    }

    if (g2bulkProductId) {
      console.log(`[Fulfill] Resolved g2bulk_product_id=${g2bulkProductId} for order ${orderId}`);
      await supabase
        .from('topup_orders')
        .update({ g2bulk_product_id: g2bulkProductId })
        .eq('id', orderId);
    }
  }

  if (!g2bulkProductId) {
    console.log('[Fulfill] No G2Bulk product linked (and could not resolve), marking as manual fulfillment');
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'pending_manual',
        status_message: 'No G2Bulk product linked. Please link a package to a G2Bulk product in admin, then retry.'
      })
      .eq('id', orderId);
    return { success: true, status: 'pending_manual' };
  }

  const g2bulkProductIdFinal = g2bulkProductId as string;

  const { data: apiConfig } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('api_name', 'g2bulk')
    .maybeSingle();

  if (!apiConfig?.is_enabled || !apiConfig.api_secret) {
    console.log('[Fulfill] G2Bulk not configured, marking as manual fulfillment');
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'pending_manual',
        status_message: 'G2Bulk API not configured. Manual fulfillment required.'
      })
      .eq('id', orderId);
    return { success: true, status: 'pending_manual' };
  }

  const apiKey = apiConfig.api_secret;

  try {
    // Update order to processing
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'processing',
        status_message: 'Sending to G2Bulk for fulfillment...'
      })
      .eq('id', orderId);

    // Determine product type and route to appropriate handler
    const orderForFulfillment = { ...order, g2bulk_product_id: g2bulkProductIdFinal };
    const productType = await getProductType(supabase, g2bulkProductIdFinal);
    console.log(`[Fulfill] Product type: ${productType}`);
    
    if (productType === 'card') {
      return await fulfillCardOrder(supabase, orderId, orderForFulfillment, apiKey);
    } else {
      return await fulfillRechargeOrder(supabase, orderId, orderForFulfillment, apiKey);
    }
  } catch (g2bulkError: any) {
    console.error('[Fulfill] G2Bulk processing error:', g2bulkError);
    await supabase
      .from('topup_orders')
      .update({ 
        status: 'failed',
        status_message: `G2Bulk error: ${g2bulkError.message || 'Unknown error'}`
      })
      .eq('id', orderId);
    return { success: false, error: g2bulkError.message };
  }
}

// Check G2Bulk order status and update our database
async function checkG2BulkOrderStatus(supabase: any, orderId: string) {
  console.log(`[CheckStatus] Checking G2Bulk status for order: ${orderId}`);
  
  const { data: order } = await supabase
    .from('topup_orders')
    .select('*')
    .eq('id', orderId)
    .single();
  
  if (!order?.g2bulk_order_id) {
    return { success: false, error: 'No G2Bulk order ID found' };
  }

  const { data: apiConfig } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('api_name', 'g2bulk')
    .single();

  if (!apiConfig?.is_enabled || !apiConfig.api_secret) {
    return { success: false, error: 'G2Bulk not configured' };
  }

  // Extract game code from g2bulk_products or product_id
  let gameCode = '';
  
  // Try g2bulk_products first
  const { data: g2bulkProduct } = await supabase
    .from('g2bulk_products')
    .select('fields')
    .eq('g2bulk_product_id', order.g2bulk_product_id)
    .maybeSingle();

  if (g2bulkProduct?.fields?.game_code) {
    gameCode = g2bulkProduct.fields.game_code;
  } else if (order.g2bulk_product_id?.startsWith('game_')) {
    // Fallback: extract from product_id
    const parts = order.g2bulk_product_id.split('_');
    if (parts.length >= 3) {
      gameCode = parts.slice(1, -1).join('_');
    }
  }

  if (!gameCode) {
    return { success: false, error: 'Could not determine game code' };
  }

  console.log(`[CheckStatus] Game code: ${gameCode}, G2Bulk order: ${order.g2bulk_order_id}`);

  const response = await fetch(`${G2BULK_API_URL}/games/order/status`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': apiConfig.api_secret,
    },
    body: JSON.stringify({
      order_id: parseInt(order.g2bulk_order_id),
      game: gameCode
    })
  });

  const result = await response.json();
  console.log(`[CheckStatus] G2Bulk response:`, JSON.stringify(result));

  if (result.success && result.order) {
    const g2bulkStatus = result.order.status;
    
    let finalStatus = order.status;
    if (g2bulkStatus === 'COMPLETED') {
      finalStatus = 'completed';
    } else if (g2bulkStatus === 'FAILED') {
      finalStatus = 'failed';
    }

    await supabase
      .from('topup_orders')
      .update({ 
        status: finalStatus,
        status_message: `G2Bulk Status: ${g2bulkStatus}`
      })
      .eq('id', orderId);

    return { success: true, g2bulk_status: g2bulkStatus, our_status: finalStatus };
  }

  return { success: false, error: result.message || 'Failed to check status' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    // Handle fulfill action (called after payment confirmed)
    if (body.action === 'fulfill' && body.orderId) {
      console.log('[Process-Topup] Fulfill action for order:', body.orderId);
      const result = await fulfillG2BulkOrder(supabase, body.orderId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle check_status action
    if (body.action === 'check_status' && body.orderId) {
      console.log('[Process-Topup] Check status for order:', body.orderId);
      const result = await checkG2BulkOrderStatus(supabase, body.orderId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle create order action (initial order creation)
    const { 
      game_name,
      package_name,
      player_id,
      server_id,
      player_name,
      amount,
      currency,
      payment_method,
      g2bulk_product_id,
      user_id
    } = body;

    console.log('[Process-Topup] Creating order:', { game_name, package_name, player_id, g2bulk_product_id });

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from('topup_orders')
      .insert({
        game_name,
        package_name,
        player_id,
        server_id,
        player_name,
        amount,
        currency: currency || 'USD',
        payment_method,
        g2bulk_product_id: g2bulk_product_id || null,
        user_id: user_id || null,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('[Process-Topup] Order creation error:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Process-Topup] Order created:', order.id);

    // Return order info - fulfillment will happen after payment is confirmed
    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: order.id,
        status: 'pending',
        has_g2bulk: !!g2bulk_product_id,
        message: 'Order created. Awaiting payment confirmation.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Process-Topup] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
