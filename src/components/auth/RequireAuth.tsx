
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";

// Simple loading indicator
const LoadingIndicator = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const RequireAuth = () => {
  const { user, loading } = useAuth();
  const { currentTenant, isLoadingTenant } = useTenant();
  const location = useLocation();

  // Show loading indicator while checking authentication or tenant
  if (loading || isLoadingTenant) {
    return <LoadingIndicator />;
  }

  // Step 1: If no tenant is selected, redirect to tenant selection
  if (!currentTenant) {
    console.log("No tenant selected, redirecting to tenant selection");
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Step 2: If not authenticated, redirect to login
  if (!user) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check for bypass flag or completed parameter
  const bypassRedirect = sessionStorage.getItem('bypassOnboardingRedirect') === 'true';
  const urlParams = new URLSearchParams(window.location.search);
  const completedParam = urlParams.get('completed') === 'true';

  console.log("RequireAuth - Bypass flag:", bypassRedirect);
  console.log("RequireAuth - Completed parameter:", completedParam);

  // Check if user has completed onboarding
  const userOnboarded = localStorage.getItem('userOnboarded') === 'true';
  console.log("RequireAuth - User onboarded status:", userOnboarded);

  // If bypass flag or completed parameter is set, or user is onboarded, allow access
  if (bypassRedirect || completedParam || userOnboarded) {
    console.log("RequireAuth - Bypassing onboarding redirect");

    // Clear the bypass flag after using it
    if (bypassRedirect) {
      sessionStorage.removeItem('bypassOnboardingRedirect');
    }

    // Allow access to protected routes
    return <Outlet />;
  }

  // Otherwise, redirect to onboarding if not already on the onboarding page
  if (!location.pathname.includes('/onboarding')) {
    console.log("RequireAuth - Redirecting to onboarding from:", location.pathname);

    // Clear the onboarded flag to ensure onboarding screens appear
    localStorage.removeItem('userOnboarded');

    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  console.log("RequireAuth - Already on onboarding page, allowing access");

  // If all checks pass, render the protected routes
  return <Outlet />;
};

export default RequireAuth;
