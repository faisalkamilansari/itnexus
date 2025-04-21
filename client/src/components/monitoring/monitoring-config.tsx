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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Info, Server, Database, RefreshCw } from "lucide-react";

// Validation schema for monitoring configuration form
const monitoringConfigSchema = z.object({
  // General settings
  enabled: z.boolean().default(true),
  refreshInterval: z.coerce.number().min(15).max(3600),
  
  // System monitoring
  systemMonitoring: z.object({
    enabled: z.boolean().default(true),
    cpuThreshold: z.coerce.number().min(50).max(95),
    memoryThreshold: z.coerce.number().min(50).max(95),
    diskThreshold: z.coerce.number().min(70).max(95),
    monitorServices: z.boolean().default(true),
  }),
  
  // Application monitoring
  applicationMonitoring: z.object({
    enabled: z.boolean().default(true),
    responseTimeThreshold: z.coerce.number().min(100).max(10000),
    errorRateThreshold: z.coerce.number().min(1).max(20),
    userSessionsMonitoring: z.boolean().default(true),
  }),
  
  // Database monitoring
  databaseMonitoring: z.object({
    enabled: z.boolean().default(true),
    queryTimeThreshold: z.coerce.number().min(100).max(10000),
    connectionPoolMonitoring: z.boolean().default(true),
    slowQueriesLogging: z.boolean().default(true),
  }),
  
  // Alerts
  alerting: z.object({
    enabled: z.boolean().default(true),
    emailNotifications: z.boolean().default(true),
    emailRecipients: z.string(),
    slackNotifications: z.boolean().default(false),
    slackWebhook: z.string().optional(),
    autoRemediation: z.boolean().default(false),
  }),
});

type MonitoringConfigFormValues = z.infer<typeof monitoringConfigSchema>;

