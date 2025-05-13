
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRecentActivity, ActivityItem } from "@/lib/dashboard";

const getActivityBadge = (type: ActivityItem["type"]) => {
  switch (type) {
    case "upload":
      return <Badge className="bg-blue-500">Uploaded</Badge>;
    case "approval":
      return <Badge className="bg-green-500">Approved</Badge>;
    case "rejection":
      return <Badge className="bg-red-500">Rejected</Badge>;
    case "comment":
      return <Badge className="bg-yellow-500">Commented</Badge>;
    case "update":
      return <Badge className="bg-purple-500">Updated</Badge>;
    default:
      return null;
  }
};

const getActionVerb = (action: string): string => {
  switch (action) {
    case "created":
      return "uploaded";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "commented":
      return "commented on";
    case "updated":
      return "updated";
    default:
      return action;
  }
};

const RecentActivity = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const data = await getRecentActivity(10);
        setActivities(data);
      } catch (error) {
        console.error("Error fetching recent activities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest document activities across your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-5">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <Avatar>
                    <AvatarFallback>{item.user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {item.user.name}{" "}
                        <span className="text-muted-foreground">{getActionVerb(item.action)}</span>{" "}
                        <Link
                          to={`/documents/${item.document.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.document.name}
                        </Link>
                      </p>
                      {getActivityBadge(item.type)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
