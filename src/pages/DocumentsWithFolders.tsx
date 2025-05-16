import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DocumentGrid from "@/components/documents/DocumentGrid";
import SimpleFolderList from "@/components/folders/SimpleFolderList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NewDocumentUploadModal from "@/components/documents/NewDocumentUploadModal";
import { supabase } from "@/integrations/supabase/client";

const DocumentsWithFolders = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const navigate = useNavigate();
  const [folderName, setFolderName] = useState<string>("");

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
