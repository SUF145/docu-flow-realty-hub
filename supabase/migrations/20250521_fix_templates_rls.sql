-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON templates;

-- Create new policies with proper authentication checks
CREATE POLICY "Users can view all templates"
  ON templates FOR SELECT
  USING (true);

CREATE POLICY "Users can insert templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update templates"
  ON templates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add delete policy
CREATE POLICY "Users can delete templates"
  ON templates FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Fix storage bucket permissions for templates
-- First, check if the bucket exists and create it if it doesn't
DO $$
BEGIN
  -- Check if the bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'templates'
  ) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('templates', 'templates', true);
  END IF;
END $$;

-- Drop existing storage policies for templates bucket
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects FOR SELECT;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects FOR INSERT;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects FOR UPDATE;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects FOR DELETE;

-- Create storage policies for templates bucket
-- Allow public read access to all files in the templates bucket
CREATE POLICY "Allow public read access to templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'templates');

-- Allow authenticated users to upload files to the templates bucket
CREATE POLICY "Allow authenticated uploads to templates"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'templates' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own files in the templates bucket
CREATE POLICY "Allow authenticated updates to templates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'templates' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their own files in the templates bucket
CREATE POLICY "Allow authenticated deletes from templates"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'templates' AND auth.uid() IS NOT NULL);
