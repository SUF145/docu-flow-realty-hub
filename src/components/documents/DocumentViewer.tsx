import { useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
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
  TabsTrigger
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PDFViewer } from "./PDFViewer";
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
  approvals: any[];
  comments: any[];
  activityLogs: any[];
}

const DocumentViewer = ({ document, approvals, comments, activityLogs }: DocumentViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("preview");
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending Approval</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    setIsLoading(true);
    try {
      // Add comment logic here
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });
      setCommentText("");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Documents
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          {getStatusIcon(document.status)}
          <h1 className="text-xl font-semibold">{document.title}</h1>
          {getStatusBadge(document.status)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        <div className="col-span-2 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="approvals">
                Approvals
                {approvals.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {approvals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments">
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                History
                {activityLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activityLogs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="flex-1 flex flex-col">
              {document.fileUrl ? (
                <div className="flex-1 border rounded-md overflow-hidden">
                  <PDFViewer fileUrl={document.fileUrl} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center border rounded-md">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No preview available</p>
                    {document.filePath && (
                      <Button variant="outline" size="sm" className="mt-2">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open File
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="details" className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle>Document Details</CardTitle>
                  <CardDescription>Information about this document</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Title</p>
                      <p className="text-sm text-muted-foreground">{document.title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-muted-foreground">{document.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(document.status)}
                        <p className="text-sm text-muted-foreground">{document.status}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Uploaded By</p>
                      <p className="text-sm text-muted-foreground">{document.uploadedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">{document.createdAt}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-sm text-muted-foreground">{document.updatedAt}</p>
                    </div>
                  </div>
                  {document.description && (
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{document.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="approvals" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Approval Workflow</CardTitle>
                  <CardDescription>
                    Track the approval status of this document
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {approvals.length > 0 ? (
                    <div className="space-y-4">
                      {approvals.map((approval, index) => (
                        <div key={approval.id} className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <Avatar>
                              <AvatarFallback>
                                {approval.profiles?.name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{approval.profiles?.name || 'Unknown User'}</p>
                              {approval.status === 'pending' ? (
                                <Badge variant="outline">Pending</Badge>
                              ) : approval.status === 'approved' ? (
                                <Badge variant="success">Approved</Badge>
                              ) : (
                                <Badge variant="destructive">Rejected</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {index === 0 ? 'Primary Approver' : `Approver ${index + 1}`}
                            </p>
                            {approval.comments && (
                              <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                                {approval.comments}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No approvers assigned to this document</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="comments" className="flex-1 flex flex-col">
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                  <CardDescription>
                    Discussion about this document
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 pr-4">
                    {comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <Avatar>
                                <AvatarFallback>
                                  {comment.profiles?.name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{comment.profiles?.name || 'Unknown User'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No comments yet</p>
                      </div>
                    )}
                  </ScrollArea>
                  <Separator className="my-4" />
                  <CommentForm
                    value={commentText}
                    onChange={setCommentText}
                    onSubmit={handleAddComment}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Activity History</CardTitle>
                  <CardDescription>
                    Timeline of actions on this document
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {activityLogs.length > 0 ? (
                      <div className="space-y-4">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <Avatar>
                                <AvatarFallback>
                                  {log.profiles?.name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{log.profiles?.name || 'Unknown User'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(log.created_at).toLocaleString()}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {log.action === 'created' && 'Created this document'}
                                {log.action === 'updated' && 'Updated this document'}
                                {log.action === 'commented' && 'Commented on this document'}
                                {log.action === 'approved' && 'Approved this document'}
                                {log.action === 'rejected' && 'Rejected this document'}
                              </p>
                              {log.details && log.details.comment && (
                                <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                                  {log.details.comment}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No activity recorded yet</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
