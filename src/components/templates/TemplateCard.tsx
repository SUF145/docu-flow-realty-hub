import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { Template } from "@/lib/templates";
import { useToast } from "@/hooks/use-toast";
import TemplateUseModal from "./TemplateUseModal";
import TemplatePreviewModal from "./TemplatePreviewModal";

interface TemplateCardProps {
  template: Template;
  viewMode: "grid" | "list";
}

const TemplateCard = ({ template, viewMode }: TemplateCardProps) => {
  const { toast } = useToast();
  const [isUseModalOpen, setIsUseModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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

  // Determine file type from URL
  const getFileType = () => {
    const url = template.file_template_url.toLowerCase();
    if (url.endsWith(".pdf")) return "PDF";
    if (url.endsWith(".doc") || url.endsWith(".docx")) return "Word";
    if (url.endsWith(".xls") || url.endsWith(".xlsx")) return "Excel";
    return "Document";
  };

  if (viewMode === "list") {
    return (
      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center gap-3">
          <div className="bg-muted p-2 rounded">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">{template.title}</h3>
            <p className="text-sm text-muted-foreground">{getFileType()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPreviewModalOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button size="sm" onClick={() => setIsUseModalOpen(true)}>
            Use Template
          </Button>
        </div>

        <TemplateUseModal
          isOpen={isUseModalOpen}
          onClose={() => setIsUseModalOpen(false)}
          template={template}
        />

        <TemplatePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          onUse={() => {
            setIsPreviewModalOpen(false);
            setIsUseModalOpen(true);
          }}
          template={template}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="bg-muted p-3 rounded-full mb-3">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-medium">{template.title}</h3>
          <p className="text-sm text-muted-foreground">{getFileType()}</p>
        </div>
        {template.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {template.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 p-4 pt-0">
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsPreviewModalOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>
        <Button size="sm" className="w-full" onClick={() => setIsUseModalOpen(true)}>
          Use Template
        </Button>
      </CardFooter>

      <TemplateUseModal
        isOpen={isUseModalOpen}
        onClose={() => setIsUseModalOpen(false)}
        template={template}
      />

      <TemplatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onUse={() => {
          setIsPreviewModalOpen(false);
          setIsUseModalOpen(true);
        }}
        template={template}
      />
    </Card>
  );
};

export default TemplateCard;
