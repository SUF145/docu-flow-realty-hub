import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const tenantSchema = z.object({
  domain: z.string().min(3, { message: "Tenant name must be at least 3 characters." }),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

const TenantSelect = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant, validateTenant, tenantError, clearTenant } = useTenant();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Only sign out if explicitly navigating to tenant selection
  // This prevents automatic sign-out when the app starts
  useEffect(() => {
    // Check if this is an explicit navigation to tenant selection
    const isExplicitNavigation = sessionStorage.getItem('explicitTenantNavigation') === 'true';

    if (user && isExplicitNavigation) {
      console.log("Explicit navigation to tenant selection, signing out user");
      signOut();
      clearTenant();
      // Clear the flag
      sessionStorage.removeItem('explicitTenantNavigation');
    }
  }, [user, signOut, clearTenant]);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      domain: "",
    },
  });

  const handleSubmit = async (data: TenantFormValues) => {
    setIsLoading(true);
    try {
      const tenant = await validateTenant(data.domain);

      if (tenant) {
        toast({
          title: "Tenant validated",
          description: `Connected to ${tenant.name}`,
        });
        // Redirect to auth page after successful tenant validation
        navigate("/auth");
      } else {
        toast({
          title: "Tenant validation failed",
          description: tenantError ?? "Unable to validate tenant",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message ?? "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If tenant is already selected, redirect to auth
  if (currentTenant) {
    return <Navigate to="/auth" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <div className="w-full max-w-md px-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome to DocuFlow</CardTitle>
            <CardDescription className="text-center">
              Enter your organization name to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your Organization"
                          {...field}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account? Contact us to set up your organization.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default TenantSelect;
