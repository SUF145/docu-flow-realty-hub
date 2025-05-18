-- Create a simpler version of the get_documents_in_folder_tree function

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_documents_in_folder_tree(UUID);
DROP FUNCTION IF EXISTS simple_get_documents_in_folder_tree(UUID);

-- Create a simpler function that just gets the documents in the specified folder
CREATE OR REPLACE FUNCTION simple_get_documents_in_folder_tree(folder_uuid UUID)
RETURNS SETOF documents AS $$
BEGIN
    -- Just get documents in the specified folder
    RETURN QUERY
    SELECT * FROM documents
    WHERE folder_id = folder_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION simple_get_documents_in_folder_tree(UUID) TO authenticated;

-- Test the function with a folder ID
SELECT * FROM simple_get_documents_in_folder_tree('00000000-0000-0000-0000-000000000000');

-- Create a function to get all subfolders of a folder
CREATE OR REPLACE FUNCTION get_subfolders(parent_folder_uuid UUID)
RETURNS SETOF folders AS $$
BEGIN
    -- Get all direct child folders
    RETURN QUERY
    SELECT * FROM folders
    WHERE parent_id = parent_folder_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_subfolders(UUID) TO authenticated;

-- Test the function with a folder ID
SELECT * FROM get_subfolders('00000000-0000-0000-0000-000000000000');
