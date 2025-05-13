
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X } from "lucide-react";

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  role_id: z.string().min(1, { message: "Please select a role." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  user?: {
    id: string;
    name: string;
    email: string;
    role_id?: string;
    role?: string;
  };
  roles: { id: string; name: string }[];
}

const UserForm = ({ isOpen, onClose, onSubmit, user, roles }: UserFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role_id: user?.role_id || "",
      password: "",
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      console.log("Setting form values for user:", user);
      // Handle both role_id and role for backward compatibility
      const roleId = user.role_id || (typeof user.role === 'string' ? user.role : "");

      form.reset({
        name: user.name || "",
        email: user.email || "",
        role_id: roleId,
        password: "", // Always empty for editing
      });
    } else {
      form.reset({
        name: "",
        email: "",
        role_id: "",
        password: "",
      });
    }
  }, [user, form]);

  const handleSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      toast({
        title: user ? "User updated" : "User created",
        description: user ? "User has been updated successfully." : "New user has been created.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${user ? "update" : "create"} user. Please try again.`,
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{user ? "Edit User" : "Add New User"}</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        <div className="py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    {/* Simple Select implementation instead of complex dropdown */}
                    <div className="border rounded-md p-4">
                      <p className="text-sm font-medium mb-2">
                        {field.value
                          ? roles.find(r => r.id === field.value)?.name || "Selected Role"
                          : "Select a role"}
                      </p>

                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {/* Always ensure we have at least default roles */}
                        {(roles.length > 0 ? roles : [
                          { id: "1", name: "Admin", description: "Administrator with all permissions" },
                          { id: "2", name: "User", description: "Standard user with basic permissions" }
                        ]).map((role) => (
                          <div
                            key={role.id}
                            className={`flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer ${
                              field.value === role.id ? "bg-muted" : ""
                            }`}
                            onClick={() => field.onChange(role.id)}
                          >
                            <div className={`w-4 h-4 border rounded-sm flex items-center justify-center ${
                              field.value === role.id ? "bg-primary border-primary" : "border-input"
                            }`}>
                              {field.value === role.id && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-primary-foreground">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                            <span>{role.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!user && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="******" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : user ? "Update User" : "Create User"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserForm;
