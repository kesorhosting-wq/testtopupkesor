import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'wallet-topup',
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth token
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      log('ERROR', 'Failed to get user', { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, amount, orderId } = await req.json();
    log('INFO', 'Wallet action received', { action, amount, userId: user.id, orderId });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "get-balance") {
      // Get user's wallet balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        log('ERROR', 'Failed to get profile', { error: profileError.message });
        return new Response(
          JSON.stringify({ error: "Failed to get wallet balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ balance: profile?.wallet_balance || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "topup") {
      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000) {
        return new Response(
          JSON.stringify({ error: "Invalid amount. Must be between 0 and 10,000" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use atomic transaction function to prevent race conditions
      const { data: result, error: rpcError } = await supabase.rpc('process_wallet_transaction', {
        _user_id: user.id,
        _type: 'topup',
        _amount: amount,
        _description: 'Wallet top-up via KHQR',
        _reference_id: orderId || null
      });

      if (rpcError) {
        log('ERROR', 'Failed to process topup transaction', { error: rpcError.message });
        return new Response(
          JSON.stringify({ error: "Failed to process top-up" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!result.success) {
        log('ERROR', 'Transaction failed', { error: result.error });
        return new Response(
          JSON.stringify({ error: result.error || "Failed to process top-up" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      log('INFO', 'Wallet topup successful', { 
        userId: user.id, 
        amount, 
        newBalance: result.new_balance,
        transactionId: result.transaction_id 
      });

      return new Response(
        JSON.stringify({ success: true, newBalance: result.new_balance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "purchase") {
      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000) {
        return new Response(
          JSON.stringify({ error: "Invalid amount. Must be between 0 and 10,000" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use atomic transaction function to prevent race conditions
      // Pass negative amount for purchase (deduction)
      const { data: result, error: rpcError } = await supabase.rpc('process_wallet_transaction', {
        _user_id: user.id,
        _type: 'purchase',
        _amount: -amount, // Negative for deduction
        _description: 'Game top-up purchase',
        _reference_id: orderId || null
      });

      if (rpcError) {
        log('ERROR', 'Failed to process purchase transaction', { error: rpcError.message });
        return new Response(
          JSON.stringify({ error: "Failed to process purchase" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!result.success) {
        // Check for insufficient balance error
        if (result.error && result.error.includes('Insufficient balance')) {
          return new Response(
            JSON.stringify({ error: "Insufficient wallet balance" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        log('ERROR', 'Transaction failed', { error: result.error });
        return new Response(
          JSON.stringify({ error: result.error || "Failed to process purchase" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      log('INFO', 'Wallet purchase successful', { 
        userId: user.id, 
        amount, 
        newBalance: result.new_balance,
        transactionId: result.transaction_id 
      });

      return new Response(
        JSON.stringify({ success: true, newBalance: result.new_balance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Wallet topup error', { error: errorMessage });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
