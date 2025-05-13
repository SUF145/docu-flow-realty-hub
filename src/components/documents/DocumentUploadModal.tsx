import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocument } from "@/lib/documents";
import { getDocumentTypes, getUsers } from "@/lib/supabase";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

const documentUploadSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
  document_type_id: z.string().optional(),
  approvers: z.array(z.string()).optional(),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    })
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), {
      message: "File type not supported. Please upload a PDF, Word, Excel, or image file.",
    }),
});

type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (documentId: string) => void;
}

const DocumentUploadModal = ({ isOpen, onClose, onSuccess }: DocumentUploadModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      title: "",
      description: "",
      document_type_id: undefined,
      approvers: [],
      file: undefined,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data for document upload modal...");

        // Fetch document types and users separately to better handle errors
        let docTypes = [];
        let usersList = [];

        try {
          docTypes = await getDocumentTypes();
          console.log("Document types fetched:", docTypes.length);
        } catch (docTypesError) {
          console.error("Error fetching document types:", docTypesError);
          // Use default document types
          docTypes = [
            { id: "1", name: "Contract", description: "Legal contract documents" },
            { id: "2", name: "Invoice", description: "Payment invoices" },
            { id: "3", name: "Report", description: "Analysis and reporting documents" }
          ];
        }

        try {
          usersList = await getUsers();
          console.log("Users fetched:", usersList.length);
        } catch (usersError) {
          console.error("Error fetching users:", usersError);
          // Use default users
          usersList = [
            { id: '1', name: 'John Doe', email: 'john.doe@example.com', role: 'Admin' },
            { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'User' },
            { id: '3', name: 'Bob Johnson', email: 'bob.johnson@example.com', role: 'User' }
          ];
        }

        setDocumentTypes(docTypes);
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching data for document upload:", error);

        // Set default values even if there's an error
        setDocumentTypes([
          { id: "1", name: "Contract", description: "Legal contract documents" },
          { id: "2", name: "Invoice", description: "Payment invoices" },
          { id: "3", name: "Report", description: "Analysis and reporting documents" }
        ]);

        setUsers([
          { id: '1', name: 'John Doe', email: 'john.doe@example.com', role: 'Admin' },
          { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'User' },
          { id: '3', name: 'Bob Johnson', email: 'bob.johnson@example.com', role: 'User' }
        ]);

        toast({
          title: "Warning",
          description: "Using sample data. Some features may be limited.",
          variant: "default",
        });
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, toast]);

  const handleSubmit = async (data: DocumentUploadFormData) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload documents.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await uploadDocument(data, user.id);
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully.",
      });
      form.reset();
      setSelectedFile(null);
      onClose();
      if (onSuccess && result) {
        onSuccess(result.id);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      form.setValue("file", file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      form.setValue("file", file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    form.setValue("file", undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a new document and optionally start an approval workflow.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter document title" {...field} />
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
                      placeholder="Enter a brief description of the document"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="document_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes.map((type: any) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="approvers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Approvers (Optional)</FormLabel>

                  {/* Simple Select implementation instead of Popover */}
                  <div className="border rounded-md p-4">
                    <p className="text-sm font-medium mb-2">
                      {field.value?.length
                        ? `${field.value.length} approver(s) selected`
                        : "Select approvers"}
                    </p>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {users.map((user: any) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => {
                            const current = field.value || [];
                            const isSelected = current.includes(user.id);
                            const newValue = isSelected
                              ? current.filter((id) => id !== user.id)
                              : [...current, user.id];
                            field.onChange(newValue);
                          }}
                        >
                          <div className={cn(
                            "w-4 h-4 border rounded-sm flex items-center justify-center",
                            field.value?.includes(user.id) ? "bg-primary border-primary" : "border-input"
                          )}>
                            {field.value?.includes(user.id) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <span>{user.name} ({user.email})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Document File</FormLabel>
                  <FormControl>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer",
                        dragActive ? "border-primary bg-primary/10" : "border-border",
                        selectedFile ? "py-3" : "py-10"
                      )}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_FILE_TYPES.join(",")}
                        onChange={handleFileChange}
                        {...fieldProps}
                      />
                      {selectedFile ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile();
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium mb-1">
                            Drag and drop your file here or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supports PDF, Word, Excel, and image files up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedFile}>
                {isLoading ? "Uploading..." : "Upload Document"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadModal;
