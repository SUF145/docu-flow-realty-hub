-- Fix the get_documents_in_folder function to properly handle folder navigation

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_documents_in_folder(UUID);

-- Create the updated function
CREATE OR REPLACE FUNCTION get_documents_in_folder(folder_uuid UUID)
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
    -- Get all documents in the specified folder
    RETURN QUERY
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
    WHERE d.folder_id = folder_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_documents_in_folder(UUID) TO authenticated;

-- Test the function with a folder ID
SELECT * FROM get_documents_in_folder('00000000-0000-0000-0000-000000000000');

-- List all folders to verify
SELECT * FROM folders LIMIT 10;
