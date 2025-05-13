import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
import { Template, useTemplate, TemplateUse } from "@/lib/templates";
import TemplateApproverModal from "./TemplateApproverModal";

interface TemplateUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
}

const TemplateUseModal = ({ isOpen, onClose, template }: TemplateUseModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [showApproverModal, setShowApproverModal] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  // Extract placeholders from template
  useEffect(() => {
    if (template) {
      // For this example, we'll use some default placeholders
      // In a real implementation, you would extract these from the template file
      // or use the placeholders field from the template record
      const defaultPlaceholders = [
        "CustomerName",
        "Address",
        "ProjectName",
        "Date",
        "Amount"
      ];
      
      // If template has placeholders defined, use those instead
      const templatePlaceholders = template.placeholders 
        ? Object.keys(template.placeholders)
        : defaultPlaceholders;
        
      setPlaceholders(templatePlaceholders);
    }
  }, [template]);

  // Dynamically create form schema based on placeholders
  const createFormSchema = () => {
    const schemaFields: Record<string, any> = {
      title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    };
    
    // Add placeholder fields to schema
    placeholders.forEach(placeholder => {
      schemaFields[placeholder] = z.string().optional();
    });
    
    return z.object(schemaFields);
  };

  const form = useForm<any>({
    resolver: zodResolver(createFormSchema()),
    defaultValues: {
      title: template?.title || "",
      ...placeholders.reduce((acc, placeholder) => {
        acc[placeholder] = "";
        return acc;
      }, {} as Record<string, string>)
    },
  });

  // Update form when template or placeholders change
  useEffect(() => {
    if (template && placeholders.length > 0) {
      form.reset({
        title: template.title || "",
        ...placeholders.reduce((acc, placeholder) => {
          acc[placeholder] = "";
          return acc;
        }, {} as Record<string, string>)
      });
    }
  }, [template, placeholders, form]);

  const handleSubmit = async (data: any) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to use templates.",
        variant: "destructive",
      });
      return;
    }

    // Store form data for later use
    setFormData(data);
    
    // Show approver selection modal
    setShowApproverModal(true);
  };

  const handleFinalSubmit = async (approvers?: string[]) => {
    if (!formData) return;
    
    setIsLoading(true);
    try {
      // Extract placeholder values
      const placeholderValues: Record<string, string> = {};
      placeholders.forEach(placeholder => {
        placeholderValues[placeholder] = formData[placeholder] || "";
      });
      
      // Create template use object
      const templateUse: TemplateUse = {
        templateId: template.id,
        title: formData.title,
        placeholderValues,
        approvers
      };
      
      // Use template to create document
      const documentId = await useTemplate(templateUse, user.id);
      
      if (documentId) {
        toast({
          title: "Document Created",
          description: "Your document has been created successfully.",
        });
        
        // Close modals
        setShowApproverModal(false);
        onClose();
        
        // Navigate to the document
        navigate(`/documents/${documentId}`);
      } else {
        throw new Error("Failed to create document");
      }
    } catch (error) {
      console.error("Error using template:", error);
      toast({
        title: "Error",
        description: "Failed to create document from template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showApproverModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Use Template: {template?.title}</DialogTitle>
            <DialogDescription>
              Fill in the details to create a document from this template.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter document title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Dynamically render fields for each placeholder */}
              {placeholders.map(placeholder => (
                <FormField
                  key={placeholder}
                  control={form.control}
                  name={placeholder}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{placeholder}</FormLabel>
                      <FormControl>
                        <Input placeholder={`Enter ${placeholder}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Processing..." : "Continue"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Approver selection modal */}
      <TemplateApproverModal
        isOpen={showApproverModal}
        onClose={() => setShowApproverModal(false)}
        onSubmit={handleFinalSubmit}
        isLoading={isLoading}
      />
    </>
  );
};

export default TemplateUseModal;
