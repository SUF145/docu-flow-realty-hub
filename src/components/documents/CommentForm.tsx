import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logDocumentActivity } from "@/lib/documents";

const commentSchema = z.object({
  content: z.string().min(1, { message: "Comment cannot be empty." }),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentFormProps {
  documentId: string;
  onCommentAdded?: () => void;
}

const CommentForm = ({ documentId, onCommentAdded }: CommentFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  const handleSubmit = async (data: CommentFormData) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add comments.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Add comment to the comments table
      const { error: commentError } = await supabase
        .from("comments")
        .insert([
          {
            document_id: documentId,
            user_id: user.id,
            content: data.content,
          },
        ]);

      if (commentError) {
        throw commentError;
      }

      // Log the activity
      await logDocumentActivity(documentId, user.id, "commented", {
        comment: data.content.substring(0, 100) + (data.content.length > 100 ? "..." : ""),
      });

      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });

      // Reset the form
      form.reset();

      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded();
      }
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Add a comment..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Adding Comment..." : "Add Comment"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CommentForm;
