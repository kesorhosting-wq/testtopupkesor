import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { handleApiError, isValidImageFile, isValidFileSize, MAX_FILE_SIZE } from '@/lib/errorHandler';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
  aspectRatio?: 'square' | 'wide' | 'tall';
  placeholder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  folder = 'general',
  className,
  aspectRatio = 'square',
  placeholder = 'Upload Image'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    wide: 'aspect-video',
    tall: 'aspect-[3/4]'
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (client-side check)
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size
    if (!isValidFileSize(file)) {
      toast({ 
        title: 'File too large', 
        description: `Maximum file size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
        variant: 'destructive' 
      });
      return;
    }

    // Validate file content by checking magic numbers
    const isValidImage = await isValidImageFile(file);
    if (!isValidImage) {
      toast({ 
        title: 'Invalid image file', 
        description: 'The file does not appear to be a valid image',
        variant: 'destructive' 
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast({ title: 'Image uploaded!' });
    } catch (error: unknown) {
      const errorMessage = handleApiError(error, 'ImageUpload');
      toast({ 
        title: 'Upload failed', 
        description: errorMessage,
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    // Extract file path from URL
    const urlParts = value.split('/site-assets/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from('site-assets').remove([filePath]);
    }
    
    onChange('');
    toast({ title: 'Image removed' });
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      
      <div 
        className={cn(
          'relative rounded-xl border-2 border-dashed border-gold/50 bg-secondary/30 overflow-hidden transition-colors hover:border-gold cursor-pointer',
          aspectClasses[aspectRatio]
        )}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img 
              src={value} 
              alt="Uploaded" 
              className="w-full h-full object-cover"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                <span className="text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gold" />
                </div>
                <span className="text-sm font-medium">{placeholder}</span>
                <span className="text-xs">Click to upload</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
