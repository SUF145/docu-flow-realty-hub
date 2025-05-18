-- Fix RLS policies for folders table to allow folder creation during onboarding
-- This migration updates the RLS policies to ensure users can create folders with their tenant_id

-- Enable RLS on folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can insert folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can update folders in their tenant" ON folders;
DROP POLICY IF EXISTS "Users can delete folders in their tenant" ON folders;

-- Create more permissive policies for folder operations
-- Allow users to view folders in their tenant or created by them
CREATE POLICY "Users can view folders in their tenant or created by them"
  ON folders FOR SELECT
  USING (
    (tenant_id IS NULL) OR
    (auth.uid() = created_by) OR
    (tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
  );

-- Allow users to insert folders with their tenant_id
CREATE POLICY "Users can insert folders with their tenant_id"
  ON folders FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    (
      tenant_id IS NULL OR
      tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to update folders they created in their tenant
CREATE POLICY "Users can update folders they created in their tenant"
  ON folders FOR UPDATE
  USING (
    auth.uid() = created_by AND
    (
      tenant_id IS NULL OR
      tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to delete folders they created in their tenant
CREATE POLICY "Users can delete folders they created in their tenant"
  ON folders FOR DELETE
  USING (
    auth.uid() = created_by AND
    (
      tenant_id IS NULL OR
      tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Create a function to check if a user belongs to a tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(user_id UUID, tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND tenant_id = tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get a user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
  tenant UUID;
BEGIN
  SELECT tenant_id INTO tenant FROM profiles WHERE id = user_id;
  RETURN tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
