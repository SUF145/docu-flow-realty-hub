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
import { Template } from "@/lib/templates";
import { Loader2, Download, FileText } from "lucide-react";
import { PDFViewer } from "../documents/PDFViewer";

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUse: () => void;
  template: Template;
}

const TemplatePreviewModal = ({ 
  isOpen, 
  onClose, 
  onUse,
  template 
}: TemplatePreviewModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDocx, setIsDocx] = useState(false);

  useEffect(() => {
    if (isOpen && template) {
      setIsLoading(true);
      
      // Check if the template is a DOCX file
      const isDocxFile = template.file_template_url.toLowerCase().endsWith('.docx') || 
                         template.file_template_url.toLowerCase().endsWith('.doc');
      setIsDocx(isDocxFile);
      
      // For PDF files, we can directly use the URL
      // For DOCX files, we would need a conversion service in a real app
      // For this implementation, we'll just show a placeholder for DOCX
      if (!isDocxFile) {
        setPreviewUrl(template.file_template_url);
      } else {
        // In a real implementation, you would convert DOCX to PDF or HTML for preview
        setPreviewUrl(null);
      }
      
      setIsLoading(false);
    }
  }, [isOpen, template]);

  const handleDownload = () => {
    // Create a link element and trigger download
    const link = document.createElement("a");
    link.href = template.file_template_url;
    link.download = template.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: `Downloading ${template.title}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview: {template?.title}</DialogTitle>
          <DialogDescription>
            Preview the template before using it to create a document.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-[400px] mt-4 border rounded-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isDocx ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Word Document Preview</h3>
              <p className="text-muted-foreground mb-4">
                Preview is not available for Word documents. You can download the template to view it.
              </p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          ) : previewUrl ? (
            <PDFViewer fileUrl={previewUrl} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUse}>
            Use Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewModal;
