import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Public-safe config for KHQR (IKhode).
 * - Does NOT expose webhook_secret or any private fields.
 * - Uses service role server-side so public checkout can read enabled state.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: gateway, error } = await supabase
      .from("payment_gateways")
      .select("id, enabled, config")
      .eq("slug", "ikhode-bakong")
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to load gateway config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!gateway) {
      return new Response(
        JSON.stringify({ success: true, enabled: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = (gateway.config ?? {}) as {
      websocket_url?: string;
    };

    return new Response(
      JSON.stringify({
        success: true,
        id: gateway.id,
        enabled: !!gateway.enabled,
        websocket_url: config.websocket_url ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
