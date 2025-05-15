-- DIRECT FIX FOR FOLDERS ISSUES
-- Run this script directly in the Supabase SQL Editor

-- 1. Check if the folders table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'folders'
);

-- 2. Check the structure of the folders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'folders';

-- 3. Check if RLS is enabled on the folders table
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'folders';

-- 4. Check existing RLS policies on the folders table
SELECT * FROM pg_policies WHERE tablename = 'folders';

-- 5. List all folders in the database
SELECT * FROM folders;

-- 6. Fix RLS policies for the folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;

-- Create new policies with proper authentication checks
CREATE POLICY "Users can view their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = created_by);

-- 7. Create a default root folder for each user if they don't have one
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        IF NOT EXISTS (SELECT 1 FROM folders WHERE created_by = user_record.id AND parent_id IS NULL) THEN
            INSERT INTO folders (name, created_by)
            VALUES ('Root', user_record.id);
        END IF;
    END LOOP;
END $$;

-- 8. Check if the update_updated_at_column function exists
SELECT EXISTS (
   SELECT FROM pg_proc
   WHERE proname = 'update_updated_at_column'
);

-- 9. Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Check if the trigger exists
SELECT EXISTS (
   SELECT FROM pg_trigger
   WHERE tgname = 'update_folders_updated_at'
);

-- 11. Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON folders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 12. Check if the get_documents_in_folder_tree function exists
SELECT EXISTS (
   SELECT FROM pg_proc
   WHERE proname = 'get_documents_in_folder_tree'
);

-- 13. Create the get_documents_in_folder_tree function if it doesn't exist
CREATE OR REPLACE FUNCTION get_documents_in_folder_tree(folder_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    file_path TEXT,
    file_size INTEGER,
    file_type TEXT,
    status TEXT,
    created_by UUID,
    document_type_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    folder_id UUID
) AS $$
WITH RECURSIVE folder_tree AS (
    SELECT id FROM folders WHERE id = folder_uuid
    UNION ALL
    SELECT f.id FROM folders f
    JOIN folder_tree ft ON f.parent_id = ft.id
)
SELECT 
    d.id,
    d.title,
    d.description,
    d.file_path,
    COALESCE(d.file_size, 0)::INTEGER,
    d.file_type,
    d.status,
    d.created_by,
    d.document_type_id,
    d.metadata,
    d.created_at,
    d.updated_at,
    d.folder_id
FROM documents d
JOIN folder_tree ft ON d.folder_id = ft.id
WHERE d.folder_id IN (SELECT id FROM folder_tree);
$$ LANGUAGE SQL;

-- 14. List all folders again to verify
SELECT * FROM folders;
