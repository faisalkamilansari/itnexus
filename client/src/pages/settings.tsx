import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";

// Profile form schema
const profileFormSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
});

// Notification preferences schema
const notificationFormSchema = z.object({
  emailDigest: z.boolean().default(true),
  incidentAlerts: z.boolean().default(true),
  serviceRequestUpdates: z.boolean().default(true),
  changeRequestApprovals: z.boolean().default(true),
  assetUpdates: z.boolean().default(false),
  systemNotifications: z.boolean().default(true),
});

// Security settings schema
const securityFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(/[A-Z]/, { message: "Password must include at least one uppercase letter." })
    .regex(/[a-z]/, { message: "Password must include at least one lowercase letter." })
    .regex(/[0-9]/, { message: "Password must include at least one number." }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Appearance settings schema
const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  density: z.enum(["compact", "default", "comfortable"]).default("default"),
  sidebarCollapsed: z.boolean().default(false),
});

// Email account schema
const emailAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  port: z.string(),
  user: z.string(),
  password: z.string(),
  from: z.string(),
  secure: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

// Notification type mapping schema
const notificationMappingSchema = z.object({
  type: z.enum(['incident', 'service_request', 'change_request', 'monitoring', 'system']),
  emailAccountId: z.string(),
});

// Integrations settings schema
const integrationsFormSchema = z.object({
  // Slack integration
  slackEnabled: z.boolean().default(false),
  slackBotToken: z.string().optional(),
  slackChannelId: z.string().optional(),
  
  // Email integration
  emailEnabled: z.boolean().default(true),
  emailAccounts: z.array(emailAccountSchema).default([]),
  notificationMappings: z.array(notificationMappingSchema).default([]),
  
  // Legacy fields for backward compatibility
  emailHost: z.string().optional(),
  emailPort: z.string().optional(),
  emailUser: z.string().optional(),
  emailPassword: z.string().optional(),
  emailFrom: z.string().optional(),
  emailSecure: z.boolean().default(true),
});

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [showNewEmailForm, setShowNewEmailForm] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  
  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });
  
  // Notification form
  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailDigest: true,
      incidentAlerts: true,
      serviceRequestUpdates: true,
      changeRequestApprovals: true,
      assetUpdates: false,
      systemNotifications: true,
    },
  });
  
  // Security form
  const securityForm = useForm<z.infer<typeof securityFormSchema>>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Appearance form
  const appearanceForm = useForm<z.infer<typeof appearanceFormSchema>>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "system",
      density: "default",
      sidebarCollapsed: false,
    },
  });
  
  // Integrations form
  const integrationsForm = useForm<z.infer<typeof integrationsFormSchema>>({
    resolver: zodResolver(integrationsFormSchema),
    defaultValues: {
      // Slack defaults
      slackEnabled: false,
      slackBotToken: "",
      slackChannelId: "",
      
      // Email defaults
      emailEnabled: true,
      emailHost: "",
      emailPort: "587",
      emailUser: "",
      emailPassword: "",
      emailFrom: "",
      emailSecure: true,
    },
  });
  
  // Email account management
  const addEmailAccount = (account: any) => {
    // Generate a unique ID if not provided
    if (!account.id) {
      account.id = `email-${Date.now()}`;
    }
    
    // Add to the list of email accounts
    setEmailAccounts([...emailAccounts, account]);
    
    // Update form's emailAccounts field
    const currentAccounts = integrationsForm.getValues('emailAccounts') || [];
    integrationsForm.setValue('emailAccounts', [...currentAccounts, account]);
    
    // Reset the form
    setShowNewEmailForm(false);
    setEditingEmailId(null);
  };
  
  const updateEmailAccount = (account: any) => {
    // Update an existing account
    const updatedAccounts = emailAccounts.map(acc => 
      acc.id === account.id ? account : acc
    );
    
    setEmailAccounts(updatedAccounts);
    
    // Update form's emailAccounts field
    integrationsForm.setValue('emailAccounts', updatedAccounts);
    
    // Reset the form
    setEditingEmailId(null);
  };
  
  const removeEmailAccount = (id: string) => {
    // Remove an account
    const updatedAccounts = emailAccounts.filter(acc => acc.id !== id);
    setEmailAccounts(updatedAccounts);
    
    // Update form's emailAccounts field
    integrationsForm.setValue('emailAccounts', updatedAccounts);
  };
  
  const setDefaultEmailAccount = (id: string) => {
    // Set an account as default
    const updatedAccounts = emailAccounts.map(acc => ({
      ...acc,
      isDefault: acc.id === id
    }));
    
    setEmailAccounts(updatedAccounts);
    
    // Update form's emailAccounts field
    integrationsForm.setValue('emailAccounts', updatedAccounts);
  };

  // Email notification mapping
  const updateNotificationMapping = (type: string, emailAccountId: string) => {
    const currentMappings = integrationsForm.getValues('notificationMappings') || [];
    
    // Check if mapping already exists
    const existingIndex = currentMappings.findIndex(m => m.type === type);
    
    if (existingIndex >= 0) {
      // Update existing mapping
      const updatedMappings = [...currentMappings];
      updatedMappings[existingIndex] = { type, emailAccountId } as any;
      integrationsForm.setValue('notificationMappings', updatedMappings);
    } else {
      // Add new mapping
      integrationsForm.setValue('notificationMappings', [
        ...currentMappings, 
        { type, emailAccountId } as any
      ]);
    }
  };

  // Submit handlers
  const onProfileSubmit = (data: z.infer<typeof profileFormSchema>) => {
    // In a real application, you would make an API call to update the user's profile
    console.log("Profile data:", data);
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully",
    });
  };
  
  const onNotificationSubmit = (data: z.infer<typeof notificationFormSchema>) => {
    console.log("Notification preferences:", data);
    toast({
      title: "Notification preferences updated",
      description: "Your notification preferences have been saved",
    });
  };
  
  const onSecuritySubmit = (data: z.infer<typeof securityFormSchema>) => {
    console.log("Security settings:", data);
    toast({
      title: "Password updated",
      description: "Your password has been changed successfully",
    });
    securityForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };
  
  const onAppearanceSubmit = (data: z.infer<typeof appearanceFormSchema>) => {
    console.log("Appearance settings:", data);
    toast({
      title: "Appearance settings updated",
      description: "Your appearance preferences have been saved",
    });
  };

  const onIntegrationsSubmit = async (data: z.infer<typeof integrationsFormSchema>) => {
    try {
      console.log("Integration settings:", data);
      
      // Call the API to save the integration configurations
      const response = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Slack configuration
          slackEnabled: data.slackEnabled,
          slackBotToken: data.slackBotToken,
          slackChannelId: data.slackChannelId,
          
          // Legacy Email configuration (for backward compatibility)
          emailEnabled: data.emailEnabled,
          emailHost: data.emailHost,
          emailPort: data.emailPort,
          emailUser: data.emailUser,
          emailPassword: data.emailPassword,
          emailFrom: data.emailFrom,
          emailSecure: data.emailSecure,
          
          // Multiple email accounts configuration
          emailAccounts: data.emailAccounts,
          notificationMappings: data.notificationMappings,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save integration settings');
      }
      
      toast({
        title: "Integration settings updated",
        description: "Your notification integration preferences have been saved",
      });
    } catch (error) {
      console.error('Error saving integration settings:', error);
      toast({
        title: "Error",
        description: `Failed to save integration settings: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>
          
          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and email preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            This email will be used for account notifications.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications and alerts.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                    <FormField
                      control={notificationForm.control}
                      name="emailDigest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel>Daily Email Digest</FormLabel>
                            <FormDescription>Receive a daily summary of activities</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={notificationForm.control}
                      name="incidentAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel>Incident Alerts</FormLabel>
                            <FormDescription>Get notified about new and updated incidents</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={notificationForm.control}
                      name="serviceRequestUpdates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel>Service Request Updates</FormLabel>
                            <FormDescription>Notifications about service request status changes</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={notificationForm.control}
                      name="changeRequestApprovals"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel>Change Request Approvals</FormLabel>
                            <FormDescription>Get notified when change requests need your approval</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={notificationForm.control}
                      name="assetUpdates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel>Asset Updates</FormLabel>
                            <FormDescription>Notifications about asset changes and updates</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={notificationForm.control}
                      name="systemNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel>System Notifications</FormLabel>
                            <FormDescription>Important system-wide alerts and announcements</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit">Save Preferences</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Change your password and manage security options.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                    <FormField
                      control={securityForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormDescription>
                            Password must be at least 8 characters and include uppercase, lowercase, and numbers.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit">Update Password</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...appearanceForm}>
                  <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-6">
                    <FormField
                      control={appearanceForm.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme</FormLabel>
                          <div className="flex flex-col space-y-1.5">
                            <FormControl>
                              <div className="flex space-x-4">
                                <div 
                                  className={`cursor-pointer border p-4 rounded-md flex-1 ${
                                    field.value === "light" ? "border-primary bg-primary/10" : "border-border"
                                  }`}
                                  onClick={() => field.onChange("light")}
                                >
                                  <div className="p-2 bg-white border border-gray-200 rounded-md shadow-sm mb-2"></div>
                                  <span>Light</span>
                                </div>
                                <div 
                                  className={`cursor-pointer border p-4 rounded-md flex-1 ${
                                    field.value === "dark" ? "border-primary bg-primary/10" : "border-border"
                                  }`}
                                  onClick={() => field.onChange("dark")}
                                >
                                  <div className="p-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm mb-2"></div>
                                  <span>Dark</span>
                                </div>
                                <div 
                                  className={`cursor-pointer border p-4 rounded-md flex-1 ${
                                    field.value === "system" ? "border-primary bg-primary/10" : "border-border"
                                  }`}
                                  onClick={() => field.onChange("system")}
                                >
                                  <div className="p-2 bg-gradient-to-r from-white to-gray-800 border border-gray-300 rounded-md shadow-sm mb-2"></div>
                                  <span>System</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Select a theme preference for the application interface.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appearanceForm.control}
                      name="density"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Density</FormLabel>
                          <div className="flex flex-col space-y-1.5">
                            <FormControl>
                              <div className="flex space-x-4">
                                <div 
                                  className={`cursor-pointer border p-4 rounded-md flex-1 ${
                                    field.value === "compact" ? "border-primary bg-primary/10" : "border-border"
                                  }`}
                                  onClick={() => field.onChange("compact")}
                                >
                                  <div className="space-y-1 mb-2">
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                  </div>
                                  <span>Compact</span>
                                </div>
                                <div 
                                  className={`cursor-pointer border p-4 rounded-md flex-1 ${
                                    field.value === "default" ? "border-primary bg-primary/10" : "border-border"
                                  }`}
                                  onClick={() => field.onChange("default")}
                                >
                                  <div className="space-y-2 mb-2">
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                  </div>
                                  <span>Default</span>
                                </div>
                                <div 
                                  className={`cursor-pointer border p-4 rounded-md flex-1 ${
                                    field.value === "comfortable" ? "border-primary bg-primary/10" : "border-border"
                                  }`}
                                  onClick={() => field.onChange("comfortable")}
                                >
                                  <div className="space-y-3 mb-2">
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                    <div className="h-1 bg-gray-200 rounded w-full"></div>
                                  </div>
                                  <span>Comfortable</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Control the spacing density of UI elements.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appearanceForm.control}
                      name="sidebarCollapsed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel>Collapsed Sidebar</FormLabel>
                            <FormDescription>Default to a collapsed sidebar when opening the app</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit">Save Appearance</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Integrations Settings */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>Configure external integrations for notifications and alerts.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...integrationsForm}>
                  <form onSubmit={integrationsForm.handleSubmit(onIntegrationsSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Email Notifications</h3>
                      
                      <FormField
                        control={integrationsForm.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div>
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>Enable or disable email notifications</FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {integrationsForm.watch("emailEnabled") && (
                        <div className="space-y-6 mt-4">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">Email Accounts</CardTitle>
                              <CardDescription>
                                Manage multiple email accounts to send notifications from different sources
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {emailAccounts.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                  <p>No email accounts configured</p>
                                  <p className="text-sm mt-1">Add an email account to send notifications</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {emailAccounts.map((account) => (
                                    <div 
                                      key={account.id} 
                                      className={`p-4 border rounded-lg ${account.isDefault ? 'border-primary bg-primary/5' : ''}`}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h3 className="font-medium">{account.name}</h3>
                                            {account.isDefault && (
                                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                                Default
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground">{account.from}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          {!account.isDefault && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setDefaultEmailAccount(account.id)}
                                            >
                                              Set as Default
                                            </Button>
                                          )}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingEmailId(account.id);
                                            }}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeEmailAccount(account.id)}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">SMTP Host:</span> {account.host}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">SMTP Port:</span> {account.port}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Username:</span> {account.user}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Secure:</span> {account.secure ? 'Yes' : 'No'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Add new email account button */}
                              <div className="mt-4">
                                {!showNewEmailForm && !editingEmailId && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowNewEmailForm(true)}
                                    className="w-full"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Email Account
                                  </Button>
                                )}
                              </div>
                              
                              {/* Form for adding/editing email account */}
                              {(showNewEmailForm || editingEmailId) && (
                                <div className="mt-4 p-4 border rounded-md">
                                  <h4 className="font-medium mb-4">
                                    {editingEmailId ? 'Edit Email Account' : 'Add New Email Account'}
                                  </h4>
                                  
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="email-name">Account Name</Label>
                                        <Input 
                                          id="email-name"
                                          placeholder="Support Team Email" 
                                          defaultValue={editingEmailId ? emailAccounts.find(a => a.id === editingEmailId)?.name : ''}
                                        />
                                        <p className="text-xs text-muted-foreground">A user-friendly name for this account</p>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="email-host">SMTP Host</Label>
                                        <Input 
                                          id="email-host"
                                          placeholder="smtp.example.com" 
                                          defaultValue={editingEmailId ? emailAccounts.find(a => a.id === editingEmailId)?.host : ''}
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label htmlFor="email-port">SMTP Port</Label>
                                        <Input 
                                          id="email-port"
                                          placeholder="587" 
                                          defaultValue={editingEmailId ? emailAccounts.find(a => a.id === editingEmailId)?.port : '587'}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="email-user">SMTP Username</Label>
                                        <Input 
                                          id="email-user"
                                          placeholder="user@example.com" 
                                          defaultValue={editingEmailId ? emailAccounts.find(a => a.id === editingEmailId)?.user : ''}
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label htmlFor="email-password">SMTP Password</Label>
                                        <Input 
                                          id="email-password"
                                          placeholder="password" 
                                          type="password"
                                          defaultValue={editingEmailId ? emailAccounts.find(a => a.id === editingEmailId)?.password : ''}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label htmlFor="email-from">From Email Address</Label>
                                      <Input 
                                        id="email-from"
                                        placeholder="support@yourdomain.com" 
                                        defaultValue={editingEmailId ? emailAccounts.find(a => a.id === editingEmailId)?.from : ''}
                                      />
                                      <p className="text-xs text-muted-foreground">Email address that will appear in the "From" field</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          id="email-secure" 
                                          defaultChecked={editingEmailId ? 
                                            emailAccounts.find(a => a.id === editingEmailId)?.secure : true}
                                        />
                                        <Label htmlFor="email-secure">Use Secure Connection (TLS)</Label>
                                      </div>
                                      <p className="text-xs text-muted-foreground ml-6">Enable TLS for secure email delivery</p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-4">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          id="email-default" 
                                          disabled={emailAccounts.length === 0}
                                          defaultChecked={editingEmailId ? 
                                            emailAccounts.find(a => a.id === editingEmailId)?.isDefault : 
                                            emailAccounts.length === 0}
                                        />
                                        <Label htmlFor="email-default">
                                          {emailAccounts.length === 0 ? 
                                            "Set as default account (first account is always default)" : 
                                            "Set as default account"}
                                        </Label>
                                      </div>
                                      
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            const name = (document.getElementById('email-name') as HTMLInputElement).value;
                                            const host = (document.getElementById('email-host') as HTMLInputElement).value;
                                            const port = (document.getElementById('email-port') as HTMLInputElement).value;
                                            const user = (document.getElementById('email-user') as HTMLInputElement).value;
                                            const password = (document.getElementById('email-password') as HTMLInputElement).value;
                                            const from = (document.getElementById('email-from') as HTMLInputElement).value;
                                            const secure = (document.getElementById('email-secure') as HTMLInputElement).checked;
                                            const isDefault = (document.getElementById('email-default') as HTMLInputElement).checked || 
                                              emailAccounts.length === 0;
                                            
                                            // Check if required fields are filled
                                            if (!name || !host || !port || !user || !password || !from) {
                                              throw new Error('Please fill in all required fields');
                                            }
                                            
                                            const emailConfig = {
                                              host,
                                              port,
                                              user,
                                              password,
                                              from,
                                              secure,
                                            };
                                            
                                            // Test connection
                                            const response = await fetch('/api/notifications/test', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify({
                                                type: 'incident',
                                                channel: 'email',
                                                config: emailConfig
                                              }),
                                            });
                                            
                                            const data = await response.json();
                                            
                                            if (response.ok) {
                                              if (editingEmailId) {
                                                updateEmailAccount({
                                                  id: editingEmailId,
                                                  name,
                                                  host,
                                                  port,
                                                  user,
                                                  password,
                                                  from,
                                                  secure,
                                                  isDefault,
                                                });
                                                
                                                toast({
                                                  title: "Account Updated",
                                                  description: `Email account "${name}" has been updated.`,
                                                });
                                              } else {
                                                addEmailAccount({
                                                  id: `email-${Date.now()}`,
                                                  name,
                                                  host,
                                                  port,
                                                  user,
                                                  password,
                                                  from,
                                                  secure,
                                                  isDefault,
                                                });
                                                
                                                toast({
                                                  title: "Account Added",
                                                  description: `Email account "${name}" has been added.`,
                                                });
                                              }
                                            } else {
                                              throw new Error(data.message || 'Failed to verify email configuration');
                                            }
                                          } catch (error) {
                                            toast({
                                              title: "Error",
                                              description: `${(error as Error).message}`,
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                      >
                                        Test & Save
                                      </Button>
                                    </div>
                                    
                                    <div className="flex justify-end mt-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                          setShowNewEmailForm(false);
                                          setEditingEmailId(null);
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          
                          {emailAccounts.length > 0 && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Notification Type Mapping</CardTitle>
                                <CardDescription>
                                  Choose which email account to use for each notification type
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['incident', 'service_request', 'change_request', 'monitoring', 'system'].map((type) => {
                                      const displayName = {
                                        'incident': 'Incident Notifications',
                                        'service_request': 'Service Request Notifications',
                                        'change_request': 'Change Request Notifications', 
                                        'monitoring': 'Monitoring Alerts',
                                        'system': 'System Notifications'
                                      }[type];
                                      
                                      // Find current mapping for this notification type
                                      const currentMappings = integrationsForm.getValues('notificationMappings') || [];
                                      const currentMapping = currentMappings.find(m => m.type === type);
                                      const currentAccountId = currentMapping?.emailAccountId || 
                                        emailAccounts.find(a => a.isDefault)?.id;
                                      
                                      return (
                                        <div key={type} className="space-y-2">
                                          <Label htmlFor={`mapping-${type}`}>{displayName}</Label>
                                          <Select 
                                            defaultValue={currentAccountId} 
                                            onValueChange={(value) => updateNotificationMapping(type, value)}
                                          >
                                            <SelectTrigger id={`mapping-${type}`}>
                                              <SelectValue placeholder="Select an email account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {emailAccounts.map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                  {account.name} {account.isDefault && '(Default)'}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Slack Integration</h3>
                      
                      <FormField
                        control={integrationsForm.control}
                        name="slackEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div>
                              <FormLabel>Slack Notifications</FormLabel>
                              <FormDescription>Enable or disable Slack notifications</FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {integrationsForm.watch("slackEnabled") && (
                        <div className="space-y-4 mt-4 p-4 border rounded-md">
                          <FormField
                            control={integrationsForm.control}
                            name="slackBotToken"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Slack Bot Token</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="xoxb-..." 
                                    type="password" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Enter your Slack Bot Token. This should start with 'xoxb-'.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={integrationsForm.control}
                            name="slackChannelId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Slack Channel ID</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="C01234ABCD" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Enter the Slack channel ID where notifications should be sent.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="text-sm text-muted-foreground mt-2">
                            <p>To find your channel ID:</p>
                            <ol className="list-decimal list-inside mt-1">
                              <li>Open Slack in a browser</li>
                              <li>Navigate to the channel you want to use</li>
                              <li>The channel ID will be in the URL (e.g., /client/C01234ABCD)</li>
                            </ol>
                          </div>
                          
                          <div className="mt-4">
                            <Button type="button" variant="outline" onClick={async () => {
                              try {
                                const response = await fetch('/api/notifications/test-slack', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    slackBotToken: integrationsForm.getValues('slackBotToken'),
                                    slackChannelId: integrationsForm.getValues('slackChannelId'),
                                  }),
                                });
                                
                                const data = await response.json();
                                
                                if (response.ok) {
                                  toast({
                                    title: "Test Successful",
                                    description: "Slack integration test message sent successfully.",
                                  });
                                } else {
                                  throw new Error(data.message || 'Failed to send test message');
                                }
                              } catch (error) {
                                toast({
                                  title: "Test Failed",
                                  description: `Failed to send test message: ${(error as Error).message}`,
                                  variant: "destructive",
                                });
                              }
                            }}>
                              Test Slack Integration
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <Button type="submit">Save Integration Settings</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}