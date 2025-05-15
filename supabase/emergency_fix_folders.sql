-- EMERGENCY FIX FOR FOLDERS
-- Run this script directly in the Supabase SQL Editor to fix folder issues

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

-- 6. DISABLE RLS temporarily to see all folders
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;

-- 7. List all folders again (should show all folders now)
SELECT * FROM folders;

-- 8. Create a test folder for debugging
INSERT INTO folders (name, created_by, parent_id)
VALUES ('Test Folder From SQL', auth.uid(), NULL)
RETURNING *;

-- 9. Re-enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 10. Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;

-- 11. Create new, simpler policies
-- Allow users to select any folder (this is the key change)
CREATE POLICY "Allow users to view all folders"
  ON folders FOR SELECT
  USING (true);

-- Allow users to insert their own folders
CREATE POLICY "Allow users to insert their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own folders
CREATE POLICY "Allow users to update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = created_by);

-- Allow users to delete their own folders
CREATE POLICY "Allow users to delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = created_by);

-- 12. List all folders again to verify
SELECT * FROM folders;
