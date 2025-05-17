import { supabase } from "@/integrations/supabase/client";
import { createFolder, FolderCreate } from "@/lib/folders";
import { getTemplateById, useTemplate } from "@/lib/templates";

// Types
export interface IndustrySegment {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface FolderTemplate {
  id: string;
  name: string;
  description?: string;
  industry_segment_id: string;
  structure: FolderStructure;
  created_at: string;
}

export interface FolderStructure {
  folders: FolderNode[];
}

export interface FolderNode {
  name: string;
  description?: string;
  folders?: FolderNode[];
}

export interface FolderDocumentTemplate {
  id: string;
  folder_template_id: string;
  folder_path: string;
  template_id: string;
  created_at: string;
}

export interface UserOnboarding {
  user_id: string;
  is_onboarded: boolean;
  industry_segment_id?: string;
  folder_template_id?: string;
  onboarded_at?: string;
  created_at: string;
}

// Check if a user is onboarded
export const checkUserOnboarding = async (userId: string, tenantId?: string): Promise<UserOnboarding | null> => {
  try {
    let query = supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId);

    // If tenant ID is provided, filter by tenant
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Error checking user onboarding status:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception in checkUserOnboarding:", error);
    return null;
  }
};

// Initialize user onboarding record
export const initializeUserOnboarding = async (userId: string, tenantId?: string): Promise<boolean> => {
  try {
    // Check if record already exists
    const existing = await checkUserOnboarding(userId, tenantId);
    if (existing) {
      return true;
    }

    // Create new record
    const insertData: any = {
      user_id: userId,
      is_onboarded: false
    };

    // Add tenant_id if provided
    if (tenantId) {
      insertData.tenant_id = tenantId;
    }

    // Create new record
    const { error } = await supabase
      .from('user_onboarding')
      .insert([insertData]);

    if (error) {
      console.error("Error initializing user onboarding:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception in initializeUserOnboarding:", error);
    return false;
  }
};

// Get all industry segments
export const getIndustrySegments = async (): Promise<IndustrySegment[]> => {
  try {
    const { data, error } = await supabase
      .from('industry_segments')
      .select('*')
      .order('name');

    if (error) {
      console.error("Error fetching industry segments:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception in getIndustrySegments:", error);
    return [];
  }
};

// Get folder templates by industry segment
export const getFolderTemplatesBySegment = async (segmentId: string): Promise<FolderTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('folder_templates')
      .select('*')
      .eq('industry_segment_id', segmentId)
      .order('name');

    if (error) {
      console.error("Error fetching folder templates:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception in getFolderTemplatesBySegment:", error);
    return [];
  }
};

// Get document templates for a folder template
export const getDocumentTemplatesForFolder = async (folderTemplateId: string): Promise<FolderDocumentTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('folder_document_templates')
      .select('*')
      .eq('folder_template_id', folderTemplateId);

    if (error) {
      console.error("Error fetching document templates for folder:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception in getDocumentTemplatesForFolder:", error);
    return [];
  }
};

