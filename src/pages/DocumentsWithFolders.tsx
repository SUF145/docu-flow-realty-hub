import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DocumentGrid from "@/components/documents/DocumentGrid";
import SimpleFolderList from "@/components/folders/SimpleFolderList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NewDocumentUploadModal from "@/components/documents/NewDocumentUploadModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DocumentsWithFolders = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user } = useAuth();

  const navigate = useNavigate();
  const [folderName, setFolderName] = useState<string>("");

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
        const { data, error } = await supabase
          .from('folders')
          .select('name')
          .eq('id', folderId)
          .single();

        if (error) {
          console.error("Error fetching folder name:", error);
          return;
        }

        if (data) {
          setFolderName(data.name);
        }
      };

      fetchFolderName();
    }
  }, [folderId]);

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
                onClick={() => navigate("/documents")}
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
