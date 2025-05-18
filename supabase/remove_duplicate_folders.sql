-- SQL Script to identify and remove duplicate folders
-- This script will:
-- 1. Identify duplicate folders based on name and parent_id
-- 2. Keep the oldest entry (or one with the most relationships)
-- 3. Delete the duplicates

-- First, let's create a temporary table to identify duplicates
CREATE TEMP TABLE duplicate_folders AS
WITH folder_duplicates AS (
    SELECT 
        id,
        name,
        parent_id,
        tenant_id,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY name, parent_id, tenant_id
            ORDER BY created_at ASC
        ) AS row_num
    FROM folders
)
SELECT * FROM folder_duplicates WHERE row_num > 1;

-- Count how many duplicates we found
SELECT COUNT(*) AS duplicate_count FROM duplicate_folders;

-- Show the duplicates for review
SELECT 
    d.id AS duplicate_id, 
    d.name AS duplicate_name,
    d.parent_id,
    d.tenant_id,
    d.created_at AS duplicate_created_at,
    o.id AS original_id,
    o.created_at AS original_created_at
FROM duplicate_folders d
JOIN folders o ON d.name = o.name AND 
                 (d.parent_id = o.parent_id OR (d.parent_id IS NULL AND o.parent_id IS NULL)) AND
                 (d.tenant_id = o.tenant_id OR (d.tenant_id IS NULL AND o.tenant_id IS NULL))
WHERE o.id NOT IN (SELECT id FROM duplicate_folders)
ORDER BY d.name, d.parent_id;

-- Check if any documents are linked to the duplicate folders
SELECT 
    d.id AS duplicate_folder_id,
    d.name AS folder_name,
    COUNT(doc.id) AS document_count
FROM duplicate_folders d
LEFT JOIN documents doc ON d.id = doc.folder_id
GROUP BY d.id, d.name
HAVING COUNT(doc.id) > 0;

-- BEGIN TRANSACTION - Uncomment when ready to execute
-- BEGIN;

-- Update any documents linked to duplicate folders to point to the original folders
WITH doc_updates AS (
    SELECT 
        doc.id AS document_id,
        d.id AS duplicate_folder_id,
        o.id AS original_folder_id
    FROM documents doc
    JOIN duplicate_folders d ON doc.folder_id = d.id
    JOIN folders o ON d.name = o.name AND 
                     (d.parent_id = o.parent_id OR (d.parent_id IS NULL AND o.parent_id IS NULL)) AND
                     (d.tenant_id = o.tenant_id OR (d.tenant_id IS NULL AND o.tenant_id IS NULL))
    WHERE o.id NOT IN (SELECT id FROM duplicate_folders)
)
UPDATE documents
SET folder_id = doc_updates.original_folder_id
FROM doc_updates
WHERE documents.id = doc_updates.document_id;

-- Update any folders that have a parent_id pointing to a duplicate folder
WITH folder_updates AS (
    SELECT 
        f.id AS folder_id,
        d.id AS duplicate_parent_id,
        o.id AS original_parent_id
    FROM folders f
    JOIN duplicate_folders d ON f.parent_id = d.id
    JOIN folders o ON d.name = o.name AND 
                     (d.parent_id = o.parent_id OR (d.parent_id IS NULL AND o.parent_id IS NULL)) AND
                     (d.tenant_id = o.tenant_id OR (d.tenant_id IS NULL AND o.tenant_id IS NULL))
    WHERE o.id NOT IN (SELECT id FROM duplicate_folders)
)
UPDATE folders
SET parent_id = folder_updates.original_parent_id
FROM folder_updates
WHERE folders.id = folder_updates.folder_id;

-- Delete the duplicate folders
DELETE FROM folders
WHERE id IN (SELECT id FROM duplicate_folders);

-- Count how many folders remain after deletion
SELECT COUNT(*) AS remaining_folders FROM folders;

-- COMMIT TRANSACTION - Uncomment when ready to execute
-- COMMIT;

-- Clean up
DROP TABLE IF EXISTS duplicate_folders;

-- Verify no duplicates remain
WITH folder_duplicates AS (
    SELECT 
        id,
        name,
        parent_id,
        tenant_id,
        ROW_NUMBER() OVER (
            PARTITION BY name, parent_id, tenant_id
            ORDER BY created_at ASC
        ) AS row_num
    FROM folders
)
SELECT COUNT(*) AS remaining_duplicates 
FROM folder_duplicates 
WHERE row_num > 1;
