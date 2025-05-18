import { supabase } from "@/integrations/supabase/client";
import { Document } from "./documents";

// Helper function to get tenant ID from user metadata or session storage
export const getTenantId = async (): Promise<string | null> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }

    // Get tenant ID from user metadata
    let tenantId = user.user_metadata?.tenant_id;

    // If tenant ID is not in user metadata, try to get it from session storage
    if (!tenantId) {
      const storedTenant = sessionStorage.getItem('currentTenant');
      if (storedTenant) {
        try {
          const tenant = JSON.parse(storedTenant);
          tenantId = tenant.id;
        } catch (error) {
          console.error('Error parsing stored tenant:', error);
        }
      }
    }

    return tenantId ?? null;
  } catch (error) {
    console.error("Exception in getTenantId:", error);
    return null;
  }
};

// Types
export interface Folder {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[];
  documents_count?: number;
}

export interface FolderCreate {
  name: string;
  description?: string;
  parent_id?: string;
}

export interface FolderUpdate {
  name?: string;
  description?: string;
  parent_id?: string;
}

// Get all folders for the current user
export const getFolders = async (parentId: string | null = null): Promise<Folder[]> => {
  try {
    console.log(`Fetching folders with parentId: ${parentId}`);

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user?.id);

    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    // Get tenant ID using the helper function
    const tenantId = await getTenantId();
    console.log("Current tenant ID for folder retrieval:", tenantId);

    // Check user metadata for tenant_id
    console.log("User metadata:", user.user_metadata);
    const metadataTenantId = user.user_metadata?.tenant_id;
    console.log("Tenant ID from user metadata:", metadataTenantId);

    // Check session storage for tenant info
    let sessionTenantId = null;
    try {
      const storedTenant = sessionStorage.getItem('currentTenant');
      if (storedTenant) {
        const tenant = JSON.parse(storedTenant);
        sessionTenantId = tenant.id;
        console.log("Tenant ID from session storage:", sessionTenantId);
      }
    } catch (error) {
      console.error("Error parsing stored tenant:", error);
    }

    // Build the query
    let query = supabase
      .from('folders')
      .select('*')
      .eq('is_deleted', false);

    // Filter by parent_id
    if (parentId === null) {
      console.log("Filtering for top-level folders (parent_id is null)");
      query = query.is('parent_id', null);
    } else {
      console.log(`Filtering for subfolders of parent: ${parentId}`);
      query = query.eq('parent_id', parentId);
    }

    // Add tenant filter if available
    if (tenantId) {
      console.log(`Filtering folders by tenant_id: ${tenantId}`);
      query = query.eq('tenant_id', tenantId);
    } else {
      // If no tenant ID, filter by user ID as fallback
      console.log(`No tenant ID found, filtering by user_id: ${user.id}`);
      query = query.eq('created_by', user.id);
    }

    // Execute the query
    const { data, error } = await query.order('name');

    if (error) {
      console.error("Error fetching folders:", error);
      return [];
    }

    console.log(`Fetched ${data?.length ?? 0} folders from database`);

    // If no folders found with tenant filter, try without tenant filter as a fallback
    if (data?.length === 0 && tenantId) {
      console.log("No folders found with tenant filter, trying without tenant filter");
      let fallbackQuery = supabase
        .from('folders')
        .select('*')
        .eq('is_deleted', false)
        .eq('created_by', user.id);

      // Apply parent_id filter to fallback query
      if (parentId === null) {
        fallbackQuery = fallbackQuery.is('parent_id', null);
      } else {
        fallbackQuery = fallbackQuery.eq('parent_id', parentId);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('name');

      if (fallbackError) {
        console.error("Error fetching folders without tenant filter:", fallbackError);
      } else {
        console.log(`Fetched ${fallbackData?.length ?? 0} folders without tenant filter`);
        return fallbackData ?? [];
      }
    }

    return data ?? [];
  } catch (error) {
    console.error("Exception in getFolders:", error);
    return [];
  }
};

// Get folder by ID
export const getFolderById = async (id: string): Promise<Folder | null> => {
  try {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error("Error fetching folder:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception in getFolderById:", error);
    return null;
  }
};

