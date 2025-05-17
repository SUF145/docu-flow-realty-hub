import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TestPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8">Test Navigation Page</h1>
      
      <div className="space-y-4 w-full max-w-md">
        <Button 
          className="w-full" 
          onClick={() => navigate("/")}
        >
          Go to Tenant Selection
        </Button>
        
        <Button 
          className="w-full" 
          onClick={() => navigate("/auth")}
        >
          Go to Auth Page
        </Button>
        
        <Button 
          className="w-full" 
          onClick={() => navigate("/onboarding")}
        >
          Go to Onboarding
        </Button>
        
        <Button 
          className="w-full" 
          onClick={() => navigate("/dashboard")}
        >
          Go to Dashboard
        </Button>
        
        <Button 
          className="w-full" 
          onClick={() => navigate("/dashboard/documents")}
        >
          Go to Documents
        </Button>
      </div>
    </div>
  );
};

export default TestPage;