// Generate folder structure from template
export const generateFolderStructure = async (
  folderTemplateId: string,
  userId: string,
  tenantId?: string
): Promise<boolean> => {
  try {
    // Get the folder template
    const { data: templateData, error: templateError } = await supabase
      .from('folder_templates')
      .select('*')
      .eq('id', folderTemplateId)
      .single();

    if (templateError || !templateData) {
      console.error("Error fetching folder template:", templateError);
      return false;
    }

    const template = templateData as FolderTemplate;

    // Create the folder structure recursively
    const folderMap = new Map<string, string>(); // Maps template path to actual folder ID

    // Start with creating top-level folders
    for (const folder of template.structure.folders) {
      const folderData: any = {
        name: folder.name,
        description: folder.description || '',
        parent_id: null // Root level folder
      };

      // Add tenant_id if provided
      if (tenantId) {
        folderData.tenant_id = tenantId;
      }

      const rootFolder = await createFolder(folderData, userId);

      if (rootFolder) {
        // Store the mapping from template path to actual folder ID
        folderMap.set(folder.name, rootFolder.id);

        // Create subfolders if any
        if (folder.folders && folder.folders.length > 0) {
          await createSubfolders(folder.folders, rootFolder.id, userId, folderMap, folder.name, tenantId);
        }
      }
    }

    // Now add document templates to the folders
    await addDocumentTemplatesToFolders(folderTemplateId, folderMap, userId, tenantId);

    // Update user onboarding status
    const updateData: any = {
      is_onboarded: true,
      industry_segment_id: template.industry_segment_id,
      folder_template_id: folderTemplateId,
      onboarded_at: new Date().toISOString()
    };

    // Add tenant_id if provided
    if (tenantId) {
      updateData.tenant_id = tenantId;
    }

    // Update user onboarding status
    let query = supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('user_id', userId);

    // Add tenant filter if provided
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error("Error updating user onboarding status:", updateError);
      // Continue anyway as the folders were created
    }

    return true;
  } catch (error) {
    console.error("Exception in generateFolderStructure:", error);
    return false;
  }
};

// Helper function to create subfolders recursively
const createSubfolders = async (
  folders: FolderNode[],
  parentId: string,
  userId: string,
  folderMap: Map<string, string>,
  parentPath: string,
  tenantId?: string
): Promise<void> => {
  for (const folder of folders) {
    const folderData: any = {
      name: folder.name,
      description: folder.description || '',
      parent_id: parentId
    };

    // Add tenant_id if provided
    if (tenantId) {
      folderData.tenant_id = tenantId;
    }

    const newFolder = await createFolder(folderData, userId);

    if (newFolder) {
      const currentPath = `${parentPath}/${folder.name}`;
      folderMap.set(currentPath, newFolder.id);

      if (folder.folders && folder.folders.length > 0) {
        await createSubfolders(folder.folders, newFolder.id, userId, folderMap, currentPath, tenantId);
      }
    }
  }
};

// Helper function to add document templates to folders
const addDocumentTemplatesToFolders = async (
  folderTemplateId: string,
  folderMap: Map<string, string>,
  userId: string,
  tenantId?: string
): Promise<void> => {
  try {
    // Get document templates for this folder template
    const documentTemplates = await getDocumentTemplatesForFolder(folderTemplateId);

    for (const docTemplate of documentTemplates) {
      // Find the folder ID for this path
      const folderId = folderMap.get(docTemplate.folder_path);

      if (folderId) {
        // Get the template details
        const template = await getTemplateById(docTemplate.template_id);

        if (template) {
          // Use the template to create a document in this folder
          const templateUse: any = {
            templateId: template.id,
            title: template.title,
            placeholderValues: {},
            approvers: []
          };

          // Add folder_id and tenant_id
          templateUse.folder_id = folderId;

          if (tenantId) {
            templateUse.tenant_id = tenantId;
          }

          await useTemplate(templateUse, userId);
        }
      }
    }
  } catch (error) {
    console.error("Error adding document templates to folders:", error);
  }
};

// Complete user onboarding with custom folders
export const completeCustomOnboarding = async (
  userId: string,
  industrySegmentId: string,
  tenantId?: string
): Promise<boolean> => {
  try {
    // Prepare update data
    const updateData: any = {
      is_onboarded: true,
      industry_segment_id: industrySegmentId,
      folder_template_id: null, // No template used
      onboarded_at: new Date().toISOString()
    };

    // Add tenant_id if provided
    if (tenantId) {
      updateData.tenant_id = tenantId;
    }

    // Update user onboarding status
    let query = supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('user_id', userId);

    // Add tenant filter if provided
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { error } = await query;

    if (error) {
      console.error("Error completing custom onboarding:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception in completeCustomOnboarding:", error);
    return false;
  }
};
