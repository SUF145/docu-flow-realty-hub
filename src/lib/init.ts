import { initializeStorage } from "@/integrations/supabase/client";
import { initializeTemplatesStorage } from "@/lib/templates";

// Initialize the application
export const initializeApp = async () => {
  console.log("Initializing application...");

  // Initialize document storage
  const storageInitialized = await initializeStorage();
  console.log(`Document storage initialization ${storageInitialized ? 'successful' : 'failed'}`);

  // Initialize templates storage
  const templatesStorageInitialized = await initializeTemplatesStorage();
  console.log(`Templates storage initialization ${templatesStorageInitialized ? 'successful' : 'failed'}`);

  return {
    storageInitialized,
    templatesStorageInitialized
  };
};
