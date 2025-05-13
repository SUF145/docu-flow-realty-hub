
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckSquare, X, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getPendingApprovalsForUser } from "@/lib/dashboard";
import { approveDocument, rejectDocument } from "@/lib/approvals";

interface ApprovalItem {
  id: string;
  documentId: string;
  title: string;
  documentType: string;
  priority: "low" | "medium" | "high";
  submittedBy: string;
  submittedDate: string;
  dueDate: string;
  status: "pending" | "overdue";
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return <Badge className="bg-red-500">High</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500">Medium</Badge>;
    case "low":
      return <Badge className="bg-green-500">Low</Badge>;
    default:
      return null;
  }
};

interface PendingApprovalsProps {
  userId: string;
}

const PendingApprovals = ({ userId }: PendingApprovalsProps) => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchApprovals = async () => {
      setIsLoading(true);
      try {
        const data = await getPendingApprovalsForUser(userId);
        setApprovals(data);
      } catch (error) {
        console.error("Error fetching pending approvals:", error);
        toast({
          title: "Error",
          description: "Failed to load pending approvals. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchApprovals();
    }
  }, [userId, toast]);

  const handleApprove = async (approval: ApprovalItem) => {
    setIsProcessing(true);
    try {
      await approveDocument(approval.id, userId, approval.documentId);

      // Update local state
      setApprovals(approvals.filter(a => a.id !== approval.id));

      toast({
        title: "Document Approved",
        description: "The document has been approved successfully.",
      });
    } catch (error) {
      console.error("Error approving document:", error);
      toast({
        title: "Approval Failed",
        description: "There was an error approving the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectionDialog = (approval: ApprovalItem) => {
    setSelectedApproval(approval);
    setRejectionComment("");
    setIsRejectionDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedApproval) return;

    setIsProcessing(true);
    try {
      await rejectDocument(selectedApproval.id, userId, selectedApproval.documentId, rejectionComment);

      // Update local state
      setApprovals(approvals.filter(a => a.id !== selectedApproval.id));

      toast({
        title: "Document Rejected",
        description: "The document has been rejected successfully.",
      });

      setIsRejectionDialogOpen(false);
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Rejection Failed",
        description: "There was an error rejecting the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="col-span-1 md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Documents awaiting your approval</CardDescription>
          </div>
          <Link to="/approvals">
            <Button variant="outline">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : approvals.length > 0 ? (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex flex-col space-y-3 p-4 border border-border rounded-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="file-icon file-icon-pdf">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">{approval.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {approval.documentType} • Submitted by {approval.submittedBy} on {approval.submittedDate}
                        </p>
                      </div>
                    </div>
                    {getPriorityBadge(approval.priority)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {approval.status === "overdue" ? (
                        <div className="flex items-center text-red-500 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          <span>Due {approval.dueDate} (Overdue)</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Due {approval.dueDate}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => openRejectionDialog(approval)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(approval)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckSquare className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pending approvals found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectionDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionComment.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingApprovals;
