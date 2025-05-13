
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DocumentViewer from "@/components/documents/DocumentViewer";
import { getDocumentById } from "@/lib/documents";
import { getDocumentApprovals } from "@/lib/approvals";
import { supabase } from "@/integrations/supabase/client";

const DocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [document, setDocument] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!id) {
        navigate("/documents");
        return;
      }

      setIsLoading(true);
      try {
        // Fetch document details
        const documentData = await getDocumentById(id);
        if (!documentData) {
          toast({
            title: "Document Not Found",
            description: "The requested document could not be found.",
            variant: "destructive",
          });
          navigate("/documents");
          return;
        }

        // Fetch document approvals
        const approvalsData = await getDocumentApprovals(id);

        // Fetch document comments
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select(`
            *,
            profiles(name, email)
          `)
          .eq("document_id", id)
          .order("created_at", { ascending: false });

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
        }

        // Fetch document activity logs
        const { data: activityData, error: activityError } = await supabase
          .from("activity_logs")
          .select(`
            *,
            profiles(name)
          `)
          .eq("document_id", id)
          .order("created_at", { ascending: false });

        if (activityError) {
          console.error("Error fetching activity logs:", activityError);
        }

        // Format document data for the viewer
        const fileType = documentData.file_type
          ? documentData.file_type.split('/').pop().toUpperCase()
          : "Document";

        const formattedDocument = {
          id: documentData.id,
          title: documentData.title,
          type: `${fileType} Document`,
          status: documentData.status,
          uploadedBy: documentData.profiles?.name || "Unknown",
          createdAt: new Date(documentData.created_at).toLocaleDateString(),
          updatedAt: new Date(documentData.updated_at).toLocaleDateString(),
          comments: commentsData?.length || 0,
          versions: activityData?.filter(log => log.action === "updated").length + 1,
          description: documentData.description,
          fileUrl: documentData.metadata?.publicUrl,
          filePath: documentData.file_path,
        };

        setDocument(formattedDocument);
        setApprovals(approvalsData);
        setComments(commentsData || []);
        setActivityLogs(activityData || []);
      } catch (error) {
        console.error("Error fetching document data:", error);
        toast({
          title: "Error",
          description: "Failed to load document data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentData();
  }, [id, navigate, toast]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-160px)] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-160px)]">
      {document && (
        <DocumentViewer
          document={document}
          approvals={approvals}
          comments={comments}
          activityLogs={activityLogs}
        />
      )}
    </div>
  );
};

export default DocumentView;
