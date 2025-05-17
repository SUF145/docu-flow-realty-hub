import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { checkUserOnboarding, initializeUserOnboarding } from "@/lib/onboarding";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

const Onboarding = () => {
  const { user, loading } = useAuth();
  const { currentTenant } = useTenant();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

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

  // Check if user has completed onboarding (from localStorage)
  const userOnboarded = localStorage.getItem('userOnboarded') === 'true';

  // If user is already onboarded (from DB or localStorage), redirect to dashboard
  if (isOnboarded || userOnboarded) {
    console.log("User is already onboarded, redirecting to dashboard");
    return <Navigate to="/dashboard" />;
  }

  // Show onboarding wizard
  return <OnboardingWizard />;
};

export default Onboarding;
