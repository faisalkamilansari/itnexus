import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, MessageSquare, BellRing, AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Validation schema for communication configuration
const communicationConfigSchema = z.object({
  emailNotifications: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(["sendgrid"]).default("sendgrid"),
    fromEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
    apiKey: z.string().min(1, "API key is required when email is enabled").optional().or(z.literal("")),
    recipients: z.string().min(1, "At least one recipient email is required when email is enabled").optional().or(z.literal("")),
    alertLevels: z.array(z.string()).default(["critical", "error"]),
    testEmail: z.string().email("Please enter a valid test email").optional().or(z.literal("")),
  }),
  
  slackNotifications: z.object({
    enabled: z.boolean().default(false),
    botToken: z.string().min(1, "Bot token is required when Slack is enabled").optional().or(z.literal("")),
    channelId: z.string().min(1, "Channel ID is required when Slack is enabled").optional().or(z.literal("")),
    alertLevels: z.array(z.string()).default(["critical", "error"]),
  }),
  
  webhookNotifications: z.object({
    enabled: z.boolean().default(false),
    url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
    secret: z.string().optional().or(z.literal("")),
    alertLevels: z.array(z.string()).default(["critical", "error"]),
  }),
  
  smsNotifications: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(["twilio"]).default("twilio"),
    accountSid: z.string().optional().or(z.literal("")),
    authToken: z.string().optional().or(z.literal("")),
    fromNumber: z.string().optional().or(z.literal("")),
    toNumbers: z.string().optional().or(z.literal("")),
    alertLevels: z.array(z.string()).default(["critical"]),
  }),
});

type CommunicationConfigFormValues = z.infer<typeof communicationConfigSchema>;