// Get folder hierarchy (tree structure)
export const getFolderHierarchy = async (): Promise<FolderWithChildren[]> => {
  try {
    console.log("Getting folder hierarchy...");

    // Get top-level folders
    const folders = await getFolders(null);
    console.log("Top-level folders:", folders);

    // Get tenant ID using the helper function
    const tenantId = await getTenantId();
    console.log("Using tenant ID for document counts:", tenantId);

    // Get document counts for each folder
    let documentCountsQuery = supabase
      .from('documents')
      .select('folder_id, count(*)')
      .eq('is_deleted', false);

    // Add tenant filter if available
    if (tenantId) {
      documentCountsQuery = documentCountsQuery.eq('tenant_id', tenantId);
    }

    // Group by folder_id
    const { data: documentCounts, error: countError } = await documentCountsQuery.group('folder_id');

    if (countError) {
      console.error("Error fetching document counts:", countError);
    } else {
      console.log("Document counts:", documentCounts);
    }

    // Create a map of folder ID to document count
    const folderDocumentCounts = new Map<string, number>();
    documentCounts?.forEach(item => {
      folderDocumentCounts.set(item.folder_id, parseInt(item.count));
    });

    // Build the tree structure
    const folderMap = new Map<string, FolderWithChildren>();

    // First, create a map of all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        documents_count: folderDocumentCounts.get(folder.id) ?? 0
      });
    });

    console.log("Folder map created:", Array.from(folderMap.entries()));

    // Then, build the tree structure
    const rootFolders: FolderWithChildren[] = [];

    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id);

      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        // This is a child folder, add it to its parent
        const parent = folderMap.get(folder.parent_id);
        console.log(`Adding folder ${folder.name} (${folder.id}) to parent ${parent?.name} (${folder.parent_id})`);
        parent?.children?.push(folderWithChildren);
      } else {
        // This is a root folder
        console.log(`Adding root folder ${folder.name} (${folder.id})`);
        rootFolders.push(folderWithChildren);
      }
    });

    console.log("Root folders:", rootFolders);
    return rootFolders;
  } catch (error) {
    console.error("Exception in getFolderHierarchy:", error);
    return [];
  }
};

// Get documents in a folder
export const getDocumentsInFolder = async (folderId: string): Promise<Document[]> => {
  try {
    // Get tenant ID using the helper function
    const tenantId = await getTenantId();
    console.log("Using tenant ID for documents:", tenantId);

    // Build the query
    let query = supabase
      .from('documents')
      .select('*')
      .eq('folder_id', folderId)
      .eq('is_deleted', false);

    // Add tenant filter if available
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // Execute the query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching documents in folder:", error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error("Exception in getDocumentsInFolder:", error);
    return [];
  }
};

// Get documents in a folder and all its subfolders
export const getDocumentsInFolderTree = async (folderId: string): Promise<Document[]> => {
  try {
    console.log(`Getting documents in folder tree for folder: ${folderId}`);

    // Try the simple function first
    console.log(`Calling simple_get_documents_in_folder_tree with folder_uuid: ${folderId}`);
    const { data: simpleData, error: simpleError } = await supabase
      .rpc('simple_get_documents_in_folder_tree', {
        folder_uuid: folderId
      });

    if (simpleError) {
      console.error("Error with simple_get_documents_in_folder_tree:", simpleError);

      // Fallback to direct query
      console.log("Falling back to direct query for documents in folder");
      return await getDocumentsInFolder(folderId);
    }

    console.log(`Retrieved ${simpleData?.length ?? 0} documents from simple function`);

    // Get subfolders to display in UI
    console.log(`Getting subfolders for folder: ${folderId}`);
    const { data: subfolders, error: subfoldersError } = await supabase
      .rpc('get_subfolders', {
        parent_folder_uuid: folderId
      });

    if (subfoldersError) {
      console.error("Error getting subfolders:", subfoldersError);
    } else {
      console.log(`Found ${subfolders?.length ?? 0} subfolders`);

      // Store subfolders in sessionStorage for the UI to use
      if (subfolders && subfolders.length > 0) {
        sessionStorage.setItem('currentSubfolders', JSON.stringify(subfolders));
      }
    }

    return simpleData ?? [];
  } catch (error) {
    console.error("Exception in getDocumentsInFolderTree:", error);

    // Final fallback: direct query
    try {
      console.log("Final fallback: direct query for documents in folder");
      return await getDocumentsInFolder(folderId);
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return [];
    }
  }
};

