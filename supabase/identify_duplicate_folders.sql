-- SQL Script to identify duplicate folders without making any changes
-- This script is safe to run as it only performs SELECT operations

-- Identify duplicate folders based on name and parent_id
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
SELECT 
    id,
    name,
    parent_id,
    tenant_id,
    created_at,
    row_num
FROM folder_duplicates 
WHERE row_num > 1
ORDER BY name, parent_id, tenant_id, created_at;

-- Count how many duplicates we found
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
SELECT COUNT(*) AS duplicate_count 
FROM folder_duplicates 
WHERE row_num > 1;

-- Show duplicate groups with their originals
WITH folder_groups AS (
    SELECT 
        name,
        parent_id,
        tenant_id,
        COUNT(*) AS folder_count
    FROM folders
    GROUP BY name, parent_id, tenant_id
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
JOIN folder_groups g ON f.name = g.name AND 
                       (f.parent_id = g.parent_id OR (f.parent_id IS NULL AND g.parent_id IS NULL)) AND
                       (f.tenant_id = g.tenant_id OR (f.tenant_id IS NULL AND g.tenant_id IS NULL))
ORDER BY f.name, f.parent_id, f.tenant_id, f.created_at;

-- Check if any documents are linked to potential duplicate folders
WITH folder_groups AS (
    SELECT 
        name,
        parent_id,
        tenant_id
    FROM folders
    GROUP BY name, parent_id, tenant_id
    HAVING COUNT(*) > 1
)
SELECT 
    f.id AS folder_id,
    f.name AS folder_name,
    f.parent_id,
    f.tenant_id,
    COUNT(d.id) AS document_count
FROM folders f
JOIN folder_groups g ON f.name = g.name AND 
                       (f.parent_id = g.parent_id OR (f.parent_id IS NULL AND g.parent_id IS NULL)) AND
                       (f.tenant_id = g.tenant_id OR (f.tenant_id IS NULL AND g.tenant_id IS NULL))
LEFT JOIN documents d ON f.id = d.folder_id
GROUP BY f.id, f.name, f.parent_id, f.tenant_id
ORDER BY f.name, f.parent_id, f.tenant_id, document_count DESC;

-- Check if any folders have a parent_id pointing to a potential duplicate folder
WITH folder_groups AS (
    SELECT 
        name,
        parent_id,
        tenant_id
    FROM folders
    GROUP BY name, parent_id, tenant_id
    HAVING COUNT(*) > 1
)
SELECT 
    f.id AS folder_id,
    f.name AS folder_name,
    f.parent_id,
    f.tenant_id,
    COUNT(child.id) AS child_folder_count
FROM folders f
JOIN folder_groups g ON f.name = g.name AND 
                       (f.parent_id = g.parent_id OR (f.parent_id IS NULL AND g.parent_id IS NULL)) AND
                       (f.tenant_id = g.tenant_id OR (f.tenant_id IS NULL AND g.tenant_id IS NULL))
LEFT JOIN folders child ON f.id = child.parent_id
GROUP BY f.id, f.name, f.parent_id, f.tenant_id
ORDER BY f.name, f.parent_id, f.tenant_id, child_folder_count DESC;
