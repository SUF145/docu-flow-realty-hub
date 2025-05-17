import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import IndustrySegmentSelector from "./IndustrySegmentSelector";
import FolderTemplateSelector from "./FolderTemplateSelector";
import OnboardingComplete from "./OnboardingComplete";
import {
  IndustrySegment,
  FolderTemplate,
  generateFolderStructure,
  completeCustomOnboarding
} from "@/lib/onboarding";

enum OnboardingStep {
  INDUSTRY_SEGMENT = 0,
  FOLDER_TEMPLATE = 1,
  PROCESSING = 2,
  COMPLETE = 3
}

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.INDUSTRY_SEGMENT);
  const [selectedSegment, setSelectedSegment] = useState<IndustrySegment | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FolderTemplate | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const handleSegmentSelect = (segment: IndustrySegment) => {
    setSelectedSegment(segment);
    setCurrentStep(OnboardingStep.FOLDER_TEMPLATE);
  };

  const handleTemplateSelect = async (template: FolderTemplate | null) => {
    setSelectedTemplate(template);
    setIsCustom(template === null);
    setCurrentStep(OnboardingStep.PROCESSING);
    setIsProcessing(true);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      let success = false;

      // Get tenant ID if available
      const tenantId = currentTenant?.id;

      if (template) {
        // Generate folder structure from template
        success = await generateFolderStructure(template.id, user.id, tenantId);
      } else if (selectedSegment) {
        // Custom folder structure (just mark as onboarded)
        success = await completeCustomOnboarding(user.id, selectedSegment.id, tenantId);
      }

      if (success) {
        setCurrentStep(OnboardingStep.COMPLETE);
        toast({
          title: "Setup Complete",
          description: template
            ? "Your folder structure has been created successfully."
            : "You're all set to create your custom folder structure.",
        });
      } else {
        throw new Error("Failed to complete setup");
      }
    } catch (error) {
      console.error("Error in onboarding process:", error);
      toast({
        title: "Setup Failed",
        description: "There was a problem setting up your account. Please try again.",
        variant: "destructive",
      });
      // Go back to template selection
      setCurrentStep(OnboardingStep.FOLDER_TEMPLATE);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (currentStep === OnboardingStep.FOLDER_TEMPLATE) {
      setCurrentStep(OnboardingStep.INDUSTRY_SEGMENT);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case OnboardingStep.INDUSTRY_SEGMENT:
        return <IndustrySegmentSelector onSelect={handleSegmentSelect} />;

      case OnboardingStep.FOLDER_TEMPLATE:
        return selectedSegment ? (
          <FolderTemplateSelector
            industrySegmentId={selectedSegment.id}
            onSelect={handleTemplateSelect}
            onBack={handleBack}
          />
        ) : null;

      case OnboardingStep.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setting Up Your Account</h2>
            <p className="text-muted-foreground text-center">
              {isCustom
                ? "Preparing your workspace..."
                : "Creating your folder structure..."}
            </p>
          </div>
        );

      case OnboardingStep.COMPLETE:
        return <OnboardingComplete isCustom={isCustom} />;

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="border-none shadow-none">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl">Welcome to DocuFlow Realty Hub</CardTitle>
          <p className="text-muted-foreground">
            Let's set up your document management system
          </p>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;
