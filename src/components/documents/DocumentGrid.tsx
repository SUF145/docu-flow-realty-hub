
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DocumentCard from "./DocumentCard";
import DocumentUploadModal from "./DocumentUploadModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, LayoutGrid, List, Upload, Loader2 } from "lucide-react";
import { getDocuments, toggleDocumentFavorite } from "@/lib/documents";
import { getDocumentsInFolder, getDocumentsInFolderTree } from "@/lib/folders";
import { useToast } from "@/hooks/use-toast";

interface DocumentCardProps {
  id: string;
  title: string;
  type: "pdf" | "doc" | "xls" | "img" | "other";
  status: "draft" | "pending" | "approved" | "rejected";
  updatedAt: string;
  owner: {
    name: string;
    initials: string;
  };
  favorited?: boolean;
}

interface DocumentGridProps {
  folderId?: string;
  includeSubfolders?: boolean;
}

const DocumentGrid = ({ folderId, includeSubfolders = true }: DocumentGridProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [folderId, includeSubfolders]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      let data;

      if (folderId) {
        // Fetch documents from the specified folder
        if (includeSubfolders) {
          data = await getDocumentsInFolderTree(folderId);
        } else {
          data = await getDocumentsInFolder(folderId);
        }
      } else {
        // Fetch all documents
        data = await getDocuments();
      }

      // Transform the data to match the DocumentCardProps interface
      const formattedDocuments = data.map((doc) => {
        // Determine document type from file_type or file extension
        let type: "pdf" | "doc" | "xls" | "img" | "other" = "other";
        if (doc.file_type) {
          if (doc.file_type.includes("pdf")) type = "pdf";
          else if (doc.file_type.includes("word") || doc.file_type.includes("doc")) type = "doc";
          else if (doc.file_type.includes("excel") || doc.file_type.includes("sheet") || doc.file_type.includes("xls")) type = "xls";
          else if (doc.file_type.includes("image")) type = "img";
        } else if (doc.file_path) {
          const ext = doc.file_path.split('.').pop()?.toLowerCase();
          if (ext === "pdf") type = "pdf";
          else if (["doc", "docx"].includes(ext)) type = "doc";
          else if (["xls", "xlsx", "csv"].includes(ext)) type = "xls";
          else if (["jpg", "jpeg", "png", "gif", "bmp"].includes(ext)) type = "img";
        }

        // Get owner information
        const ownerName = doc.profiles?.name || "Unknown";
        const initials = ownerName
          .split(' ')
          .map(name => name[0])
          .join('')
          .toUpperCase();

        // Check if the document is favorited by the current user
        const favorited = doc.metadata?.favorited_by?.includes(user?.id);

        // Format the updated date as a relative time
        const updatedAt = getRelativeTime(doc.updated_at);

        return {
          id: doc.id,
          title: doc.title,
          type,
          status: doc.status as "draft" | "pending" | "approved" | "rejected",
          updatedAt,
          owner: {
            name: ownerName,
            initials,
          },
          favorited,
        };
      });

      setDocuments(formattedDocuments);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavorite = async (id: string, favorited: boolean) => {
    if (!user) return;

    try {
      await toggleDocumentFavorite(id, user.id, favorited);

      // Update local state
      setDocuments(documents.map(doc =>
        doc.id === id ? { ...doc, favorited } : doc
      ));
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRelativeTime = (timestamp: string): string => {
    if (!timestamp) return "Unknown";

    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;

    return date.toLocaleDateString();
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = documents
    .filter((doc) => {
      // Apply status/favorites filter
      if (activeFilter === "all") return true;
      if (activeFilter === "favorites") return doc.favorited;
      return doc.status === activeFilter;
    })
    .filter((doc) =>
      // Apply search filter
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Apply sorting
      switch (sortOrder) {
        case "newest":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "oldest":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "name":
          return a.title.localeCompare(b.title);
        case "name-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-auto flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={sortOrder}
            onValueChange={setSortOrder}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-none ${viewMode === "grid" ? "bg-muted" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-none ${viewMode === "list" ? "bg-muted" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List size={18} />
            </Button>
          </div>

          <Button className="gap-1" onClick={() => setIsUploadModalOpen(true)}>
            <Upload size={16} className="mr-1" />
            Upload
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          All
        </Button>
        <Button
          variant={activeFilter === "favorites" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("favorites")}
        >
          Favorites
        </Button>
        <Button
          variant={activeFilter === "draft" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("draft")}
        >
          Drafts
        </Button>
        <Button
          variant={activeFilter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("pending")}
        >
          Pending
        </Button>
        <Button
          variant={activeFilter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={activeFilter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("rejected")}
        >
          Rejected
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAndSortedDocuments.length > 0 ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>
          {filteredAndSortedDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onFavorite={handleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed rounded-md">
          <p className="text-muted-foreground mb-4">No documents found</p>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Plus size={16} className="mr-1" />
            Upload Document
          </Button>
        </div>
      )}

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentFolderId={folderId}
        onSuccess={() => {
          fetchDocuments();
        }}
      />
    </div>
  );
};

export default DocumentGrid;
