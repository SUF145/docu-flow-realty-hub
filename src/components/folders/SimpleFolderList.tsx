import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder, FolderPlus, Home, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FolderCreateModal from "./FolderCreateModal";

interface SimpleFolderListProps {
  className?: string;
}

interface SimpleFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

const SimpleFolderList = ({ className }: SimpleFolderListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId: string }>();
  
  const [folders, setFolders] = useState<SimpleFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchFolders();
    
    // Set up an interval to refresh folders every 10 seconds
    const intervalId = setInterval(() => {
      fetchFolders(false);
    }, 10000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const fetchFolders = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    try {
      if (!user) {
        console.error("No user found");
        return;
      }
      
      // Direct query to get all folders for the current user
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, parent_id')
        .eq('created_by', user.id)
        .eq('is_deleted', false)
        .order('name');
      
      if (error) {
        console.error("Error fetching folders:", error);
        toast({
          title: "Error",
          description: "Failed to load folders. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Folders fetched directly:", data);
      setFolders(data || []);
    } catch (error) {
      console.error("Exception in fetchFolders:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const handleFolderClick = (folderId: string) => {
    navigate(`/documents/folders/${folderId}`);
  };

  const handleCreateFolder = () => {
    setIsCreateModalOpen(true);
  };

  const handleFolderCreated = () => {
    fetchFolders();
  };

  const handleRefresh = () => {
    fetchFolders();
  };

  return (
    <div className={`border-r h-full flex flex-col ${className}`}>
      <div className="p-3 flex items-center justify-between">
        <h3 className="font-medium text-sm">Folders</h3>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCreateFolder}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="p-2">
        <Button
          variant={!folderId ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => navigate("/documents")}
        >
          <Home className="h-4 w-4 mr-2" />
          <span className="text-sm">All Documents</span>
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : folders.length > 0 ? (
          <div className="space-y-1">
            {folders.map(folder => (
              <Button
                key={folder.id}
                variant={folderId === folder.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleFolderClick(folder.id)}
              >
                <Folder className="h-4 w-4 mr-2" />
                <span className="text-sm truncate">{folder.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No folders found</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={handleCreateFolder}
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
        parentId={null}
        onSuccess={handleFolderCreated}
      />
    </div>
  );
};

export default SimpleFolderList;
