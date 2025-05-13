
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import Approvals from "@/pages/Approvals";
import DocumentView from "@/pages/DocumentView";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import Auth from "@/pages/Auth";
import RequireAuth from "@/components/auth/RequireAuth";
import { initializeApp } from "@/lib/init";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Starting application initialization...");
        const result = await initializeApp();

        if (!result.storageInitialized) {
          console.warn("Storage initialization failed. Document uploads may not work correctly.");
          setInitError("Storage initialization failed. Document uploads may not work correctly.");
        }

        console.log("Application initialization complete");
      } catch (error) {
        console.error("Application initialization error:", error);
        setInitError("Failed to initialize application. Some features may not work correctly.");
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-semibold mb-2">Initializing Application</h2>
          <p className="text-muted-foreground">Please wait while we set things up...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            {/* {initError && (
              <Alert variant="destructive" className="fixed top-4 right-4 z-50 max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Initialization Warning</AlertTitle>
                <AlertDescription>{initError}</AlertDescription>
              </Alert>
            )} */}
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />

                {/* Protected Routes */}
                <Route element={<RequireAuth />}>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/documents/:id" element={<DocumentView />} />
                    <Route path="/approvals" element={<Approvals />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </SidebarProvider>
        </AuthProvider>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
