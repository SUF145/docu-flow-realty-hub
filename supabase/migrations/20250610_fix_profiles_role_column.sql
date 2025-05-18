-- Add role column to profiles table if it doesn't exist
DO $$
BEGIN
    -- Check if the role column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'role'
    ) THEN
        -- Add the role column
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
        
        -- Log the change
        RAISE NOTICE 'Added role column to profiles table';
    ELSE
        RAISE NOTICE 'Role column already exists in profiles table';
    END IF;
END $$;
