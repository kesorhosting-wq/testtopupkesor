import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const G2BULK_API_URL = 'https://api.g2bulk.com/v1';

// Structured logging helper
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'poll-g2bulk-orders',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[Poll-G2Bulk] Starting order status poll...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get G2Bulk credentials
    const { data: apiConfig, error: configError } = await supabase
      .from('api_configurations')
      .select('*')
      .eq('api_name', 'g2bulk')
      .single();

    if (configError || !apiConfig?.is_enabled || !apiConfig.api_secret) {
      console.log('[Poll-G2Bulk] G2Bulk not configured or disabled');
      return new Response(
        JSON.stringify({ success: true, message: 'G2Bulk not configured', checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = apiConfig.api_secret;
    console.log('[Poll-G2Bulk] Using G2Bulk API');

    // Get orders that are processing and have a G2Bulk order ID
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('topup_orders')
      .select('*')
      .in('status', ['processing', 'pending'])
      .not('g2bulk_order_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (ordersError) {
      console.error('[Poll-G2Bulk] Error fetching orders:', ordersError);
      throw ordersError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('[Poll-G2Bulk] No pending orders to check');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending orders', checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Poll-G2Bulk] Found ${pendingOrders.length} orders to check`);

    let updated = 0;
    let completed = 0;
    let failed = 0;

    for (const order of pendingOrders) {
      try {
        // Extract game code from g2bulk_product_id (format: game_CODE_id)
        const productId = order.g2bulk_product_id || '';
        let gameCode = '';
        
        if (productId.startsWith('game_')) {
          const parts = productId.split('_');
          if (parts.length >= 2) {
            gameCode = parts[1];
          }
        }

        if (!gameCode) {
          console.log(`[Poll-G2Bulk] Cannot determine game code for order ${order.id}`);
          continue;
        }

        // Check order status with G2Bulk
        const response = await fetch(`${G2BULK_API_URL}/games/order/status`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({
            order_id: parseInt(order.g2bulk_order_id),
            game: gameCode
          })
        });

        const result = await response.json();

        if (result.success && result.order) {
          const g2bulkStatus = result.order.status;
          let newStatus = order.status;
          let statusMessage = '';

          // Map G2Bulk status
          switch (g2bulkStatus) {
            case 'COMPLETED':
              newStatus = 'completed';
              statusMessage = 'G2Bulk order completed successfully';
              completed++;
              break;
            case 'FAILED':
              newStatus = 'failed';
              statusMessage = result.order.message || 'G2Bulk order failed';
              failed++;
              break;
            case 'PROCESSING':
            case 'PENDING':
              if (order.status !== 'processing') {
                newStatus = 'processing';
                statusMessage = 'G2Bulk is processing the order';
              }
              break;
          }

          if (newStatus !== order.status) {
            await supabase
              .from('topup_orders')
              .update({ status: newStatus, status_message: statusMessage })
              .eq('id', order.id);
            
            updated++;
            console.log(`[Poll-G2Bulk] Order ${order.id} updated: ${order.status} -> ${newStatus}`);
          }
        } else {
          console.log(`[Poll-G2Bulk] G2Bulk API error for order ${order.id}:`, result.message || result.detail);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`[Poll-G2Bulk] Error checking order ${order.id}:`, err);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Poll-G2Bulk] Completed in ${duration}ms. Checked: ${pendingOrders.length}, Updated: ${updated}, Completed: ${completed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: pendingOrders.length,
        updated,
        completed,
        failed,
        duration: `${duration}ms`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Poll-G2Bulk] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});