export default function MonitoringConfig() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // Default values for the form
  const defaultValues: MonitoringConfigFormValues = {
    enabled: true,
    refreshInterval: 60,
    
    systemMonitoring: {
      enabled: true,
      cpuThreshold: 80,
      memoryThreshold: 80,
      diskThreshold: 85,
      monitorServices: true,
    },
    
    applicationMonitoring: {
      enabled: true,
      responseTimeThreshold: 1000,
      errorRateThreshold: 5,
      userSessionsMonitoring: true,
    },
    
    databaseMonitoring: {
      enabled: true,
      queryTimeThreshold: 500,
      connectionPoolMonitoring: true,
      slowQueriesLogging: true,
    },
    
    alerting: {
      enabled: true,
      emailNotifications: true,
      emailRecipients: "admin@example.com",
      slackNotifications: false,
      slackWebhook: "",
      autoRemediation: false,
    },
  };
  
  const form = useForm<MonitoringConfigFormValues>({
    resolver: zodResolver(monitoringConfigSchema),
    defaultValues,
  });
  
  async function onSubmit(data: MonitoringConfigFormValues) {
    try {
      // Here we would send the configuration to the backend
      // For now, we'll just log it and show a success message
      console.log("Monitoring configuration:", data);
      
      // Update Prometheus URL and configuration
      if (data.systemMonitoring.enabled) {
        // In a real implementation, this would be sent to the backend
        console.log("Prometheus data source configured successfully");
      }
      
      toast({
        title: "Monitoring configuration updated",
        description: "Your monitoring settings have been saved successfully.",
      });
      
      // Close the dialog by triggering a DialogPrimitive.Close from the parent component
      const event = new CustomEvent('monitoringConfigSaved', { detail: data });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error saving monitoring configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save monitoring configuration. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  const isEnabled = form.watch("enabled");
  const isSlackEnabled = form.watch("alerting.slackNotifications");
  const isEmailEnabled = form.watch("alerting.emailNotifications");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Activity className="mr-2 h-5 w-5 text-primary" />
          Monitoring Configuration
        </CardTitle>
        <CardDescription>
          Configure monitoring settings, thresholds, and alerts for your IT infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Monitoring</FormLabel>
                      <FormDescription>
                        Turn on or off all monitoring and alerting functions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {isEnabled && (
              <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-1 mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                  <TabsTrigger value="application">App</TabsTrigger>
                  <TabsTrigger value="database">Database</TabsTrigger>
                  <TabsTrigger value="alerting">Alerting</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="refreshInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Refresh Interval (seconds)</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-4">
                            <Slider
                              value={[field.value]}
                              min={15}
                              max={300}
                              step={15}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-20"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          How frequently metrics data should be refreshed (15 seconds to 5 minutes)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="rounded-md bg-blue-50 p-4 mt-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Monitoring System Information</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>The monitoring system collects metrics from various sources:</p>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>System metrics (CPU, memory, disk usage)</li>
                            <li>Application performance metrics</li>
                            <li>Database performance metrics</li>
                            <li>Business KPIs and operational metrics</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="system" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="systemMonitoring.enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">System Monitoring</FormLabel>
                          <FormDescription>
                            Monitor CPU, memory, disk usage and system services
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
                  
                  {form.watch("systemMonitoring.enabled") && (
                    <>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="systemMonitoring.cpuThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPU Usage Alert Threshold (%)</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-3">
                                  <Slider
                                    value={[field.value]}
                                    min={50}
                                    max={95}
                                    step={5}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                    className="flex-1"
                                  />
                                  <Badge variant={field.value > 85 ? "destructive" : field.value > 70 ? "outline" : "secondary"}>
                                    {field.value}%
                                  </Badge>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="systemMonitoring.memoryThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Memory Usage Alert Threshold (%)</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-3">
                                  <Slider
                                    value={[field.value]}
                                    min={50}
                                    max={95}
                                    step={5}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                    className="flex-1"
                                  />
                                  <Badge variant={field.value > 85 ? "destructive" : field.value > 70 ? "outline" : "secondary"}>
                                    {field.value}%
                                  </Badge>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="systemMonitoring.diskThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Disk Usage Alert Threshold (%)</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-3">
                                  <Slider
                                    value={[field.value]}
                                    min={70}
                                    max={95}
                                    step={5}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                    className="flex-1"
                                  />
                                  <Badge variant={field.value > 90 ? "destructive" : field.value > 80 ? "outline" : "secondary"}>
                                    {field.value}%
                                  </Badge>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="systemMonitoring.monitorServices"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Monitor System Services</FormLabel>
                              <FormDescription>
                                Track status of critical system services (web server, database, etc.)
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="application" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="applicationMonitoring.enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Application Monitoring</FormLabel>
                          <FormDescription>
                            Monitor application performance, response times, and error rates
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
                  
                  {form.watch("applicationMonitoring.enabled") && (
                    <>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="applicationMonitoring.responseTimeThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Response Time Threshold (ms)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormDescription>
                                Alert when response time exceeds this threshold
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="applicationMonitoring.errorRateThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Error Rate Threshold (%)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormDescription>
                                Alert when error rate exceeds this percentage
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="applicationMonitoring.userSessionsMonitoring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Monitor User Sessions</FormLabel>
                              <FormDescription>
                                Track active user sessions, login rates, and user activities
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="database" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="databaseMonitoring.enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Database Monitoring</FormLabel>
                          <FormDescription>
                            Monitor database performance, queries, and connection pool
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
                  
                  {form.watch("databaseMonitoring.enabled") && (
                    <>
                      <FormField
                        control={form.control}
                        name="databaseMonitoring.queryTimeThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Query Time Threshold (ms)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                              Alert when query execution time exceeds this threshold
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="databaseMonitoring.connectionPoolMonitoring"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Connection Pool Monitoring</FormLabel>
                                <FormDescription>
                                  Monitor database connection pool utilization
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="databaseMonitoring.slowQueriesLogging"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Slow Queries Logging</FormLabel>
                                <FormDescription>
                                  Log queries that exceed the time threshold
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="alerting" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="alerting.enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Alerting System</FormLabel>
                          <FormDescription>
                            Configure how alerts are processed and notifications are sent
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
                  
                  {form.watch("alerting.enabled") && (
                    <>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="alerting.emailNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Email Notifications</FormLabel>
                                <FormDescription>
                                  Send alert notifications via email
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="alerting.slackNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Slack Notifications</FormLabel>
                                <FormDescription>
                                  Send alert notifications to a Slack channel
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {isEmailEnabled && (
                        <FormField
                          control={form.control}
                          name="alerting.emailRecipients"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Recipients</FormLabel>
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
                      )}
                      
                      {isSlackEnabled && (
                        <FormField
                          control={form.control}
                          name="alerting.slackWebhook"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slack Webhook URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://hooks.slack.com/services/..." {...field} />
                              </FormControl>
                              <FormDescription>
                                Webhook URL for your Slack channel
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="alerting.autoRemediation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Auto-Remediation</FormLabel>
                              <FormDescription>
                                Automatically attempt to resolve certain types of alerts
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <div className="rounded-md bg-yellow-50 p-4 mt-2">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Auto-Remediation Notice</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>Auto-remediation is an advanced feature that will attempt to automatically fix issues as they arise. This could include:</p>
                              <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>Restarting services that have stopped</li>
                                <li>Cleaning up temporary files when disk space is low</li>
                                <li>Scaling resources when load increases</li>
                              </ul>
                              <p className="mt-2">Please ensure you understand the potential impact before enabling this feature.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
            
            <CardFooter className="flex justify-end px-0 pt-4">
              <Button type="submit">Save Configuration</Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}