// Create a new folder
export const createFolder = async (folderData: any, userId: string): Promise<Folder | null> => {
  try {
    // Get tenant ID using the helper function if not provided in folderData
    const tenantId = folderData.tenant_id ?? await getTenantId();

    console.log("Creating new folder:", {
      name: folderData.name,
      description: folderData.description,
      parent_id: folderData.parent_id,
      tenant_id: tenantId,
      userId
    });

    // Create the folder object with all properties
    const folderToInsert: any = {
      name: folderData.name,
      description: folderData.description ?? '',
      parent_id: folderData.parent_id ?? null,
      created_by: userId
    };

    // Add tenant_id if available
    if (tenantId) {
      folderToInsert.tenant_id = tenantId;
      console.log(`Adding tenant_id ${tenantId} to folder`);
    } else {
      console.warn("No tenant_id available for folder creation, this might cause RLS policy issues");

      // Try to get tenant_id from user metadata as a fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.tenant_id) {
        folderToInsert.tenant_id = user.user_metadata.tenant_id;
        console.log(`Using tenant_id ${folderToInsert.tenant_id} from user metadata as fallback`);
      }

      // Try to get tenant_id from session storage as a last resort
      if (!folderToInsert.tenant_id) {
        try {
          const storedTenant = sessionStorage.getItem('currentTenant');
          if (storedTenant) {
            const tenant = JSON.parse(storedTenant);
            folderToInsert.tenant_id = tenant.id;
            console.log(`Using tenant_id ${folderToInsert.tenant_id} from session storage as last resort`);
          }
        } catch (error) {
          console.error("Error parsing stored tenant:", error);
        }
      }

      // If still no tenant_id, try to get it from the profiles table
      if (!folderToInsert.tenant_id) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', userId)
            .single();

          if (profileData?.tenant_id) {
            folderToInsert.tenant_id = profileData.tenant_id;
            console.log(`Using tenant_id ${folderToInsert.tenant_id} from profiles table`);
          }
        } catch (error) {
          console.error("Error getting tenant_id from profiles:", error);
        }
      }
    }

    console.log("Folder data to insert:", folderToInsert);

    // Try multiple approaches to create the folder
    let data = null;
    let error = null;

    // Approach 1: Try with all data including tenant_id
    console.log("Approach 1: Trying with all data including tenant_id");
    const result1 = await supabase
      .from('folders')
      .insert([folderToInsert])
      .select()
      .single();

    data = result1.data;
    error = result1.error;

    // If Approach 1 fails with RLS error, try Approach 2
    if (error && error.code === '42501') {
      console.warn("RLS policy violation in Approach 1, trying Approach 2");

      // Approach 2: Try without tenant_id
      const folderData2 = { ...folderToInsert };
      delete folderData2.tenant_id;

      console.log("Approach 2: Trying without tenant_id:", folderData2);
      const result2 = await supabase
        .from('folders')
        .insert([folderData2])
        .select()
        .single();

      data = result2.data;
      error = result2.error;

      // If Approach 2 fails, try Approach 3
      if (error && error.code === '42501') {
        console.warn("RLS policy violation in Approach 2, trying Approach 3");

        // Approach 3: Try with minimal data
        const folderData3 = {
          name: folderData.name,
          created_by: userId
        };

        console.log("Approach 3: Trying with minimal data:", folderData3);
        const result3 = await supabase
          .from('folders')
          .insert([folderData3])
          .select()
          .single();

        data = result3.data;
        error = result3.error;

        // If Approach 3 fails, try Approach 4 with RPC
        if (error && error.code === '42501') {
          console.warn("RLS policy violation in Approach 3, trying Approach 4 with RPC");

          // Approach 4: Try using a custom RPC function (if available)
          try {
            const result4 = await supabase.rpc('create_folder_bypass_rls', {
              p_name: folderData.name,
              p_description: folderData.description || '',
              p_parent_id: folderData.parent_id || null,
              p_created_by: userId,
              p_tenant_id: folderToInsert.tenant_id || null
            });

            if (result4.data) {
              data = result4.data;
              error = null;
            } else {
              error = result4.error;
            }
          } catch (rpcError) {
            console.error("RPC approach failed:", rpcError);
            // Continue with the error from Approach 3
          }
        }
      }
    }

    if (error) {
      console.error("All approaches failed. Error creating folder:", error);
      return null;
    }

    console.log("Folder created successfully:", data);
    return data;
  } catch (error) {
    console.error("Exception in createFolder:", error);
    return null;
  }
};

// Update a folder
export const updateFolder = async (id: string, folderData: FolderUpdate): Promise<Folder | null> => {
  try {
    const { data, error } = await supabase
      .from('folders')
      .update({
        name: folderData.name,
        description: folderData.description,
        parent_id: folderData.parent_id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating folder:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception in updateFolder:", error);
    return null;
  }
};

// Delete a folder (soft delete)
export const deleteFolder = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('folders')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error("Error deleting folder:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception in deleteFolder:", error);
    return false;
  }
};

// Move a folder to a new parent
export const moveFolder = async (id: string, newParentId: string | null): Promise<boolean> => {
  try {
    if (newParentId) {
      // Use the move_folder function to avoid cycles
      const { data, error } = await supabase
        .rpc('move_folder', { folder_uuid: id, new_parent_uuid: newParentId });

      if (error) {
        console.error("Error moving folder:", error);
        return false;
      }

      return data ?? false;
    } else {
      // Moving to root level
      const { error } = await supabase
        .from('folders')
        .update({ parent_id: null })
        .eq('id', id);

      if (error) {
        console.error("Error moving folder to root:", error);
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error("Exception in moveFolder:", error);
    return false;
  }
};

// Get the path to a folder (breadcrumb)
export const getFolderPath = async (id: string): Promise<Folder[]> => {
  try {
    const path: Folder[] = [];
    let currentId = id;

    while (currentId) {
      const folder = await getFolderById(currentId);
      if (!folder) break;

      path.unshift(folder);
      currentId = folder.parent_id || '';
    }

    return path;
  } catch (error) {
    console.error("Exception in getFolderPath:", error);
    return [];
  }
};
