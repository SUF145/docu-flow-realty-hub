-- Create more permissive RLS policies for folders table
-- This allows authenticated users to perform all operations on folders

-- Enable RLS on folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can insert folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can update folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can delete folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON folders;

-- Create a single policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON folders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'folders';

-- Create a test folder to verify it works
INSERT INTO folders (name, description, created_by)
VALUES ('Test Folder', 'Created with permissive RLS', auth.uid())
RETURNING *;

-- List all folders to verify
SELECT * FROM folders;
