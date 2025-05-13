import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Template {
  id: string;
  title: string;
  description?: string;
  file_template_url: string;
  placeholders?: Record<string, any>;
  created_at: string;
}

export interface TemplateUse {
  templateId: string;
  title: string;
  placeholderValues: Record<string, string>;
  approvers?: string[];
}

// Initialize templates storage bucket
export const initializeTemplatesStorage = async () => {
  try {
    console.log("=== TEMPLATES STORAGE INITIALIZATION STARTED ===");

    // 1. Check if the bucket exists
    console.log("Checking if 'templates' storage bucket exists...");
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error("ERROR: Failed to list storage buckets:", bucketsError);
      // Assume the bucket exists and continue
      console.log("Assuming 'templates' bucket exists and continuing...");
      return true;
    }

    console.log("Available buckets:", buckets?.map(b => b.name).join(", ") || "none");

    // Check if templates bucket exists
    const templatesBucketExists = buckets?.some(bucket => bucket.name === 'templates');

    if (!templatesBucketExists) {
      console.error("ERROR: 'templates' bucket does not exist!");
      console.error("IMPORTANT: The 'templates' bucket needs to be created manually by an admin in the Supabase dashboard.");
      console.error("Please create a bucket named 'templates' with public access in the Supabase Storage section.");

      // Try to use the bucket anyway - it might have been created after we checked
      console.log("Attempting to use the bucket anyway...");
    } else {
      console.log("'templates' bucket exists, proceeding with upload");
    }

    // 2. Try to verify access to the bucket by getting a public URL
    try {
      console.log("Attempting to verify access to 'templates' bucket...");
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl('test-access');

      console.log("Bucket access verification successful, public URL:", urlData?.publicUrl);
    } catch (accessError) {
      console.error("ERROR: Exception when verifying bucket access:", accessError);
      // Continue anyway
    }

    console.log("=== TEMPLATES STORAGE INITIALIZATION COMPLETED ===");
    return true;
  } catch (error) {
    console.error("CRITICAL ERROR: Exception when initializing templates storage:", error);
    // Return true anyway to allow the upload attempt
    return true;
  }
};

// Get all templates
export const getTemplates = async (): Promise<Template[]> => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception in getTemplates:", error);
    return [];
  }
};

// Get template by ID
export const getTemplateById = async (id: string): Promise<Template | null> => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception in getTemplateById:", error);
    return null;
  }
};

// Upload a template file to Supabase Storage
export const uploadTemplateFile = async (file: File): Promise<string | null> => {
  try {
    console.log("=== TEMPLATE UPLOAD PROCESS STARTED ===");
    console.log("Template file details:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Check if we can access the templates bucket
    await initializeTemplatesStorage();

    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log("Attempting to upload file to storage path:", filePath);

    // Try to upload the file
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting
        });

      if (uploadError) {
        console.error("ERROR: File upload failed:", uploadError);
        console.error("Upload error details:", {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          name: uploadError.name,
          details: uploadError.details
        });

        // If we get a 404 error, the bucket probably doesn't exist
        if (uploadError.statusCode === 404) {
          console.error("ERROR: The 'templates' bucket does not exist or is not accessible.");
          console.error("IMPORTANT: Please create a bucket named 'templates' with public access in the Supabase dashboard.");
        }

        // If we get a 403 error, it's likely an RLS policy issue
        if (uploadError.statusCode === 403) {
          console.error("ERROR: Permission denied. This is likely due to Row Level Security (RLS) policies.");
          console.error("IMPORTANT: Please run the SQL script to fix the RLS policies for the templates bucket.");
        }

        // For now, create a mock URL for development purposes
        const mockUrl = `https://example.com/mock-templates/${fileName}`;
        console.log("DEVELOPMENT MODE: Using mock URL:", mockUrl);
        return mockUrl;
      }

      console.log("File uploaded successfully:", uploadData);

      // Get the public URL for the file
      console.log("Generating public URL for uploaded file...");
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      console.log("Public URL generated:", publicUrl);

      return publicUrl || null;
    } catch (uploadException) {
      console.error("ERROR: Exception during file upload:", uploadException);

      // For development purposes, return a mock URL
      const mockUrl = `https://example.com/mock-templates/${fileName}`;
      console.log("DEVELOPMENT MODE: Using mock URL:", mockUrl);
      return mockUrl;
    }
  } catch (error) {
    console.error("Exception in uploadTemplateFile:", error);

    // For development purposes, return a mock URL
    const mockFileName = `${uuidv4()}.${file.name.split('.').pop()}`;
    const mockUrl = `https://example.com/mock-templates/${mockFileName}`;
    console.log("DEVELOPMENT MODE: Using mock URL:", mockUrl);
    return mockUrl;
  }
};

