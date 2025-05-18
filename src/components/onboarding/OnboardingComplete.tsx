import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingCompleteProps {
  isCustom: boolean;
}

const OnboardingComplete = ({ isCustom }: OnboardingCompleteProps) => {
  const { user } = useAuth();

  // When this component mounts, mark the user as onboarded in the database
  useEffect(() => {
    const markUserAsOnboarded = async () => {
      if (user) {
        try {
          console.log("Marking user as onboarded in the database");

          // Update the user_onboarding record to mark the user as onboarded
          const { error } = await supabase
            .from('user_onboarding')
            .update({
              is_onboarded: true,
              onboarded_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            console.error("Error marking user as onboarded:", error);
          } else {
            console.log("User marked as onboarded successfully");

            // Store onboarding completion in localStorage for persistence
            localStorage.setItem('userOnboarded', 'true');
          }
        } catch (error) {
          console.error("Error updating onboarding status:", error);
        }
      }
    };

    markUserAsOnboarded();
  }, [user]);

  const handleGoToDashboard = () => {
    // Store onboarding completion in localStorage for persistence
    localStorage.setItem('userOnboarded', 'true');

    // Set a special flag to bypass the onboarding redirect
    sessionStorage.setItem('bypassOnboardingRedirect', 'true');

    // Log tenant information before navigation
    try {
      const storedTenant = sessionStorage.getItem('currentTenant');
      if (storedTenant) {
        const tenant = JSON.parse(storedTenant);
        console.log("Navigating to dashboard with tenant:", tenant);
      } else {
        console.warn("No tenant found in session storage before navigation");
      }
    } catch (error) {
      console.error("Error parsing stored tenant before navigation:", error);
    }

    console.log("Directly navigating to dashboard, bypassing RequireAuth redirect");

    // Force a full page reload with a special parameter to bypass the onboarding redirect
    window.location.href = "/dashboard?completed=true";
  };

  const handleGoToDocuments = () => {
    // Store onboarding completion in localStorage for persistence
    localStorage.setItem('userOnboarded', 'true');

    // Set a special flag to bypass the onboarding redirect
    sessionStorage.setItem('bypassOnboardingRedirect', 'true');

    // Log tenant information before navigation
    try {
      const storedTenant = sessionStorage.getItem('currentTenant');
      if (storedTenant) {
        const tenant = JSON.parse(storedTenant);
        console.log("Navigating to documents with tenant:", tenant);

        // Ensure user metadata has tenant_id
        if (user) {
          console.log("Current user metadata:", user.user_metadata);
        }
      } else {
        console.warn("No tenant found in session storage before navigation to documents");
      }
    } catch (error) {
      console.error("Error parsing stored tenant before navigation to documents:", error);
    }

    console.log("Directly navigating to documents page, bypassing RequireAuth redirect");

    // Force a full page reload with a special parameter to bypass the onboarding redirect
    window.location.href = "/dashboard/documents?completed=true";
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <CardTitle className="text-center text-2xl">Setup Complete!</CardTitle>
        <CardDescription className="text-center">
          Your document management system is ready to use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center">
          {isCustom
            ? "You've chosen to create a custom folder structure. You can now start creating folders and uploading documents."
            : "Your folder structure has been created. You can now start uploading documents to the appropriate folders."}
        </p>

        <div className="bg-muted p-4 rounded-md">
          <h3 className="font-medium mb-2">What's next?</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Explore your document management system</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Upload your first documents</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Invite team members to collaborate</span>
            </li>
            {isCustom && (
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Create your first folder structure</span>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button className="w-full" onClick={handleGoToDocuments}>
          Go to Documents
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" className="w-full" onClick={handleGoToDashboard}>
          Go to Dashboard
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OnboardingComplete;
