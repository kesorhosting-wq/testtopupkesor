import React, { useState } from 'react';
import { Wand2, Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIGameImageGeneratorProps {
  gameName: string;
  gameId: string;
  currentImage?: string;
  onImageGenerated: (imageUrl: string) => void;
  variant?: 'button' | 'icon';
}

const AIGameImageGenerator: React.FC<AIGameImageGeneratorProps> = ({
  gameName,
  gameId,
  currentImage,
  onImageGenerated,
  variant = 'button'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!gameName.trim()) {
      toast({ 
        title: "Game name required", 
        description: "Please enter a game name first",
        variant: "destructive" 
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      toast({ 
        title: "🎨 Generating image...", 
        description: `Creating icon for ${gameName}` 
      });

      const { data, error } = await supabase.functions.invoke('generate-game-image', {
        body: { gameName, gameId }
      });

      if (error) throw error;

      if (data?.success && data?.imageUrl) {
        onImageGenerated(data.imageUrl);
        toast({ 
          title: "✨ Image generated!", 
          description: data.uploaded 
            ? "Image saved and game updated" 
            : "Image ready to use"
        });
      } else {
        throw new Error(data?.error || 'Failed to generate image');
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast({ 
        title: "Generation failed", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="border-purple-500/50 text-purple-600 hover:bg-purple-500/10"
        title="Generate AI image"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wand2 className="w-4 h-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="border-purple-500/50 text-purple-600 hover:bg-purple-500/10 gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Wand2 className="w-4 h-4" />
          AI Generate
        </>
      )}
    </Button>
  );
};

// Bulk generator component for generating all missing images
export const AIBulkImageGenerator: React.FC<{
  games: Array<{ id: string; name: string; image: string }>;
  onComplete: () => void;
}> = ({ games, onComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const gamesWithoutImages = games.filter(g => !g.image || g.image.trim() === '');

  const handleBulkGenerate = async () => {
    if (gamesWithoutImages.length === 0) {
      toast({ title: "All games have images!", description: "Nothing to generate" });
      return;
    }

    const confirmed = window.confirm(
      `Generate AI images for ${gamesWithoutImages.length} games? This may take a few minutes.`
    );
    
    if (!confirmed) return;

    setIsGenerating(true);
    setProgress({ current: 0, total: gamesWithoutImages.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < gamesWithoutImages.length; i++) {
      const game = gamesWithoutImages[i];
      setProgress({ current: i + 1, total: gamesWithoutImages.length });

      try {
        const { data, error } = await supabase.functions.invoke('generate-game-image', {
          body: { gameName: game.name, gameId: game.id }
        });

        if (error || !data?.success) {
          failCount++;
          console.error(`Failed to generate for ${game.name}:`, error || data?.error);
        } else {
          successCount++;
        }
      } catch (err) {
        failCount++;
        console.error(`Error generating for ${game.name}:`, err);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsGenerating(false);
    
    toast({
      title: "Bulk generation complete!",
      description: `Generated ${successCount} images. ${failCount > 0 ? `${failCount} failed.` : ''}`,
    });

    onComplete();
  };

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Image Generator</h3>
            <p className="text-xs text-muted-foreground">
              {gamesWithoutImages.length} games without images
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleBulkGenerate}
          disabled={isGenerating || gamesWithoutImages.length === 0}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating {progress.current}/{progress.total}...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate All Missing
            </>
          )}
        </Button>
      </div>
      
      {isGenerating && (
        <div className="mt-3">
          <div className="w-full bg-purple-500/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIGameImageGenerator;
