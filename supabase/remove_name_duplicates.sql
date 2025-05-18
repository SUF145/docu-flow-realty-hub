-- SQL Script to identify and remove folders with duplicate names
-- This script will:
-- 1. Identify folders with the same name (regardless of parent_id)
-- 2. Keep one entry per name (the oldest one)
-- 3. Update references and delete duplicates

-- First, let's identify folders with duplicate names
WITH name_duplicates AS (
    SELECT 
        id,
        name,
        parent_id,
        tenant_id,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY name
            ORDER BY created_at ASC
        ) AS row_num
    FROM folders
)
SELECT 
    id,
    name,
    parent_id,
    tenant_id,
    created_at,
    row_num
FROM name_duplicates 
WHERE row_num > 1
ORDER BY name, created_at;

-- Count how many duplicates we found by name
WITH name_duplicates AS (
    SELECT 
        name,
        COUNT(*) AS name_count
    FROM folders
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) AS duplicate_name_count,
    SUM(name_count) AS total_duplicate_folders
FROM name_duplicates;

-- Show the duplicate groups with their originals
WITH name_groups AS (
    SELECT 
        name,
        COUNT(*) AS folder_count
    FROM folders
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT 
    f.id,
    f.name,
    f.parent_id,
    f.tenant_id,
    f.created_at,
    f.created_by,
    g.folder_count
FROM folders f
JOIN name_groups g ON f.name = g.name
ORDER BY f.name, f.created_at;

-- Create a temporary table to store the mapping of duplicate folders to their originals
CREATE TEMP TABLE folder_mapping AS
WITH name_duplicates AS (
    SELECT 
        id,
        name,
        ROW_NUMBER() OVER (
            PARTITION BY name
            ORDER BY created_at ASC
        ) AS row_num
    FROM folders
)
SELECT 
    d.id AS duplicate_id,
    o.id AS original_id
FROM name_duplicates d
JOIN (
    SELECT id, name
    FROM name_duplicates
    WHERE row_num = 1
) o ON d.name = o.name
WHERE d.row_num > 1;

-- Show the mapping for review
SELECT * FROM folder_mapping;

-- Check if any documents are linked to the duplicate folders
SELECT 
    fm.duplicate_id,
    fm.original_id,
    f.name AS folder_name,
    COUNT(d.id) AS document_count
FROM folder_mapping fm
JOIN folders f ON fm.duplicate_id = f.id
LEFT JOIN documents d ON fm.duplicate_id = d.folder_id
GROUP BY fm.duplicate_id, fm.original_id, f.name
HAVING COUNT(d.id) > 0;

-- Check if any folders have a parent_id pointing to a duplicate folder
SELECT 
    fm.duplicate_id,
    fm.original_id,
    f.name AS folder_name,
    COUNT(child.id) AS child_folder_count
FROM folder_mapping fm
JOIN folders f ON fm.duplicate_id = f.id
LEFT JOIN folders child ON fm.duplicate_id = child.parent_id
GROUP BY fm.duplicate_id, fm.original_id, f.name
HAVING COUNT(child.id) > 0;

-- BEGIN TRANSACTION - Uncomment when ready to execute
-- BEGIN;

-- Update any documents linked to duplicate folders to point to the original folders
UPDATE documents
SET folder_id = fm.original_id
FROM folder_mapping fm
WHERE documents.folder_id = fm.duplicate_id;

-- Update any folders that have a parent_id pointing to a duplicate folder
UPDATE folders
SET parent_id = fm.original_id
FROM folder_mapping fm
WHERE folders.parent_id = fm.duplicate_id;

-- Delete the duplicate folders
DELETE FROM folders
WHERE id IN (SELECT duplicate_id FROM folder_mapping);

-- Count how many folders remain after deletion
SELECT COUNT(*) AS remaining_folders FROM folders;

-- COMMIT TRANSACTION - Uncomment when ready to execute
-- COMMIT;

-- Clean up
DROP TABLE IF EXISTS folder_mapping;

-- Verify no duplicates remain
WITH name_duplicates AS (
    SELECT 
        name,
        COUNT(*) AS name_count
    FROM folders
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT COUNT(*) AS remaining_duplicate_names FROM name_duplicates;
