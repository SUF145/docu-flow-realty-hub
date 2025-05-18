-- SQL Script to fix specific duplicate folders seen in the screenshot
-- This script will:
-- 1. Identify specific duplicates like "Acquisitions", "Active Leases", etc.
-- 2. Keep one entry per name and delete the others
-- 3. Update all references to point to the kept entry

-- First, let's identify the specific duplicates we saw in the screenshot
SELECT 
    name,
    COUNT(*) AS count
FROM folders
WHERE name IN ('Acquisitions', 'Active Leases', 'Active Listings', 'Active Projects')
GROUP BY name
ORDER BY name;

-- Show the details of these specific duplicates
SELECT 
    id,
    name,
    parent_id,
    tenant_id,
    created_at,
    created_by
FROM folders
WHERE name IN ('Acquisitions', 'Active Leases', 'Active Listings', 'Active Projects')
ORDER BY name, created_at;

-- Create a temporary table to store the mapping of duplicate folders to their originals
CREATE TEMP TABLE specific_folder_mapping AS
WITH specific_duplicates AS (
    SELECT 
        id,
        name,
        ROW_NUMBER() OVER (
            PARTITION BY name
            ORDER BY created_at ASC
        ) AS row_num
    FROM folders
    WHERE name IN ('Acquisitions', 'Active Leases', 'Active Listings', 'Active Projects')
)
SELECT 
    d.id AS duplicate_id,
    o.id AS original_id,
    d.name
FROM specific_duplicates d
JOIN (
    SELECT id, name
    FROM specific_duplicates
    WHERE row_num = 1
) o ON d.name = o.name
WHERE d.row_num > 1;

-- Show the mapping for review
SELECT * FROM specific_folder_mapping;

-- Check if any documents are linked to these specific duplicate folders
SELECT 
    fm.duplicate_id,
    fm.original_id,
    fm.name AS folder_name,
    COUNT(d.id) AS document_count
FROM specific_folder_mapping fm
LEFT JOIN documents d ON fm.duplicate_id = d.folder_id
GROUP BY fm.duplicate_id, fm.original_id, fm.name
ORDER BY fm.name, document_count DESC;

-- Check if any folders have a parent_id pointing to these specific duplicate folders
SELECT 
    fm.duplicate_id,
    fm.original_id,
    fm.name AS folder_name,
    COUNT(child.id) AS child_folder_count
FROM specific_folder_mapping fm
LEFT JOIN folders child ON fm.duplicate_id = child.parent_id
GROUP BY fm.duplicate_id, fm.original_id, fm.name
ORDER BY fm.name, child_folder_count DESC;

-- BEGIN TRANSACTION - Uncomment when ready to execute
-- BEGIN;

-- Update any documents linked to these specific duplicate folders
UPDATE documents
SET folder_id = fm.original_id
FROM specific_folder_mapping fm
WHERE documents.folder_id = fm.duplicate_id;

-- Update any folders that have a parent_id pointing to these specific duplicate folders
UPDATE folders
SET parent_id = fm.original_id
FROM specific_folder_mapping fm
WHERE folders.parent_id = fm.duplicate_id;

-- Delete these specific duplicate folders
DELETE FROM folders
WHERE id IN (SELECT duplicate_id FROM specific_folder_mapping);

-- Count how many folders remain after deletion
SELECT COUNT(*) AS remaining_folders FROM folders;

-- Verify no duplicates remain for these specific folder names
SELECT 
    name,
    COUNT(*) AS count
FROM folders
WHERE name IN ('Acquisitions', 'Active Leases', 'Active Listings', 'Active Projects')
GROUP BY name
ORDER BY name;

-- COMMIT TRANSACTION - Uncomment when ready to execute
-- COMMIT;

-- Clean up
DROP TABLE IF EXISTS specific_folder_mapping;