export default function CommunicationConfig() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("email");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  
  // Default values for the form
  const defaultValues: CommunicationConfigFormValues = {
    emailNotifications: {
      enabled: false,
      provider: "sendgrid",
      fromEmail: "",
      apiKey: "",
      recipients: "",
      alertLevels: ["critical", "error"],
      testEmail: "",
    },
    
    slackNotifications: {
      enabled: false,
      botToken: "",
      channelId: "",
      alertLevels: ["critical", "error"],
    },
    
    webhookNotifications: {
      enabled: false,
      url: "",
      secret: "",
      alertLevels: ["critical", "error"],
    },
    
    smsNotifications: {
      enabled: false,
      provider: "twilio",
      accountSid: "",
      authToken: "",
      fromNumber: "",
      toNumbers: "",
      alertLevels: ["critical"],
    },
  };
  
  const form = useForm<CommunicationConfigFormValues>({
    resolver: zodResolver(communicationConfigSchema),
    defaultValues,
    mode: "onChange"
  });
  
  async function onSubmit(data: CommunicationConfigFormValues) {
    try {
      // Send configuration to the backend
      console.log("Communication configuration:", data);
      
      // Make API request to save notification configuration
      const response = await apiRequest("POST", "/api/notifications/config", {
        sendGrid: {
          enabled: data.emailNotifications.enabled,
          apiKey: data.emailNotifications.apiKey,
          fromEmail: data.emailNotifications.fromEmail,
          notificationEmails: data.emailNotifications.recipients,
          alertLevels: data.emailNotifications.alertLevels,
        },
        slack: {
          enabled: data.slackNotifications.enabled,
          botToken: data.slackNotifications.botToken,
          channelId: data.slackNotifications.channelId,
          alertLevels: data.slackNotifications.alertLevels,
        }
      });
      
      if (response.ok) {
        toast({
          title: "Notification settings saved",
          description: "Your notification configuration has been updated successfully.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save notification settings");
      }
    } catch (error) {
      console.error("Error saving notification configuration:", error);
      toast({
        title: "Error",
        description: `Failed to save notification settings: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  }
  
  async function testEmailConfig() {
    try {
      setTestingEmail(true);
      const emailConfig = form.getValues("emailNotifications");
      
      if (!emailConfig.enabled) {
        throw new Error("Email notifications are not enabled");
      }
      
      if (!emailConfig.apiKey || !emailConfig.fromEmail || !emailConfig.testEmail) {
        throw new Error("Please fill in all email configuration fields and test email address");
      }
      
      // Make API request to test email
      const response = await apiRequest("POST", "/api/notifications/test-email", {
        apiKey: emailConfig.apiKey,
        fromEmail: emailConfig.fromEmail,
        testEmail: emailConfig.testEmail,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Test email sent",
            description: "The test email was sent successfully. Please check your inbox.",
          });
        } else {
          throw new Error(result.message || "Failed to send test email");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send test email");
      }
    } catch (error) {
      console.error("Error testing email:", error);
      toast({
        title: "Email Test Failed",
        description: `Error: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setTestingEmail(false);
    }
  }
  
  async function testSlackConfig() {
    try {
      setTestingSlack(true);
      const slackConfig = form.getValues("slackNotifications");
      
      if (!slackConfig.enabled) {
        throw new Error("Slack notifications are not enabled");
      }
      
      if (!slackConfig.botToken || !slackConfig.channelId) {
        throw new Error("Please fill in all Slack configuration fields");
      }
      
      // Make API request to test Slack
      const response = await apiRequest("POST", "/api/notifications/test-slack", {
        botToken: slackConfig.botToken,
        channelId: slackConfig.channelId,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Test message sent",
            description: "The test message was sent to Slack successfully.",
          });
        } else {
          throw new Error(result.message || "Failed to send test message to Slack");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send test message to Slack");
      }
    } catch (error) {
      console.error("Error testing Slack:", error);
      toast({
        title: "Slack Test Failed",
        description: `Error: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setTestingSlack(false);
    }
  }
  
  // Get form values for conditional rendering
  const isEmailEnabled = form.watch("emailNotifications.enabled");
  const isSlackEnabled = form.watch("slackNotifications.enabled");
  const isWebhookEnabled = form.watch("webhookNotifications.enabled");
  const isSmsEnabled = form.watch("smsNotifications.enabled");
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <BellRing className="mr-2 h-5 w-5 text-primary" />
          Notification Channels Configuration
        </CardTitle>
        <CardDescription>
          Configure channels for automated alert notifications from your monitoring system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="email" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-1 mb-4">
                <TabsTrigger value="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Email</span>
                </TabsTrigger>
                <TabsTrigger value="slack" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Slack</span>
                </TabsTrigger>
                <TabsTrigger value="webhook" className="flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Webhook</span>
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">SMS</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Email Notifications */}
              <TabsContent value="email" className="space-y-4">
                <FormField
                  control={form.control}
                  name="emailNotifications.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Email Notifications</FormLabel>
                        <FormDescription>
                          Send alert notifications via email
                        </FormDescription>
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
                
                {isEmailEnabled && (
                  <>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="emailNotifications.provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Provider</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sendgrid">SendGrid</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select which email service to use
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="emailNotifications.fromEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sender Email</FormLabel>
                            <FormControl>
                              <Input placeholder="alerts@yourcompany.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              The email address alerts will be sent from
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="emailNotifications.apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SendGrid API Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="SG.xxxx" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your SendGrid API key for sending emails
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="emailNotifications.recipients"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Emails</FormLabel>
                          <FormControl>
                            <Input placeholder="admin@example.com, alerts@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Comma-separated list of email addresses to receive alerts
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="emailNotifications.alertLevels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alert Levels</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {["info", "warning", "error", "critical"].map((level) => (
                              <div key={level} className="flex items-center space-x-2">
                                <FormControl>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={field.value.includes(level)}
                                      onCheckedChange={(checked: boolean) => {
                                        if (checked) {
                                          field.onChange([...field.value, level]);
                                        } else {
                                          field.onChange(field.value.filter(val => val !== level));
                                        }
                                      }}
                                      id={`email-level-${level}`}
                                    />
                                    <Label htmlFor={`email-level-${level}`} className="capitalize">{level}</Label>
                                  </div>
                                </FormControl>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
                            Select which severity levels trigger email notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator className="my-4" />
                    
                    <div className="rounded-md border p-4 bg-muted/50">
                      <h3 className="text-sm font-medium mb-2">Test Email Configuration</h3>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name="emailNotifications.testEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Test Recipient Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="your@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={testEmailConfig}
                            disabled={testingEmail || !isEmailEnabled}
                            className="w-full"
                          >
                            {testingEmail ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Test Email
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
              
              {/* Slack Notifications */}
              <TabsContent value="slack" className="space-y-4">
                <FormField
                  control={form.control}
                  name="slackNotifications.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Slack Notifications</FormLabel>
                        <FormDescription>
                          Send alert notifications to a Slack channel
                        </FormDescription>
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
                
                {isSlackEnabled && (
                  <>
                    <FormField
                      control={form.control}
                      name="slackNotifications.botToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slack Bot Token</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="xoxb-..." {...field} />
                          </FormControl>
                          <FormDescription>
                            The bot token from your Slack app configuration
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="slackNotifications.channelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slack Channel ID</FormLabel>
                          <FormControl>
                            <Input placeholder="C12345678" {...field} />
                          </FormControl>
                          <FormDescription>
                            The ID of the channel to send notifications to (not the channel name)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="slackNotifications.alertLevels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alert Levels</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {["info", "warning", "error", "critical"].map((level) => (
                              <div key={level} className="flex items-center space-x-2">
                                <FormControl>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={field.value.includes(level)}
                                      onCheckedChange={(checked: boolean) => {
                                        if (checked) {
                                          field.onChange([...field.value, level]);
                                        } else {
                                          field.onChange(field.value.filter(val => val !== level));
                                        }
                                      }}
                                      id={`slack-level-${level}`}
                                    />
                                    <Label htmlFor={`slack-level-${level}`} className="capitalize">{level}</Label>
                                  </div>
                                </FormControl>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
                            Select which severity levels trigger Slack notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator className="my-4" />
                    
                    <div className="rounded-md border p-4 bg-muted/50">
                      <h3 className="text-sm font-medium mb-2">Test Slack Configuration</h3>
                      <div className="grid gap-4 grid-cols-1">
                        <div className="flex items-end">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={testSlackConfig}
                            disabled={testingSlack || !isSlackEnabled}
                            className="w-full"
                          >
                            {testingSlack ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Send Test Message
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
              
              {/* Webhook Notifications */}
              <TabsContent value="webhook" className="space-y-4">
                <FormField
                  control={form.control}
                  name="webhookNotifications.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Webhook Notifications</FormLabel>
                        <FormDescription>
                          Send alert notifications to an external webhook endpoint
                        </FormDescription>
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
                
                {isWebhookEnabled && (
                  <>
                    <div className="rounded-md bg-yellow-50 p-4 mt-2 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Coming Soon</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>Webhook notifications are coming in a future update. You can configure the settings now, but they won't be active until the feature is fully implemented.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="webhookNotifications.url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://your-service.com/webhook" {...field} />
                          </FormControl>
                          <FormDescription>
                            The URL that will receive webhook POST requests
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="webhookNotifications.secret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook Secret (Optional)</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="shared secret key" {...field} />
                          </FormControl>
                          <FormDescription>
                            A secret key used to sign webhook requests for verification
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>
              
              {/* SMS Notifications */}
              <TabsContent value="sms" className="space-y-4">
                <FormField
                  control={form.control}
                  name="smsNotifications.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">SMS Notifications</FormLabel>
                        <FormDescription>
                          Send critical alert notifications via SMS
                        </FormDescription>
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
                
                {isSmsEnabled && (
                  <>
                    <div className="rounded-md bg-yellow-50 p-4 mt-2 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Coming Soon</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>SMS notifications are coming in a future update. You can configure the settings now, but they won't be active until the feature is fully implemented.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="smsNotifications.provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMS Provider</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="twilio">Twilio</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select which SMS service to use
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>
            
            <CardFooter className="flex justify-end px-0 pt-4">
              <Button type="submit" className="w-full md:w-auto">
                Save Notification Configuration
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}