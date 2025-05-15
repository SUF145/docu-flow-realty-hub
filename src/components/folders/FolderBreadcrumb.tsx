import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Folder, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder as FolderType, getFolderPath } from "@/lib/folders";

interface FolderBreadcrumbProps {
  folderId?: string;
  className?: string;
}

const FolderBreadcrumb = ({ folderId, className }: FolderBreadcrumbProps) => {
  const [folderPath, setFolderPath] = useState<FolderType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (folderId) {
      fetchFolderPath();
    } else {
      setFolderPath([]);
    }
  }, [folderId]);

  const fetchFolderPath = async () => {
    if (!folderId) return;
    
    setIsLoading(true);
    try {
      const path = await getFolderPath(folderId);
      setFolderPath(path);
    } catch (error) {
      console.error("Error fetching folder path:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <Skeleton className="h-5 w-20" />
        <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  return (
    <div className={`flex items-center flex-wrap ${className}`}>
      <Link
        to="/documents"
        className="flex items-center text-sm hover:underline"
      >
        <Home className="h-4 w-4 mr-1" />
        All Documents
      </Link>
      
      {folderPath.map((folder, index) => (
        <div key={folder.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
          {index === folderPath.length - 1 ? (
            <span className="flex items-center text-sm font-medium">
              <Folder className="h-4 w-4 mr-1" />
              {folder.name}
            </span>
          ) : (
            <Link
              to={`/documents/folders/${folder.id}`}
              className="flex items-center text-sm hover:underline"
            >
              <Folder className="h-4 w-4 mr-1" />
              {folder.name}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
};

export default FolderBreadcrumb;
