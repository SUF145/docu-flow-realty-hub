import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DocumentGrid from "@/components/documents/DocumentGrid";
import SimpleFolderList from "@/components/folders/SimpleFolderList";
import { Button } from "@/components/ui/button";
import { Plus, Folder } from "lucide-react";
import NewDocumentUploadModal from "@/components/documents/NewDocumentUploadModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DocumentsWithFolders = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user } = useAuth();

  const navigate = useNavigate();
  const [folderName, setFolderName] = useState<string>("");
  const [subfolders, setSubfolders] = useState<any[]>([]);

  // Check if user is onboarded and handle completed parameter
  useEffect(() => {
    // Check for completed parameter
    const urlParams = new URLSearchParams(window.location.search);
    const completedParam = urlParams.get('completed') === 'true';

    if (completedParam) {
      console.log("Completed parameter detected, ensuring user is marked as onboarded");
      localStorage.setItem('userOnboarded', 'true');

      // Remove the completed parameter from the URL without reloading the page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    const isOnboarded = localStorage.getItem('userOnboarded') === 'true';

    if (!isOnboarded && user && !completedParam) {
      console.log("User is not onboarded, redirecting to onboarding");
      navigate('/onboarding');
    } else if ((isOnboarded || completedParam) && user) {
      console.log("User is onboarded, checking for folders");
      console.log("User ID:", user.id);
      console.log("User metadata:", user.user_metadata);

      // Check session storage for tenant info
      try {
        const storedTenant = sessionStorage.getItem('currentTenant');
        if (storedTenant) {
          const tenant = JSON.parse(storedTenant);
          console.log("Tenant from session storage:", tenant);
        } else {
          console.log("No tenant found in session storage");
        }
      } catch (error) {
        console.error("Error parsing stored tenant:", error);
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    // If we have a folder ID, fetch the folder name
    if (folderId) {
      const fetchFolderName = async () => {
        console.log(`Fetching folder name for ID: ${folderId}`);

        try {
          const { data, error } = await supabase
            .from('folders')
            .select('name, parent_id')
            .eq('id', folderId)
            .single();

          if (error) {
            console.error("Error fetching folder name:", error);
            return;
          }

          if (data) {
            console.log("Folder data:", data);
            setFolderName(data.name);

            // If this folder has a parent, we need to ensure it's expanded in the folder list
            if (data.parent_id) {
              console.log(`This folder has a parent: ${data.parent_id}`);
              // You could store this in sessionStorage to communicate with the folder list component
              sessionStorage.setItem('expandedParentFolder', data.parent_id);
            }

            // Fetch subfolders directly using the getFolders function
            try {
              const { getFolders } = await import('@/lib/folders');
              const subfoldersData = await getFolders(folderId);
              console.log(`Fetched ${subfoldersData.length} subfolders for parent: ${folderId}`);
              setSubfolders(subfoldersData);
            } catch (error) {
              console.error("Error fetching subfolders:", error);
            }
          } else {
            console.error("No folder found with ID:", folderId);
            // If folder not found, navigate back to all documents
            navigate("/dashboard/documents");
          }
        } catch (error) {
          console.error("Exception in fetchFolderName:", error);
        }
      };

      fetchFolderName();
    }
  }, [folderId, navigate]);

  return (
    <div className="h-[calc(100vh-160px)] flex">
      {/* Folder Sidebar */}
      <SimpleFolderList className="w-64 flex-shrink-0" />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/documents")}
                className="text-muted-foreground"
              >
                All Documents
              </Button>
              {folderId && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium">{folderName}</span>
                </>
              )}
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              {folderId ? folderName : "All Documents"}
            </h2>
            <p className="text-muted-foreground">
              Browse and manage your documents
            </p>
          </div>
          <Button onClick={(e) => {
            e.preventDefault();
            setIsUploadModalOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {/* Display subfolders if any */}
        {subfolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Subfolders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subfolders.map(subfolder => (
                <Button
                  key={subfolder.id}
                  variant="outline"
                  className="h-auto p-4 justify-start border rounded-lg hover:bg-muted flex items-center"
                  onClick={() => navigate(`/dashboard/documents/folders/${subfolder.id}`)}
                >
                  <Folder className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span className="font-medium">{subfolder.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <DocumentGrid folderId={folderId} />

        <NewDocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          currentFolderId={folderId}
        />
      </div>
    </div>
  );
};

export default DocumentsWithFolders;
