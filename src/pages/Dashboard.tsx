
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, FileText, Users, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import StatCard from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import PendingApprovals from "@/components/dashboard/PendingApprovals";
import DocumentUploadModal from "@/components/documents/DocumentUploadModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/dashboard";
import { getDocuments } from "@/lib/documents";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocumentsCount: 0,
    pendingDocumentsCount: 0,
    activeUsersCount: 0,
    overdueItemsCount: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch dashboard statistics
        const dashboardStats = await getDashboardStats();
        setStats(dashboardStats);

        // Fetch recent documents
        const documents = await getDocuments();
        setRecentDocuments(documents.slice(0, 4)); // Get the 4 most recent documents
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getFileIcon = (fileType: string) => {
    if (!fileType) return "file-icon-other";
    if (fileType.includes("pdf")) return "file-icon-pdf";
    if (fileType.includes("word") || fileType.includes("doc")) return "file-icon-doc";
    if (fileType.includes("excel") || fileType.includes("sheet") || fileType.includes("xls")) return "file-icon-xls";
    if (fileType.includes("image") || fileType.includes("png") || fileType.includes("jpg")) return "file-icon-img";
    return "file-icon-other";
  };

  const getRelativeTime = (timestamp: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your document approvals and activities
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalDocumentsCount}
          description="Documents in system"
          icon={FileText}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Pending Approvals"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.pendingDocumentsCount}
          description="Awaiting review"
          icon={CheckSquare}
          iconColor="text-yellow-500"
        />
        <StatCard
          title="Active Users"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.activeUsersCount}
          description="Using the platform"
          icon={Users}
          iconColor="text-green-500"
        />
        <StatCard
          title="Overdue Items"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.overdueItemsCount}
          description="Past due date"
          icon={AlertCircle}
          iconColor="text-red-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {user && <PendingApprovals userId={user.id} />}
        <RecentActivity />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-24 flex-col" onClick={() => setIsUploadModalOpen(true)}>
                <FileText className="h-6 w-6 mb-2" />
                <span>Upload Document</span>
              </Button>
              <Button className="h-24 flex-col" variant="outline" onClick={() => setIsUploadModalOpen(true)}>
                <CheckSquare className="h-6 w-6 mb-2" />
                <span>Start Approval Flow</span>
              </Button>
              <Button className="h-24 flex-col" variant="outline" as={Link} to="/settings?tab=users">
                <Users className="h-6 w-6 mb-2" />
                <span>Invite Team Member</span>
              </Button>
              <Button className="h-24 flex-col" variant="outline" as={Link} to="/approvals?filter=overdue">
                <AlertCircle className="h-6 w-6 mb-2" />
                <span>View Overdue Items</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Documents</CardTitle>
            <Link to="/documents">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.map((doc: any, index: number) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between ${
                      index < recentDocuments.length - 1 ? "border-b pb-3" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`file-icon ${getFileIcon(doc.file_type)}`}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {getRelativeTime(doc.updated_at)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" as={Link} to={`/documents/${doc.id}`}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No documents found</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Upload Your First Document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          // Refresh dashboard data after successful upload
          getDashboardStats().then(setStats);
          getDocuments().then(docs => setRecentDocuments(docs.slice(0, 4)));
        }}
      />
    </div>
  );
};

export default Dashboard;
