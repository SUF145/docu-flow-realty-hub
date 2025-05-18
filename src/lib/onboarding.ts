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

    // Create new record using upsert to avoid duplicate key errors
    const { error } = await supabase
      .from('user_onboarding')
      .upsert(insertData, { onConflict: 'user_id' });

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
    console.log(`Generating folder structure from template ${folderTemplateId} for user ${userId} and tenant ${tenantId}`);

    // If tenantId is not provided, try to get it from multiple sources
    if (!tenantId) {
      // Try session storage first
      try {
        const storedTenant = sessionStorage.getItem('currentTenant');
        if (storedTenant) {
          const tenant = JSON.parse(storedTenant);
          tenantId = tenant.id;
          console.log(`Retrieved tenant_id ${tenantId} from session storage`);
        }
      } catch (error) {
        console.error("Error parsing stored tenant:", error);
      }

      // If still no tenant_id, try user metadata
      if (!tenantId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.tenant_id) {
          tenantId = user.user_metadata.tenant_id;
          console.log(`Retrieved tenant_id ${tenantId} from user metadata`);
        }
      }

      // If still no tenant_id, try to get it from the profiles table
      if (!tenantId) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', userId)
            .single();

          if (profileData?.tenant_id) {
            tenantId = profileData.tenant_id;
            console.log(`Retrieved tenant_id ${tenantId} from profiles table`);
          }
        } catch (error) {
          console.error("Error getting tenant_id from profiles:", error);
        }
      }
    }

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

    console.log("Template data retrieved:", templateData);
    const template = templateData as FolderTemplate;
    console.log("Folder structure to create:", JSON.stringify(template.structure, null, 2));

    // Create the folder structure recursively
    const folderMap = new Map<string, string>(); // Maps template path to actual folder ID

    // Start with creating top-level folders
    console.log(`Creating ${template.structure.folders.length} top-level folders`);
    for (const folder of template.structure.folders) {
      console.log(`Creating root folder: ${folder.name}`);

      const folderData: any = {
        name: folder.name,
        description: folder.description || '',
        parent_id: null // Root level folder
      };

      // Add tenant_id if provided
      if (tenantId) {
        folderData.tenant_id = tenantId;
        console.log(`Adding tenant_id ${tenantId} to folder`);
      } else {
        console.warn("No tenant_id available for folder creation");
      }

      console.log("Creating folder with data:", folderData);
      const rootFolder = await createFolder(folderData, userId);

      if (rootFolder) {
        console.log(`Root folder created successfully with ID: ${rootFolder.id}`);
        // Store the mapping from template path to actual folder ID
        folderMap.set(folder.name, rootFolder.id);

        // Create subfolders if any
        if (folder.folders && folder.folders.length > 0) {
          console.log(`Creating ${folder.folders.length} subfolders for ${folder.name}`);
          await createSubfolders(folder.folders, rootFolder.id, userId, folderMap, folder.name, tenantId);
        }
      } else {
        console.error(`Failed to create root folder: ${folder.name}`);
      }
    }

    // Now add document templates to the folders
    console.log("Adding document templates to folders");
    await addDocumentTemplatesToFolders(folderTemplateId, folderMap, userId, tenantId);

    // Update user onboarding status
    console.log("Updating user onboarding status");

    // First check if a record exists
    let checkQuery = supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId);

    // Add tenant filter if provided
    if (tenantId) {
      checkQuery = checkQuery.eq('tenant_id', tenantId);
    }

    const { data: existingRecord, error: checkError } = await checkQuery.maybeSingle();

    console.log("Existing onboarding record check:", { existingRecord, checkError });

    const updateData: any = {
      is_onboarded: true,
      industry_segment_id: template.industry_segment_id,
      folder_template_id: folderTemplateId,
      onboarded_at: new Date().toISOString()
    };

    // Add tenant_id if provided
    if (tenantId) {
      updateData.tenant_id = tenantId;
      console.log(`Adding tenant_id ${tenantId} to onboarding record`);
    }

    console.log("Onboarding update data:", updateData);

    let updateError = null;

    // Use upsert to handle both insert and update cases
    console.log("Upserting onboarding record");
    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: userId,
        ...updateData
      }, { onConflict: 'user_id' });

    updateError = error;

    if (updateError) {
      console.error("Error updating user onboarding status:", updateError);
      // Continue anyway as the folders were created
    } else {
      console.log("User onboarding status updated successfully");

      // Store onboarding completion in localStorage for persistence
      localStorage.setItem('userOnboarded', 'true');
    }

    console.log("Folder structure generation completed successfully");
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
  console.log(`Creating ${folders.length} subfolders under parent ${parentPath} (ID: ${parentId})`);

  // If tenantId is not provided, try to get it from multiple sources
  if (!tenantId) {
    // Try session storage first
    try {
      const storedTenant = sessionStorage.getItem('currentTenant');
      if (storedTenant) {
        const tenant = JSON.parse(storedTenant);
        tenantId = tenant.id;
        console.log(`Retrieved tenant_id ${tenantId} from session storage for subfolder creation`);
      }
    } catch (error) {
      console.error("Error parsing stored tenant for subfolder creation:", error);
    }

    // If still no tenant_id, try user metadata
    if (!tenantId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.tenant_id) {
        tenantId = user.user_metadata.tenant_id;
        console.log(`Retrieved tenant_id ${tenantId} from user metadata for subfolder creation`);
      }
    }

    // If still no tenant_id, try to get it from the profiles table
    if (!tenantId) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', userId)
          .single();

        if (profileData?.tenant_id) {
          tenantId = profileData.tenant_id;
          console.log(`Retrieved tenant_id ${tenantId} from profiles table for subfolder creation`);
        }
      } catch (error) {
        console.error("Error getting tenant_id from profiles for subfolder creation:", error);
      }
    }
  }

  for (const folder of folders) {
    console.log(`Creating subfolder: ${folder.name} under parent path: ${parentPath}`);

    const folderData: any = {
      name: folder.name,
      description: folder.description || '',
      parent_id: parentId
    };

    // Add tenant_id if provided
    if (tenantId) {
      folderData.tenant_id = tenantId;
      console.log(`Adding tenant_id ${tenantId} to subfolder ${folder.name}`);
    } else {
      console.warn(`No tenant_id available for subfolder ${folder.name}`);
    }

    console.log("Creating subfolder with data:", folderData);

    // Try to create the folder using our enhanced createFolder function
    // This function has multiple fallback approaches for handling RLS issues
    const newFolder = await createFolder(folderData, userId);

    if (newFolder) {
      console.log(`Subfolder created successfully with ID: ${newFolder.id}`);
      const currentPath = `${parentPath}/${folder.name}`;
      folderMap.set(currentPath, newFolder.id);
      console.log(`Added path mapping: ${currentPath} -> ${newFolder.id}`);

      if (folder.folders && folder.folders.length > 0) {
        console.log(`Creating ${folder.folders.length} nested subfolders for ${folder.name}`);
        await createSubfolders(folder.folders, newFolder.id, userId, folderMap, currentPath, tenantId);
      }
    } else {
      console.error(`Failed to create subfolder: ${folder.name}`);
    }
  }

  console.log(`Completed creating subfolders under ${parentPath}`);
};

