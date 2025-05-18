-- Create a custom RPC function to bypass RLS for folder creation
-- This function allows creating folders without being affected by RLS policies

-- Create the function
CREATE OR REPLACE FUNCTION create_folder_bypass_rls(
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_parent_id UUID DEFAULT NULL,
  p_created_by UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the function creator
AS $$
DECLARE
  v_folder_id UUID;
  v_result JSONB;
BEGIN
  -- Insert the folder
  INSERT INTO folders (
    name,
    description,
    parent_id,
    created_by,
    tenant_id
  ) VALUES (
    p_name,
    p_description,
    p_parent_id,
    p_created_by,
    p_tenant_id
  )
  RETURNING id INTO v_folder_id;
  
  -- Get the created folder
  SELECT row_to_json(f)::jsonb INTO v_result
  FROM folders f
  WHERE f.id = v_folder_id;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_folder_bypass_rls(TEXT, TEXT, UUID, UUID, UUID) TO authenticated;

-- Test the function
SELECT create_folder_bypass_rls(
  'Test Folder via RPC',
  'Created using RPC function to bypass RLS',
  NULL,
  auth.uid(),
  NULL
);
