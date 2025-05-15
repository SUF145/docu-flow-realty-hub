import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const folderCreateSchema = z.object({
  name: z.string().min(1, { message: "Folder name is required" }).max(100),
  description: z.string().optional(),
});

type FolderCreateFormData = z.infer<typeof folderCreateSchema>;

interface FolderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
  onSuccess?: () => void;
}

const FolderCreateModal = ({ isOpen, onClose, parentId, onSuccess }: FolderCreateModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FolderCreateFormData>({
    resolver: zodResolver(folderCreateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleSubmit = async (data: FolderCreateFormData) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create folders.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Creating folder with data:", {
        name: data.name,
        description: data.description,
        parent_id: parentId,
        userId: user.id
      });

      // Direct Supabase insert for more control
      const { data: newFolder, error } = await supabase
        .from('folders')
        .insert([
          {
            name: data.name,
            description: data.description || '',
            parent_id: parentId || null,
            created_by: user.id
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating folder via direct insert:", error);
        throw new Error(`Failed to create folder: ${error.message}`);
      }

      console.log("Folder created successfully via direct insert:", newFolder);

      toast({
        title: "Folder Created",
        description: "Your folder has been created successfully.",
      });

      form.reset();
      onClose();

      // Add a small delay before refreshing the folder list
      // This gives Supabase time to process the change
      setTimeout(() => {
        if (onSuccess) {
          console.log("Calling onSuccess callback to refresh folders");
          onSuccess();
        }
      }, 1000);
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Creation Failed",
        description: "There was an error creating your folder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your documents.
            {parentId && " This folder will be created inside the selected folder."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter folder name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter folder description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Folder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FolderCreateModal;
