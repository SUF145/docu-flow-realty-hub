import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, FolderPlus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getFolderTemplatesBySegment, FolderTemplate, FolderNode } from "@/lib/onboarding";

interface FolderTemplateSelectorProps {
  industrySegmentId: string;
  onSelect: (template: FolderTemplate | null) => void;
  onBack: () => void;
}

const FolderTemplateSelector = ({ 
  industrySegmentId, 
  onSelect, 
  onBack 
}: FolderTemplateSelectorProps) => {
  const [templates, setTemplates] = useState<FolderTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const data = await getFolderTemplatesBySegment(industrySegmentId);
        setTemplates(data);
      } catch (error) {
        console.error("Error fetching folder templates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [industrySegmentId]);

  const handleSelect = (template: FolderTemplate) => {
    setSelectedTemplate(template.id);
    onSelect(template);
  };

  const handleCustomFolders = () => {
    onSelect(null); // Null indicates custom folders
  };

  const toggleExpandTemplate = (templateId: string) => {
    if (expandedTemplate === templateId) {
      setExpandedTemplate(null);
    } else {
      setExpandedTemplate(templateId);
    }
  };

  // Recursive function to render folder structure
  const renderFolderStructure = (folders: FolderNode[], level = 0) => {
    return (
      <ul className={`pl-${level * 4} mt-1`}>
        {folders.map((folder, index) => (
          <li key={index} className="py-1">
            <div className="flex items-center">
              <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{folder.name}</span>
            </div>
            {folder.folders && folder.folders.length > 0 && (
              renderFolderStructure(folder.folders, level + 1)
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select a Folder Structure</h2>
        <p className="text-muted-foreground">
          Choose a pre-designed folder structure or create your own custom folders
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedTemplate === template.id ? 'border-2 border-primary' : ''
            }`}
            onClick={() => handleSelect(template)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Folder className="h-6 w-6 mr-2" />
                {template.name}
              </CardTitle>
              <CardDescription>
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpandTemplate(template.id);
                }}
              >
                {expandedTemplate === template.id ? 'Hide Structure' : 'Preview Structure'}
                {expandedTemplate === template.id ? (
                  <ChevronRight className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronRight className="ml-2 h-4 w-4" />
                )}
              </Button>
              
              {expandedTemplate === template.id && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                  {renderFolderStructure(template.structure.folders)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Custom folder option */}
        <Card 
          className={`cursor-pointer transition-all hover:border-primary ${
            selectedTemplate === 'custom' ? 'border-2 border-primary' : ''
          }`}
          onClick={() => {
            setSelectedTemplate('custom');
            handleCustomFolders();
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <FolderPlus className="h-6 w-6 mr-2" />
              Create Custom Folder Structure
            </CardTitle>
            <CardDescription>
              Design your own folder organization from scratch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You'll be able to create and organize folders according to your specific needs.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
};

export default FolderTemplateSelector;
