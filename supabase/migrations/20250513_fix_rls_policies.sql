-- Fix RLS policies to avoid infinite recursion and allow all operations for authenticated users

-- First, drop all existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON documents;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON document_approvals;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON comments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON activity_logs;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON roles;

-- Create new policies with both USING and WITH CHECK clauses
-- Documents table
CREATE POLICY "Allow all operations for authenticated users" ON documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Document approvals table
CREATE POLICY "Allow all operations for authenticated users" ON document_approvals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comments table
CREATE POLICY "Allow all operations for authenticated users" ON comments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Activity logs table
CREATE POLICY "Allow all operations for authenticated users" ON activity_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Profiles table
CREATE POLICY "Allow all operations for authenticated users" ON profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Roles table
CREATE POLICY "Allow all operations for authenticated users" ON roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  -- Check if the bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'documents'
  ) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true);
    
    -- Create policy to allow authenticated users to upload files
    INSERT INTO storage.policies (name, definition, bucket_id)
    VALUES (
      'Allow authenticated users to upload files',
      '{"bucket_id":"documents","owner":null,"public":true,"read":true,"write":true}',
      'documents'
    );
  END IF;
END $$;
