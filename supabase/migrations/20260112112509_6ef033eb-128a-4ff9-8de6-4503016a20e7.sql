-- Add use_sandbox column to api_configurations table
ALTER TABLE public.api_configurations
ADD COLUMN IF NOT EXISTS use_sandbox boolean DEFAULT true;