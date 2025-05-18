import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderWithChildren, getFolderHierarchy } from "@/lib/folders";
import { ChevronRight, ChevronDown, Folder, FolderPlus, Home, Plus } from "lucide-react";
import FolderCreateModal from "./FolderCreateModal";

interface FolderSidebarProps {
  className?: string;
}

const FolderSidebar = ({ className }: FolderSidebarProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId: string }>();

  const [folders, setFolders] = useState<FolderWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedParentFolder, setSelectedParentFolder] = useState<string | null>(null);

  // Fetch folders when the component mounts and when the folderId changes
  useEffect(() => {
    console.log("FolderSidebar mounted or folderId changed, fetching folders...");
    fetchFolders();

    // Set up an interval to refresh folders every 5 seconds
    const intervalId = setInterval(() => {
      console.log("Refreshing folders from interval...");
      fetchFolders();
    }, 5000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [folderId]);

  // Check for expandedParentFolder in sessionStorage
  useEffect(() => {
    const expandedParentFolder = sessionStorage.getItem('expandedParentFolder');
    if (expandedParentFolder) {
      console.log(`Found expandedParentFolder in sessionStorage: ${expandedParentFolder}`);
      setExpandedFolders(prev => ({
        ...prev,
        [expandedParentFolder]: true
      }));

      // Clear it after using it
      sessionStorage.removeItem('expandedParentFolder');
    }
  }, [folderId]);

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching folders...");
      const folderHierarchy = await getFolderHierarchy();
      console.log("Folder hierarchy received:", folderHierarchy);
      setFolders(folderHierarchy);

      // Auto-expand folders in the path to the currently selected folder
      if (folderId) {
        // This would require a function to get the path to the folder
        // For now, we'll just expand all folders
        const newExpandedFolders: Record<string, boolean> = {};
        const expandAllFolders = (folders: FolderWithChildren[]) => {
          folders.forEach(folder => {
            newExpandedFolders[folder.id] = true;
            if (folder.children && folder.children.length > 0) {
              expandAllFolders(folder.children);
            }
          });
        };
        expandAllFolders(folderHierarchy);
        setExpandedFolders(newExpandedFolders);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast({
        title: "Error",
        description: "Failed to load folders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleFolderClick = (folderId: string) => {
    navigate(`/dashboard/documents/folders/${folderId}`);
  };

  const handleCreateFolder = (parentId: string | null = null) => {
    setSelectedParentFolder(parentId);
    setIsCreateModalOpen(true);
  };

  const handleFolderCreated = () => {
    console.log("Folder created callback triggered, refreshing folders...");
    fetchFolders();
  };

  const renderFolderTree = (folders: FolderWithChildren[], level = 0) => {
    return folders.map(folder => (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 rounded-md hover:bg-muted cursor-pointer ${
            folderId === folder.id ? "bg-muted" : ""
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleFolderClick(folder.id)}
        >
          {folder.children && folder.children.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
            >
              {expandedFolders[folder.id] ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-5" />
          )}
          <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm truncate">{folder.name}</span>
          {folder.documents_count > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{folder.documents_count}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 ml-1 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateFolder(folder.id);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {folder.children && folder.children.length > 0 && expandedFolders[folder.id] && (
          <div className="ml-2">
            {renderFolderTree(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className={`border-r h-full flex flex-col ${className}`}>
      <div className="p-3 flex items-center justify-between">
        <h3 className="font-medium text-sm">Folders</h3>
        <Button variant="ghost" size="icon" onClick={() => handleCreateFolder()}>
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <div className="p-2">
        <div
          className={`flex items-center py-1 px-2 rounded-md hover:bg-muted cursor-pointer ${
            !folderId ? "bg-muted" : ""
          }`}
          onClick={() => navigate("/dashboard/documents")}
        >
          <Home className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm">All Documents</span>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : folders.length > 0 ? (
          renderFolderTree(folders)
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No folders found</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => handleCreateFolder()}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </div>
        )}
      </ScrollArea>

      <FolderCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        parentId={selectedParentFolder}
        onSuccess={handleFolderCreated}
      />
    </div>
  );
};

export default FolderSidebar;
