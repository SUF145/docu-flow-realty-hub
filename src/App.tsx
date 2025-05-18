
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import DocumentsWithFolders from "@/pages/DocumentsWithFolders";
import Approvals from "@/pages/Approvals";
import DocumentView from "@/pages/DocumentView";
import Templates from "@/pages/Templates";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import TenantSelect from "@/pages/TenantSelect";
import TestPage from "@/pages/TestPage";
import NotFound from "@/pages/NotFound";
import RequireAuth from "@/components/auth/RequireAuth";
import { initializeApp } from "@/lib/init";
import "./App.css";

const queryClient = new QueryClient();

const App = () => {
  // Skip initialization for now to simplify debugging
  useEffect(() => {
    // Just log that we're skipping initialization
    console.log("Skipping initialization for debugging");

    // Initialize in the background without blocking rendering
    const initInBackground = async () => {
      try {
        await initializeApp();
        console.log("Background initialization complete");
      } catch (error) {
        console.error("Background initialization error:", error);
      }
    };

    initInBackground();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <TenantProvider>
            <AuthProvider>
              <SidebarProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<TenantSelect />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/test" element={<TestPage />} />

                  {/* Onboarding Route - Moved outside of RequireAuth to avoid circular redirects */}
                  <Route path="/onboarding" element={<Onboarding />} />

                  {/* Protected Routes */}
                  <Route element={<RequireAuth />}>
                    <Route path="/dashboard" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="documents" element={<DocumentsWithFolders />} />
                      <Route path="documents/folders/:folderId" element={<DocumentsWithFolders />} />
                      <Route path="documents/:id" element={<DocumentView />} />
                      <Route path="templates" element={<Templates />} />
                      <Route path="approvals" element={<Approvals />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="admin" element={<Admin />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Route>
                </Routes>
              </SidebarProvider>
            </AuthProvider>
          </TenantProvider>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
