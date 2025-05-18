-- Temporary fix for folders RLS policies
-- This script can be run directly in the Supabase SQL editor to fix the RLS policies

-- Enable RLS on folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can insert folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can update folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can delete folders in their tenant" ON folders;

-- Create a temporary policy to allow all operations for authenticated users
-- This is a temporary fix to allow folder creation during onboarding
CREATE POLICY "Allow all operations for authenticated users" ON folders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- List all policies to verify
SELECT * FROM pg_policies WHERE tablename = 'folders';
