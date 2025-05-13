import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getUsers } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TemplateApproverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (approvers?: string[]) => void;
  isLoading: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const TemplateApproverModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isLoading 
}: TemplateApproverModalProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApproverToggle = (userId: string) => {
    setSelectedApprovers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedApprovers.length > 0) {
      onSubmit(selectedApprovers);
    } else {
      // If no approvers selected, confirm with user
      onSubmit();
    }
  };

  const handleSkip = () => {
    onSubmit();
  };

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Approvers</DialogTitle>
          <DialogDescription>
            Select users who need to approve this document. You can skip this step if no approval is needed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {loadingUsers ? (
            <div className="text-center py-4">Loading users...</div>
          ) : users.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                    <Checkbox 
                      id={`user-${user.id}`} 
                      checked={selectedApprovers.includes(user.id)}
                      onCheckedChange={() => handleApproverToggle(user.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <Label 
                      htmlFor={`user-${user.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-4">No users found</div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSkip}
            disabled={isLoading}
          >
            Skip Approvers
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isLoading || selectedApprovers.length === 0}
          >
            {isLoading ? "Processing..." : "Add Approvers"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateApproverModal;
