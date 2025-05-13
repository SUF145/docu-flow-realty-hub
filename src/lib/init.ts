import { initializeStorage } from "@/integrations/supabase/client";

// Initialize the application
export const initializeApp = async () => {
  console.log("Initializing application...");
  
  // Initialize storage
  const storageInitialized = await initializeStorage();
  console.log(`Storage initialization ${storageInitialized ? 'successful' : 'failed'}`);
  
  return {
    storageInitialized
  };
};
