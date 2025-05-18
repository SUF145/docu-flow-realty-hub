-- SQL Script to fix folder tenant_ids
-- This script will ensure all folders have the correct tenant_id

-- First, let's identify folders with NULL tenant_id
SELECT COUNT(*) AS folders_with_null_tenant_id
FROM folders
WHERE tenant_id IS NULL;

-- Show folders with NULL tenant_id
SELECT id, name, parent_id, created_by, created_at
FROM folders
WHERE tenant_id IS NULL
ORDER BY created_at;

-- Identify users and their tenant_ids from profiles
SELECT 
    p.id AS user_id,
    p.tenant_id,
    COUNT(f.id) AS folder_count
FROM profiles p
LEFT JOIN folders f ON p.id = f.created_by
GROUP BY p.id, p.tenant_id
ORDER BY folder_count DESC;

-- BEGIN TRANSACTION - Uncomment when ready to execute
-- BEGIN;

-- Update folders with NULL tenant_id based on the user's tenant_id in profiles
UPDATE folders
SET tenant_id = p.tenant_id
FROM profiles p
WHERE folders.created_by = p.id
AND folders.tenant_id IS NULL
AND p.tenant_id IS NOT NULL;

-- For folders that still have NULL tenant_id, try to get tenant_id from parent folder
WITH RECURSIVE folder_hierarchy AS (
    -- Start with folders that have a tenant_id
    SELECT id, name, parent_id, tenant_id, 0 AS level
    FROM folders
    WHERE tenant_id IS NOT NULL
    
    UNION ALL
    
    -- Add folders with NULL tenant_id that have a parent with a tenant_id
    SELECT f.id, f.name, f.parent_id, fh.tenant_id, fh.level + 1
    FROM folders f
    JOIN folder_hierarchy fh ON f.parent_id = fh.id
    WHERE f.tenant_id IS NULL
)
UPDATE folders
SET tenant_id = fh.tenant_id
FROM folder_hierarchy fh
WHERE folders.id = fh.id
AND folders.tenant_id IS NULL;

-- For any remaining folders with NULL tenant_id, use the most common tenant_id
WITH most_common_tenant AS (
    SELECT tenant_id, COUNT(*) AS tenant_count
    FROM folders
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id
    ORDER BY tenant_count DESC
    LIMIT 1
)
UPDATE folders
SET tenant_id = (SELECT tenant_id FROM most_common_tenant)
WHERE tenant_id IS NULL;

-- Verify all folders now have a tenant_id
SELECT COUNT(*) AS folders_with_null_tenant_id
FROM folders
WHERE tenant_id IS NULL;

-- COMMIT TRANSACTION - Uncomment when ready to execute
-- COMMIT;

-- Show the distribution of folders by tenant_id
SELECT 
    tenant_id,
    COUNT(*) AS folder_count
FROM folders
GROUP BY tenant_id
ORDER BY folder_count DESC;
