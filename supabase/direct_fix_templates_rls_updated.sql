-- IMMEDIATE FIX FOR TEMPLATES RLS ISSUES (UPDATED)
-- Run this script directly in the Supabase SQL Editor

-- 1. Make sure the templates table exists
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_template_url TEXT NOT NULL,
    placeholders JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on templates table
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies on templates table (including the ones with specific names)
DROP POLICY IF EXISTS "Users can view all templates" ON templates;
DROP POLICY IF EXISTS "Users can insert templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON templates;
DROP POLICY IF EXISTS "Users can update templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON templates;
DROP POLICY IF EXISTS "Users can delete templates" ON templates;
DROP POLICY IF EXISTS "Anyone can view templates" ON templates;
DROP POLICY IF EXISTS "Any authenticated user can insert templates" ON templates;
DROP POLICY IF EXISTS "Any authenticated user can update templates" ON templates;
DROP POLICY IF EXISTS "Any authenticated user can delete templates" ON templates;
DROP POLICY IF EXISTS "templates_select_policy" ON templates;
DROP POLICY IF EXISTS "templates_insert_policy" ON templates;
DROP POLICY IF EXISTS "templates_update_policy" ON templates;
DROP POLICY IF EXISTS "templates_delete_policy" ON templates;

-- 4. Create completely permissive policies for templates table with new names
CREATE POLICY "templates_select_policy_new" ON templates
    FOR SELECT USING (true);

CREATE POLICY "templates_insert_policy_new" ON templates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "templates_update_policy_new" ON templates
    FOR UPDATE USING (true);

CREATE POLICY "templates_delete_policy_new" ON templates
    FOR DELETE USING (true);

-- 5. Make sure the templates bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'templates'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('templates', 'templates', true);
  END IF;
END $$;

-- 6. Drop ALL existing policies on storage.objects for templates
DROP POLICY IF EXISTS "Allow public read access to templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to upload to templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to update templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to delete from templates" ON storage.objects;
DROP POLICY IF EXISTS "templates_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "templates_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "templates_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "templates_bucket_delete" ON storage.objects;

-- 7. Create completely permissive policies for templates bucket with new names
CREATE POLICY "templates_bucket_select_new" ON storage.objects
    FOR SELECT USING (bucket_id = 'templates');

CREATE POLICY "templates_bucket_insert_new" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'templates');

CREATE POLICY "templates_bucket_update_new" ON storage.objects
    FOR UPDATE USING (bucket_id = 'templates');

CREATE POLICY "templates_bucket_delete_new" ON storage.objects
    FOR DELETE USING (bucket_id = 'templates');

-- 8. Grant all permissions to anon and authenticated roles
GRANT ALL ON templates TO anon, authenticated;
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;

-- 9. Verify the policies
SELECT * FROM pg_policies WHERE tablename = 'templates';
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
