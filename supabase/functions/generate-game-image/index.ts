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
    function: 'generate-game-image',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameName, gameId } = await req.json();
    
    if (!gameName) {
      return new Response(
        JSON.stringify({ error: 'Game name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GenerateGameImage] Generating image for: ${gameName}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create a detailed prompt for game icon generation
    const prompt = `Create a high-quality mobile game icon for "${gameName}". 
The icon should be:
- Professional game app store quality
- Vibrant and eye-catching with rich colors
- Square format suitable for app icons
- Clean, modern design with clear visual elements
- Related to the game's theme and genre
- No text or letters in the image
- Glossy or polished finish
Style: Modern mobile game icon, AAA quality, detailed artwork`;

    console.log(`[GenerateGameImage] Prompt: ${prompt}`);

    // Call Lovable AI Gateway with image generation model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GenerateGameImage] API error: ${response.status} - ${errorText}`);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[GenerateGameImage] Response received`);

    // Extract the image from the response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error('[GenerateGameImage] No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    // If gameId is provided, upload to storage and update the game
    if (gameId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Convert base64 to blob
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Generate unique filename
      const fileName = `games/${gameId}-${Date.now()}.png`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('game-images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('[GenerateGameImage] Upload error:', uploadError);
        // Return the base64 image if upload fails
        return new Response(
          JSON.stringify({ 
            success: true, 
            imageUrl: imageData,
            uploaded: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('game-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update the game record
      const { error: updateError } = await supabase
        .from('games')
        .update({ image: publicUrl })
        .eq('id', gameId);

      if (updateError) {
        console.error('[GenerateGameImage] Update error:', updateError);
      }

      console.log(`[GenerateGameImage] Image uploaded and game updated: ${publicUrl}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl: publicUrl,
          uploaded: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return base64 image if no gameId provided
    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: imageData,
        uploaded: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[GenerateGameImage] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
