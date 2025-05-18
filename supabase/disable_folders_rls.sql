-- Disable RLS for folders table to allow all operations
-- This is a temporary fix to allow folder creation during onboarding

-- Disable RLS on folders table
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'folders';

-- Create a test folder to verify it works
INSERT INTO folders (name, description, created_by)
VALUES ('Test Folder', 'Created after disabling RLS', auth.uid())
RETURNING *;

-- List all folders to verify
SELECT * FROM folders;

-- Note: After testing is complete, you can re-enable RLS with:
-- ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
-- And then create appropriate policies
