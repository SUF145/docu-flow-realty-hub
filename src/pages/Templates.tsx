import { useState, useEffect } from "react";
import TemplateGrid from "@/components/templates/TemplateGrid";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import TemplateUploadModal from "@/components/templates/TemplateUploadModal";

const Templates = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground">
            Browse and use document templates for common real estate needs
          </p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Upload Template
        </Button>
      </div>
      
      <TemplateGrid />
      
      <TemplateUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
};

export default Templates;
