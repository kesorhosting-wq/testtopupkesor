-- Create storage bucket for AI-generated game images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('game-images', 'game-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Game images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'game-images');

-- Create policy for authenticated users to upload (admin will use service role)
CREATE POLICY "Service role can upload game images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'game-images');

CREATE POLICY "Service role can update game images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'game-images');

CREATE POLICY "Service role can delete game images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'game-images');