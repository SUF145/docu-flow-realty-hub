-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES folders(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Add folder_id to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id);

-- Create a root folder for each user function
CREATE OR REPLACE FUNCTION create_root_folder_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO folders (name, created_by)
    VALUES ('Root', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create root folder when a new user is created
DROP TRIGGER IF EXISTS create_root_folder_on_user_creation ON auth.users;
CREATE TRIGGER create_root_folder_on_user_creation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_root_folder_for_user();

-- Create RLS policies for folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Users can view their own folders
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
CREATE POLICY "Users can view their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = created_by);

-- Users can insert their own folders
DROP POLICY IF EXISTS "Users can insert their own folders" ON folders;
CREATE POLICY "Users can insert their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own folders
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
CREATE POLICY "Users can update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own folders
DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;
CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = created_by);

-- Update documents RLS policies to include folder access
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = created_by);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at column for folders
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON folders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to get all documents in a folder and its subfolders
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

-- Create function to move a folder to a new parent
CREATE OR REPLACE FUNCTION move_folder(folder_uuid UUID, new_parent_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    cycle_exists BOOLEAN;
BEGIN
    -- Check if the move would create a cycle
    WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = new_parent_uuid
        UNION ALL
        SELECT f.id FROM folders f
        JOIN folder_tree ft ON f.parent_id = ft.id
    )
    SELECT EXISTS(SELECT 1 FROM folder_tree WHERE id = folder_uuid) INTO cycle_exists;

    IF cycle_exists THEN
        RETURN FALSE;
    ELSE
        UPDATE folders SET parent_id = new_parent_uuid WHERE id = folder_uuid;
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a default root folder for existing users
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
