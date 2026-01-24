import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Authorization",
};

// Structured logging helper
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'ikhode-webhook',
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Extract order_id from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orderIdFromPath = pathParts[pathParts.length - 1];

    console.log(`[Webhook] Received for Order #${orderIdFromPath}`);

    // 1. Get our stored secret from payment_gateways config
    const { data: gateway } = await supabase
      .from("payment_gateways")
      .select("config")
      .eq("slug", "ikhode-bakong")
      .maybeSingle();

    const expectedSecret = (gateway?.config as any)?.webhook_secret || "";

    // 2. Authorization Check (using Bearer token)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    console.log(`[Webhook] Expected Secret: ${expectedSecret ? "[SET]" : "[NOT SET]"}`);
    console.log(`[Webhook] Received Token: ${token ? "[PROVIDED]" : "[MISSING]"}`);

    if (expectedSecret && token !== expectedSecret) {
      console.error("[Webhook] Unauthorized: Invalid secret key");
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized: Invalid secret key." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find the order
    let order = null;

    if (orderIdFromPath && orderIdFromPath !== "ikhode-webhook") {
      const { data } = await supabase
        .from("topup_orders")
        .select("*")
        .eq("id", orderIdFromPath)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.error(`[Webhook] Order not found: ${orderIdFromPath}`);
      return new Response(
        JSON.stringify({ status: "error", message: "Order not found or could not be resolved." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Webhook] Found Order: ${order.id}, Status: ${order.status}`);

    // 4. Already Processed Check - allow "pending" and "paid" status to be processed
    const processableStatuses = ["pending", "paid"];
    if (!processableStatuses.includes(order.status)) {
      console.log(`[Webhook] Order already processed, status: ${order.status}`);
      return new Response(
        JSON.stringify({ status: "success", message: `Order already ${order.status}.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Webhook] Order status "${order.status}" is processable, proceeding with fulfillment...`);

    // 5. Process Data from Node.js API
    const payload = await req.json();
    console.log("[Webhook] Payload:", JSON.stringify(payload, null, 2));

    const transactionId = payload.transaction_id || payload.transactionId || "N/A";
    const amount = payload.amount || order.amount;

    console.log(`[Webhook] Processing payment - Amount: ${amount}, Tx ID: ${transactionId}`);

    // 6. Update order status to "paid" - the DB trigger will auto-call process-topup
    // IMPORTANT: We only update status here. The trigger_process_topup_on_paid handles fulfillment.
    // This prevents double execution of G2Bulk orders.
    try {
      const { error: updateError } = await supabase
        .from("topup_orders")
        .update({
          status: "paid",
          payment_method: "Kesor KHQR",
          status_message: `Payment confirmed. Transaction: ${transactionId}. Triggering fulfillment...`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        throw updateError;
      }

      log('INFO', `Payment recorded for Order #${order.id}`, { transactionId, amount });
      console.log(`[Webhook] Payment recorded. DB trigger will handle fulfillment for Order #${order.id}`);

      // 7. Success response - fulfillment is handled by DB trigger
      return new Response(
        JSON.stringify({ status: "success", message: "Payment recorded successfully. Fulfillment triggered." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (paymentError: any) {
      console.error(`[Webhook] FATAL PAYMENT ERROR for Order #${order.id}:`, paymentError);
      return new Response(
        JSON.stringify({ status: "error", message: "Internal Server Error during payment processing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});