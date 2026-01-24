import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Structured logging helper
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'ikhode-payment',
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Ikhode API config from payment_gateways
    const { data: gateway, error: gatewayError } = await supabase
      .from("payment_gateways")
      .select("config, enabled")
      .eq("slug", "ikhode-bakong")
      .maybeSingle();

    if (gatewayError) {
      console.error("[Ikhode] Error fetching gateway config:", gatewayError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch payment gateway config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!gateway) {
      return new Response(
        JSON.stringify({ error: "Ikhode Payment gateway not configured. Please add it in admin settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!gateway.enabled) {
      return new Response(
        JSON.stringify({ error: "Ikhode Payment gateway is disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = gateway.config as {
      node_api_url: string;
      websocket_url: string;
      webhook_secret: string;
      custom_webhook_url?: string;
    };

    const apiUrl = config.node_api_url?.replace(/\/$/, "");
    const wsUrl = config.websocket_url;
    const webhookSecret = config.webhook_secret || "";
    const customWebhookUrl = config.custom_webhook_url || "";

    if (!apiUrl) {
      return new Response(
        JSON.stringify({ error: "Node.js API URL not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, ...params } = body;

    console.log(`[Ikhode] Action: ${action}`, params);

    switch (action) {
      case "generate-khqr": {
        const { amount, orderId, playerName, gameName } = params;

        // Build callback URL - use custom URL if configured, otherwise default
        const defaultCallbackUrl = `${supabaseUrl}/functions/v1/ikhode-webhook/${orderId}`;
        const callbackUrl = customWebhookUrl
          ? customWebhookUrl.replace("{order_id}", orderId)
          : defaultCallbackUrl;

        // KHQR billNumber has max 25 characters - shorten the UUID
        const shortTransactionId = `ORD-${orderId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;

        console.log(`[Ikhode] Generating KHQR:`);
        console.log(`  - Amount: ${amount}`);
        console.log(`  - Order ID: ${orderId}`);
        console.log(`  - Short Transaction ID: ${shortTransactionId}`);
        console.log(`  - Callback URL: ${callbackUrl}`);

        // Round amount to 2 decimal places to avoid floating point issues
        const roundedAmount = Math.round(Number(amount) * 100) / 100;

        // Call Node.js API
        const response = await fetch(`${apiUrl}/generate-khqr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: roundedAmount,
            transactionId: shortTransactionId,
            email: params.email || "customer@kesor.com",
            username: playerName || "Customer",
            gameName: gameName || "",
            callbackUrl,
            secret: webhookSecret,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Ikhode] API error ${response.status}:`, errorText);
          let errorMessage = "Failed to contact payment API. Check Node.js logs.";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {}
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        const qrCodeData = data.qrCodeData;

        if (!qrCodeData) {
          return new Response(
            JSON.stringify({ error: "Node.js API did not return a QR Code image data." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Ikhode] KHQR generated successfully for order ${orderId}`);

        return new Response(JSON.stringify({
          qrCodeData,
          wsUrl,
          orderId,
          amount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "check-status": {
        const { orderId } = params;

        // Check order status
        const { data: order } = await supabase
          .from("topup_orders")
          .select("status")
          .eq("id", orderId)
          .maybeSingle();

        if (!order) {
          return new Response(
            JSON.stringify({ error: "Order not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            status: order?.status === "paid" ? "paid" : "pending",
            orderId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-config": {
        // Only returns non-sensitive config info
        console.log(`[Ikhode] Config - API: ${apiUrl}, WS: ${wsUrl}`);

        return new Response(
          JSON.stringify({
            apiUrl,
            wsUrl,
            wsEnabled: !!wsUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "test-connection": {
        // Test connection to Node.js API from edge function (avoids CORS)
        // Try multiple endpoints: /health, /, then a simple connectivity test
        console.log(`[Ikhode] Testing connection to: ${apiUrl}`);
        
        const endpointsToTry = ['/health', '/', ''];
        let lastError = '';
        
        for (const endpoint of endpointsToTry) {
          try {
            const testUrl = endpoint ? `${apiUrl}${endpoint}` : apiUrl;
            console.log(`[Ikhode] Trying: ${testUrl}`);
            
            const response = await fetch(testUrl, {
              method: "GET",
              headers: { 
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true" // Skip ngrok warning page
              },
            });

            // Accept any response (even 404) as proof the server is reachable
            // Only 2xx/3xx means fully healthy, but 4xx means server is up
            if (response.ok) {
              const data = await response.json().catch(() => ({}));
              console.log(`[Ikhode] Connection successful at ${testUrl}:`, data);
              return new Response(
                JSON.stringify({
                  success: true,
                  message: `API is healthy at ${endpoint || '/'}`,
                  apiUrl,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } else if (response.status < 500) {
              // 4xx means server is reachable but endpoint doesn't exist - still good
              console.log(`[Ikhode] Server reachable at ${testUrl} (status: ${response.status})`);
              return new Response(
                JSON.stringify({
                  success: true,
                  message: `Server is reachable (${response.status}). API endpoint may need configuration.`,
                  apiUrl,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } else {
              lastError = `Server error: ${response.status}`;
            }
          } catch (fetchError: any) {
            lastError = fetchError.message;
            console.log(`[Ikhode] Failed at ${endpoint}: ${lastError}`);
          }
        }
        
        // All endpoints failed
        console.error(`[Ikhode] All connection attempts failed: ${lastError}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Cannot reach API: ${lastError}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("[Ikhode] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