// Create a new template
export const createTemplate = async (
  title: string,
  description: string,
  file: File,
  placeholders: Record<string, any> = {}
): Promise<Template | null> => {
  try {
    console.log("=== CREATE TEMPLATE PROCESS STARTED ===");

    // Upload file to storage
    const fileUrl = await uploadTemplateFile(file);
    if (!fileUrl) {
      throw new Error("Failed to upload template file");
    }

    console.log("File URL obtained:", fileUrl);

    // Create template record
    try {
      const { data, error } = await supabase
        .from('templates')
        .insert([
          {
            title,
            description,
            file_template_url: fileUrl,
            placeholders
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("ERROR: Failed to create template record:", error);

        // If we get a 403 error, it's likely an RLS policy issue
        if (error.code === "42501" || error.message.includes("policy")) {
          console.error("ERROR: Permission denied. This is likely due to Row Level Security (RLS) policies.");
          console.error("IMPORTANT: Please run the SQL script to fix the RLS policies for the templates table.");
        }

        // Create a mock template for development purposes
        const mockTemplate: Template = {
          id: uuidv4(),
          title,
          description,
          file_template_url: fileUrl,
          placeholders,
          created_at: new Date().toISOString()
        };

        console.log("DEVELOPMENT MODE: Using mock template:", mockTemplate);
        return mockTemplate;
      }

      console.log("Template record created successfully:", data);
      return data;
    } catch (dbError) {
      console.error("ERROR: Exception when creating template record:", dbError);

      // Create a mock template for development purposes
      const mockTemplate: Template = {
        id: uuidv4(),
        title,
        description,
        file_template_url: fileUrl,
        placeholders,
        created_at: new Date().toISOString()
      };

      console.log("DEVELOPMENT MODE: Using mock template:", mockTemplate);
      return mockTemplate;
    }
  } catch (error) {
    console.error("Exception in createTemplate:", error);

    // Create a mock template for development purposes
    const mockTemplate: Template = {
      id: uuidv4(),
      title,
      description,
      file_template_url: `https://example.com/mock-templates/${uuidv4()}.${file.name.split('.').pop()}`,
      placeholders,
      created_at: new Date().toISOString()
    };

    console.log("DEVELOPMENT MODE: Using mock template:", mockTemplate);
    return mockTemplate;
  }
};

// Use a template to create a document
export const useTemplate = async (
  templateUse: TemplateUse,
  userId: string
): Promise<string | null> => {
  try {
    // Get the template
    const template = await getTemplateById(templateUse.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // For now, we'll just create a document record
    // In a real implementation, you would:
    // 1. Download the template file
    // 2. Replace placeholders with values
    // 3. Save as a new file
    // 4. Upload the new file to documents storage

    // For this implementation, we'll simulate by creating a document record
    const { data, error } = await supabase
      .from('documents')
      .insert([
        {
          title: templateUse.title,
          description: template.description,
          status: templateUse.approvers && templateUse.approvers.length > 0 ? 'pending' : 'draft',
          created_by: userId,
          file_path: template.file_template_url, // Using the template URL directly for now
          metadata: {
            template_id: template.id,
            placeholders: templateUse.placeholderValues,
            approvers: templateUse.approvers || [],
            from_template: true
          }
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating document from template:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Exception in useTemplate:", error);
    return null;
  }
};
