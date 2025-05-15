-- Fix RLS policies for folders table
-- This migration updates the RLS policies to ensure users can see their own folders

-- Enable RLS on folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;

-- Create new policies with proper authentication checks
CREATE POLICY "Users can view their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = created_by);

-- Create a default root folder for each user if they don't have one
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

-- List all folders to verify
SELECT * FROM folders;
