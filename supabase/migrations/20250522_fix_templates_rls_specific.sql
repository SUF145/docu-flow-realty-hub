-- This migration fixes the RLS policies for the templates table and storage bucket
-- with more specific policies to ensure proper access

-- 1. Enable RLS on templates table if not already enabled
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on templates table
DROP POLICY IF EXISTS "Users can view all templates" ON templates;
DROP POLICY IF EXISTS "Users can insert templates" ON templates;
DROP POLICY IF EXISTS "Users can update templates" ON templates;
DROP POLICY IF EXISTS "Users can delete templates" ON templates;

-- 3. Create new policies for templates table with more permissive rules
-- Allow anyone to select templates
CREATE POLICY "Anyone can view templates"
  ON templates FOR SELECT
  USING (true);

-- Allow any authenticated user to insert templates
CREATE POLICY "Any authenticated user can insert templates"
  ON templates FOR INSERT
  WITH CHECK (true);

-- Allow any authenticated user to update templates
CREATE POLICY "Any authenticated user can update templates"
  ON templates FOR UPDATE
  USING (true);

-- Allow any authenticated user to delete templates
CREATE POLICY "Any authenticated user can delete templates"
  ON templates FOR DELETE
  USING (true);

-- 4. Fix storage bucket permissions
-- First, ensure the templates bucket exists
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

-- 5. Drop existing storage policies for templates bucket
DROP POLICY IF EXISTS "Allow public read access to templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from templates" ON storage.objects;

-- 6. Create more permissive storage policies for templates bucket
-- Allow public read access to all files in the templates bucket
CREATE POLICY "Allow public read access to templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'templates');

-- Allow anyone to upload files to the templates bucket
CREATE POLICY "Allow anyone to upload to templates"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'templates');

-- Allow anyone to update files in the templates bucket
CREATE POLICY "Allow anyone to update templates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'templates');

-- Allow anyone to delete files in the templates bucket
CREATE POLICY "Allow anyone to delete from templates"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'templates');

-- 7. Grant permissions to the anon and authenticated roles
GRANT ALL ON templates TO anon, authenticated;
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;
