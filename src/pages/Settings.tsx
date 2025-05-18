
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleResetOnboarding = async () => {
    try {
      // Clear the onboarded flag in localStorage
      localStorage.removeItem('userOnboarded');

      if (user) {
        // Update the user_onboarding record in the database
        const { error } = await supabase
          .from('user_onboarding')
          .update({
            is_onboarded: false,
            onboarded_at: null
          })
          .eq('user_id', user.id);

        if (error) {
          console.error("Error resetting onboarding status:", error);
          toast({
            title: "Error",
            description: "Failed to reset onboarding status in the database.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Onboarding status has been reset. You will be redirected to the onboarding process.",
          });

          // Redirect to onboarding after a short delay
          setTimeout(() => {
            navigate('/onboarding?forceOnboarding=true');
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Exception in handleResetOnboarding:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account preferences and settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="developer">Developer</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-lg">JD</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button size="sm">Upload New Picture</Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, GIF or PNG. Max size of 800K
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="john.doe@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" defaultValue="Real Estate Manager" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" defaultValue="Sales" />
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Document Notifications</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Document Approval Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when documents require your approval
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-approval" defaultChecked />
                      <Label htmlFor="email-approval">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="app-approval" defaultChecked />
                      <Label htmlFor="app-approval">In-App</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Document Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when documents are updated
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-updates" defaultChecked />
                      <Label htmlFor="email-updates">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="app-updates" defaultChecked />
                      <Label htmlFor="app-updates">In-App</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Approval Decisions</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when your documents are approved or rejected
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-decisions" defaultChecked />
                      <Label htmlFor="email-decisions">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="app-decisions" defaultChecked />
                      <Label htmlFor="app-decisions">In-App</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Notifications</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Workflow Changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Updates to approval workflows or document types
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-workflow" />
                      <Label htmlFor="email-workflow">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="app-workflow" defaultChecked />
                      <Label htmlFor="app-workflow">In-App</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">System Maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Updates about system maintenance and downtime
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-maintenance" defaultChecked />
                      <Label htmlFor="email-maintenance">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="app-maintenance" />
                      <Label htmlFor="app-maintenance">In-App</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="digest" />
                  <Label htmlFor="digest">
                    Enable daily digest email (receive all notifications once per day)
                  </Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input id="confirm" type="password" />
              </div>

              <div className="flex justify-end">
                <Button>Change Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="developer">
          <Card>
            <CardHeader>
              <CardTitle>Developer Settings</CardTitle>
              <CardDescription>
                Advanced settings for development and testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Onboarding</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Reset your onboarding status to go through the onboarding process again.
                    This is useful for testing the onboarding flow.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleResetOnboarding}
                  >
                    Reset Onboarding
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