// Helper function to add document templates to folders
const addDocumentTemplatesToFolders = async (
  folderTemplateId: string,
  folderMap: Map<string, string>,
  userId: string,
  tenantId?: string
): Promise<void> => {
  try {
    console.log(`Adding document templates for folder template ${folderTemplateId}`);

    // Get document templates for this folder template
    const documentTemplates = await getDocumentTemplatesForFolder(folderTemplateId);
    console.log(`Found ${documentTemplates.length} document templates to add`);

    for (const docTemplate of documentTemplates) {
      console.log(`Processing document template for path: ${docTemplate.folder_path}`);

      // Find the folder ID for this path
      const folderId = folderMap.get(docTemplate.folder_path);

      if (folderId) {
        console.log(`Found matching folder ID: ${folderId} for path: ${docTemplate.folder_path}`);

        // Get the template details
        const template = await getTemplateById(docTemplate.template_id);

        if (template) {
          console.log(`Retrieved template: ${template.title} (ID: ${template.id})`);

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
            console.log(`Adding tenant_id ${tenantId} to document`);
          }

          console.log(`Creating document from template with data:`, templateUse);
          const result = await useTemplate(templateUse, userId);

          if (result) {
            console.log(`Document created successfully from template: ${template.title}`);
          } else {
            console.error(`Failed to create document from template: ${template.title}`);
          }
        } else {
          console.error(`Template not found with ID: ${docTemplate.template_id}`);
        }
      } else {
        console.error(`No matching folder found for path: ${docTemplate.folder_path}`);
        console.log(`Available folder paths:`, Array.from(folderMap.keys()));
      }
    }

    console.log(`Completed adding document templates for folder template ${folderTemplateId}`);
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
    console.log(`Completing custom onboarding for user ${userId} with industry segment ${industrySegmentId}`);

    // First check if a record exists
    let checkQuery = supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId);

    // Add tenant filter if provided
    if (tenantId) {
      checkQuery = checkQuery.eq('tenant_id', tenantId);
    }

    const { data: existingRecord, error: checkError } = await checkQuery.maybeSingle();

    console.log("Existing onboarding record check (custom):", { existingRecord, checkError });

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
      console.log(`Adding tenant_id ${tenantId} to onboarding record`);
    }

    console.log("Custom onboarding update data:", updateData);

    let error = null;

    // Use upsert to handle both insert and update cases
    console.log("Upserting onboarding record (custom)");
    const { error: upsertError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: userId,
        ...updateData
      }, { onConflict: 'user_id' });

    error = upsertError;

    if (error) {
      console.error("Error completing custom onboarding:", error);
      return false;
    }

    console.log("Custom onboarding completed successfully");

    // Store onboarding completion in localStorage for persistence
    localStorage.setItem('userOnboarded', 'true');

    return true;
  } catch (error) {
    console.error("Exception in completeCustomOnboarding:", error);
    return false;
  }
};
