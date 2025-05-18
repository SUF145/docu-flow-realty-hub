import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { checkUserOnboarding, initializeUserOnboarding } from "@/lib/onboarding";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Onboarding = () => {
  const { user, loading } = useAuth();
  const { currentTenant } = useTenant();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // First useEffect: Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || !currentTenant) return;

      setIsCheckingStatus(true);
      try {
        // Initialize onboarding record if it doesn't exist
        await initializeUserOnboarding(user.id, currentTenant.id);

        // Check onboarding status
        const onboardingStatus = await checkUserOnboarding(user.id, currentTenant.id);
        setIsOnboarded(onboardingStatus?.is_onboarded || false);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setIsOnboarded(false);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    if (user && currentTenant) {
      checkOnboardingStatus();
    }
  }, [user, currentTenant]);

  // Second useEffect: Reset onboarding status in the database
  useEffect(() => {
    const resetOnboardingInDatabase = async () => {
      if (!user || !currentTenant) return;

      try {
        console.log("Resetting onboarding status in database");

        // Always clear the onboarded flag to ensure onboarding screens appear
        localStorage.removeItem('userOnboarded');

        const { error } = await supabase
          .from('user_onboarding')
          .update({
            is_onboarded: false,
            onboarded_at: null
          })
          .eq('user_id', user.id)
          .eq('tenant_id', currentTenant.id);

        if (error) {
          console.error("Error resetting onboarding status in database:", error);
        } else {
          console.log("Successfully reset onboarding status in database");
        }
      } catch (error) {
        console.error("Exception in resetOnboardingInDatabase:", error);
      }
    };

    resetOnboardingInDatabase();
  }, [user, currentTenant]);

  // Redirect to tenant selection if no tenant is selected
  if (!currentTenant) {
    return <Navigate to="/" />;
  }

  // If user is not logged in, redirect to login
  if (!loading && !user) {
    return <Navigate to="/auth" />;
  }

  // Allow all users to access onboarding
  // We've removed the admin-only check to allow all users to go through onboarding

  // If still loading or checking status, show loading indicator
  if (loading || isCheckingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check for bypass flag or completed parameter
  const bypassRedirect = sessionStorage.getItem('bypassOnboardingRedirect') === 'true';
  const urlParams = new URLSearchParams(window.location.search);
  const completedParam = urlParams.get('completed') === 'true';

  // If bypass flag or completed parameter is set, redirect to documents
  if (bypassRedirect || completedParam) {
    console.log("Onboarding.tsx - Bypass flag or completed parameter detected, redirecting to documents");

    // Clear the bypass flag after using it
    if (bypassRedirect) {
      sessionStorage.removeItem('bypassOnboardingRedirect');
    }

    // Ensure user is marked as onboarded
    localStorage.setItem('userOnboarded', 'true');

    // Redirect to documents
    return <Navigate to="/dashboard/documents?completed=true" />;
  }

  // Otherwise, clear the onboarded flag to ensure onboarding screens appear
  localStorage.removeItem('userOnboarded');

  console.log("Onboarding.tsx - Forcing onboarding screens to appear");
  console.log("Onboarding.tsx - isOnboarded from database:", isOnboarded);

  // Show onboarding wizard
  return <OnboardingWizard />;
};

export default Onboarding;
