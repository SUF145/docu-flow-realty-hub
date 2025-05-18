-- Check the schema of the documents table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;

-- Check if there are any documents in the table
SELECT COUNT(*) FROM documents;

-- Check the schema of the folders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'folders'
ORDER BY ordinal_position;

-- Check if there are any folders in the table
SELECT COUNT(*) FROM folders;

-- List all tables in the public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
