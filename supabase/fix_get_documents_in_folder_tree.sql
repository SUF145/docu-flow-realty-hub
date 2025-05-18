-- Fix the get_documents_in_folder_tree function to properly handle subfolders

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_documents_in_folder_tree(UUID, UUID);
DROP FUNCTION IF EXISTS get_documents_in_folder_tree(UUID);

-- Create the updated function
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
    folder_id UUID,
    tenant_id UUID
) AS $$
BEGIN
    -- First, get all folders in the tree
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        -- Start with the specified folder
        SELECT folders.id AS folder_id FROM folders WHERE folders.id = folder_uuid
        UNION ALL
        -- Add all child folders
        SELECT f.id AS folder_id FROM folders f
        JOIN folder_tree ft ON f.parent_id = ft.folder_id
    )
    -- Get all documents in the folder tree
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
        d.folder_id,
        d.tenant_id
    FROM documents d
    WHERE d.folder_id IN (SELECT folder_id FROM folder_tree);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_documents_in_folder_tree(UUID) TO authenticated;

-- Test the function with a folder ID
SELECT * FROM get_documents_in_folder_tree('00000000-0000-0000-0000-000000000000');

-- List all folders to verify
SELECT * FROM folders LIMIT 10;
