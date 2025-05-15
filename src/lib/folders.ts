import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { Document } from "./documents";

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
export const getFolders = async (): Promise<Folder[]> => {
  try {
    console.log("Fetching all folders...");

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user?.id);

    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    // Query folders with the user ID
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('created_by', user.id)
      .eq('is_deleted', false)
      .order('name');

    if (error) {
      console.error("Error fetching folders:", error);
      return [];
    }

    console.log("Folders fetched from database:", data);
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

    // Get all folders
    const folders = await getFolders();
    console.log("All folders:", folders);

    // Get document counts for each folder
    const { data: documentCounts, error: countError } = await supabase
      .from('documents')
      .select('folder_id, count(*)')
      .eq('is_deleted', false)
      .group('folder_id');

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
        documents_count: folderDocumentCounts.get(folder.id) || 0
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
        parent?.children?.push(folderWithChildren!);
      } else {
        // This is a root folder
        console.log(`Adding root folder ${folder.name} (${folder.id})`);
        rootFolders.push(folderWithChildren!);
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
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching documents in folder:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception in getDocumentsInFolder:", error);
    return [];
  }
};

// Get documents in a folder and all its subfolders
export const getDocumentsInFolderTree = async (folderId: string): Promise<Document[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_documents_in_folder_tree', { folder_uuid: folderId });

    if (error) {
      console.error("Error fetching documents in folder tree:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception in getDocumentsInFolderTree:", error);
    return [];
  }
};

// Create a new folder
export const createFolder = async (folderData: FolderCreate, userId: string): Promise<Folder | null> => {
  try {
    console.log("Creating new folder:", {
      name: folderData.name,
      description: folderData.description,
      parent_id: folderData.parent_id,
      userId
    });

    const folderToInsert = {
      name: folderData.name,
      description: folderData.description || '',
      parent_id: folderData.parent_id || null,
      created_by: userId
    };

    console.log("Folder data to insert:", folderToInsert);

    const { data, error } = await supabase
      .from('folders')
      .insert([folderToInsert])
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
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

      return data || false;
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
