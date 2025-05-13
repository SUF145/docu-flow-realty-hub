
import { useState } from "react";
import {
  FileText,
  Download,
  Share,
  History,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CommentForm from "./CommentForm";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DocumentViewerProps {
  document: {
    id: string;
    title: string;
    type: string;
    status: string;
    uploadedBy: string;
    createdAt: string;
    updatedAt: string;
    comments: number;
    versions: number;
    description?: string;
    fileUrl?: string;
    filePath?: string;
  };
  approvals?: any[];
  comments?: any[];
  activityLogs?: any[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="border-gray-300 text-gray-500">Draft</Badge>;
    case "pending":
      return <Badge variant="outline" className="border-yellow-300 text-yellow-600">Pending</Badge>;
    case "approved":
      return <Badge variant="outline" className="border-green-300 text-green-600">Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="border-red-300 text-red-600">Rejected</Badge>;
    default:
      return null;
  }
};

const getApprovalStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500">Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-500">Rejected</Badge>;
    case "pending":
      return <Badge variant="outline" className="border-yellow-300 text-yellow-600">Pending</Badge>;
    default:
      return <Badge variant="outline" className="border-gray-300 text-gray-500">Pending</Badge>;
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

  return date.toLocaleDateString();
};

const DocumentViewer = ({ document, approvals = [], comments = [], activityLogs = [] }: DocumentViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDownload = async () => {
    if (!document.fileUrl) {
      toast({
        title: "Download Failed",
        description: "File URL not available for this document.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Open the file URL in a new tab, which will trigger the browser's download behavior
      window.open(document.fileUrl, "_blank");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    setIsShareDialogOpen(true);
  };

  const handleCommentAdded = () => {
    setIsCommentFormOpen(false);
    setIsRefreshing(true);

    // In a real app, you would refresh the comments data here
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });
    }, 1000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <Link to="/documents">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-semibold leading-none tracking-tight">
              {document.title}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{document.type}</span>
              <span>•</span>
              {getStatusBadge(document.status)}
              <span>•</span>
              <span>Updated {document.updatedAt}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download size={16} className="mr-1" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share size={16} className="mr-1" /> Share
          </Button>
          <Button size="sm" onClick={() => setIsCommentFormOpen(true)}>
            <MessageSquare size={16} className="mr-1" /> Comment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="document" className="flex-1 flex flex-col">
        <div className="px-4 border-b">
          <TabsList>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="comments">
              Comments ({document.comments})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({document.versions})
            </TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="document" className="flex-1 p-0 m-0">
          {document.fileUrl && document.fileUrl.includes('.pdf') ? (
            <div className="h-full">
              <iframe
                src={`${document.fileUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title={document.title}
              />
            </div>
          ) : document.fileUrl ? (
            <div className="h-full flex items-center justify-center bg-gray-100 p-4">
              <div className="bg-white shadow-lg rounded-lg w-full max-w-3xl p-8 text-center">
                <FileText size={64} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">External Document</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  This document type cannot be previewed directly in the browser.
                </p>
                <Button onClick={handleDownload}>
                  <Download size={16} className="mr-2" /> Download Document
                </Button>
                {document.fileUrl && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => window.open(document.fileUrl, "_blank")}>
                      <ExternalLink size={16} className="mr-2" /> Open in New Tab
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100 p-4">
              <div className="bg-white shadow-lg rounded-lg w-full max-w-3xl aspect-[3/4] flex items-center justify-center border">
                <div className="text-center p-8">
                  <FileText size={64} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Document Preview</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    No preview available for this document
                  </p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="p-4">
          {isRefreshing ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Button onClick={() => setIsCommentFormOpen(true)}>Add Comment</Button>
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="flex flex-col gap-4">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="border rounded-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(comment.profiles?.name || "User")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{comment.profiles?.name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">
                              {getRelativeTime(comment.created_at)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No comments yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setIsCommentFormOpen(true)}
                      >
                        Add the first comment
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="p-4">
          <ScrollArea className="h-[500px] pr-4">
            <div className="flex flex-col gap-4">
              {activityLogs.length > 0 ? (
                activityLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-4 ${index > 0 ? "border-t pt-4" : ""}`}
                  >
                    <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center">
                      <History size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {log.action === "created"
                            ? "Version 1 (Initial)"
                            : `Version ${activityLogs.length - index}`}
                        </p>
                        {index === 0 && <Badge>Latest</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {log.action === "created" ? "Created" : "Updated"} by {log.profiles?.name || "Unknown"} • {getRelativeTime(log.created_at)}
                      </p>
                      <p className="text-sm mt-1">
                        {log.details?.description ||
                          (log.action === "created"
                            ? "Initial document creation"
                            : "Document updated")}
                      </p>
                      {document.fileUrl && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(document.fileUrl, "_blank")}
                          >
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No history available for this document</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="approvals" className="p-4">
          <ScrollArea className="h-[500px] pr-4">
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <h3 className="font-medium">Current Approval Flow</h3>
                {approvals.length > 0 ? (
                  <div className="space-y-2">
                    {approvals.map((approval, index) => {
                      const isCompleted = approval.status === "approved" || approval.status === "rejected";
                      const isInProgress = approval.status === "pending" &&
                        approvals.slice(0, index).every(a => a.status === "approved");

                      let bgColorClass = "bg-gray-100";
                      let textColorClass = "text-gray-400";

                      if (isCompleted && approval.status === "approved") {
                        bgColorClass = "bg-green-100";
                        textColorClass = "text-green-600";
                      } else if (isCompleted && approval.status === "rejected") {
                        bgColorClass = "bg-red-100";
                        textColorClass = "text-red-600";
                      } else if (isInProgress) {
                        bgColorClass = "bg-yellow-100";
                        textColorClass = "text-yellow-600";
                      }

                      return (
                        <div key={approval.id} className="flex items-center gap-4">
                          <div className={`h-8 w-8 ${bgColorClass} ${textColorClass} rounded-full flex items-center justify-center`}>
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {approval.profiles?.name || "Unknown Approver"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isCompleted
                                ? `${approval.status === "approved" ? "Approved" : "Rejected"} on ${new Date(approval.approved_at).toLocaleDateString()}`
                                : isInProgress
                                  ? "Pending approval"
                                  : "Waiting for previous steps"}
                              {approval.comments && ` - Comment: ${approval.comments}`}
                            </p>
                          </div>
                          {getApprovalStatusBadge(approval.status)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border rounded-md">
                    <p>No approval workflow defined for this document</p>
                  </div>
                )}
              </div>

              {approvals.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Reassign Current Step
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Skip Current Step
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/20 hover:bg-destructive/10"
                      disabled
                    >
                      Cancel Workflow
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Comment Dialog */}
      <Dialog open={isCommentFormOpen} onOpenChange={setIsCommentFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <CommentForm
            documentId={document.id}
            onCommentAdded={handleCommentAdded}
          />
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-4">Share this document with others:</p>
            <div className="flex items-center gap-2">
              <Input
                value={document.fileUrl || window.location.href}
                readOnly
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(document.fileUrl || window.location.href);
                  toast({
                    title: "Link Copied",
                    description: "Document link copied to clipboard",
                  });
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentViewer;
