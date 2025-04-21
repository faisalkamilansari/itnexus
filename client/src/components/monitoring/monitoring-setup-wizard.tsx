import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Server, 
  Database, 
  PanelLeft, 
  BarChart4,
  LucideIcon,
  Activity,
  Send 
} from "lucide-react";

// Wizard steps schema
const basicInfoSchema = z.object({
  instanceName: z.string().min(3, "Instance name must be at least 3 characters"),
  environment: z.enum(["development", "staging", "production"]),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
});

const endpointsSchema = z.object({
  prometheusUrl: z.string().url("Please enter a valid URL"),
  scrapingInterval: z.coerce.number().min(15, "Minimum 15 seconds").max(3600, "Maximum 3600 seconds (1 hour)"),
  apiEndpoint: z.boolean().default(true),
  enableNodeExporter: z.boolean().default(false),
  nodeExporterUrls: z.array(z.string().url("Please enter a valid URL")).optional().default([]),
  nodeExporterPort: z.coerce.number().min(1024, "Port must be above 1024").max(65535, "Port must be below 65535").default(9100),
});

const metricsSchema = z.object({
  systemMetrics: z.boolean().default(true),
  applicationMetrics: z.boolean().default(true),
  databaseMetrics: z.boolean().default(true),
  businessMetrics: z.boolean().default(true),
  customMetrics: z.boolean().default(false),
});

const notificationsSchema = z.object({
  alertingMethod: z.enum(["email", "slack", "webhook", "none"]),
  contactEmail: z.string().email("Please enter a valid email").optional(),
  slackWebhook: z.string().url("Please enter a valid URL").optional(),
  webhookUrl: z.string().url("Please enter a valid URL").optional(),
  severity: z.array(z.string()).min(1, "Select at least one severity level"),
});

// Combined schema
const wizardSchema = z.object({
  basicInfo: basicInfoSchema,
  endpoints: endpointsSchema,
  metrics: metricsSchema,
  notifications: notificationsSchema,
});

type WizardData = z.infer<typeof wizardSchema>;

// Step configuration
interface StepProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: StepProps[] = [
  {
    title: "Basic Information",
    description: "Set up your monitoring instance",
    icon: Server,
  },
  {
    title: "Endpoints Configuration",
    description: "Configure Prometheus endpoints",
    icon: PanelLeft,
  },
  {
    title: "Metrics Selection",
    description: "Choose what metrics to collect",
    icon: BarChart4,
  },
  {
    title: "Alerting & Notifications",
    description: "Set up alerts and notifications",
    icon: Send,
  },
];

export default function MonitoringSetupWizard() {
  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [nodeExporterMode, setNodeExporterMode] = useState(false);
  const { toast } = useToast();
  
  // Form with default values
  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      basicInfo: {
        instanceName: "",
        environment: "production",
        organizationName: "",
      },
      endpoints: {
        prometheusUrl: "http://localhost:9090",
        scrapingInterval: 60,
        apiEndpoint: true,
        enableNodeExporter: false,
        nodeExporterUrls: [],
        nodeExporterPort: 9100,
      },
      metrics: {
        systemMetrics: true,
        applicationMetrics: true,
        databaseMetrics: true,
        businessMetrics: true,
        customMetrics: false,
      },
      notifications: {
        alertingMethod: "email",
        contactEmail: "",
        slackWebhook: "",
        webhookUrl: "",
        severity: ["critical", "warning"],
      },
    },
    mode: "onChange",
  });
  
  // Listen for event to switch directly to Node Exporter setup
  useEffect(() => {
    const handleNodeExporterSetup = () => {
      setStep(1); // Navigate to endpoints step
      setNodeExporterMode(true);
      
      // Pre-set form values for Node Exporter only setup
      form.setValue("endpoints.enableNodeExporter", true);
      form.setValue("endpoints.apiEndpoint", false);
      form.setValue("endpoints.nodeExporterPort", 9100);
      
      // Ensure we have at least one empty URL field ready for input
      const currentUrls = form.getValues("endpoints.nodeExporterUrls");
      if (!currentUrls || currentUrls.length === 0) {
        form.setValue("endpoints.nodeExporterUrls", [""]);
      }

      // Pre-set some basic info for easy saving
      form.setValue("basicInfo.instanceName", "Node Exporter Monitoring");
      form.setValue("basicInfo.organizationName", "Default Organization");
    };
    
    window.addEventListener('openNodeExporterSetup', handleNodeExporterSetup);
    
    return () => {
      window.removeEventListener('openNodeExporterSetup', handleNodeExporterSetup);
    };
  }, [form]);
  
  const isValid = () => {
    switch (step) {
      case 0:
        return form.getFieldState("basicInfo.instanceName").invalid === false &&
               form.getFieldState("basicInfo.organizationName").invalid === false;
      case 1:
        // If in Node Exporter mode, we only need to validate Node Exporter fields
        if (nodeExporterMode) {
          const portValid = form.getFieldState("endpoints.nodeExporterPort").invalid === false;
          
          // URLs might be empty in a valid state, so only check existing non-empty URLs for validity
          const urls = form.watch("endpoints.nodeExporterUrls") || [];
          
          // Filter out empty URLs - empty values are valid, but must be validated if they have content
          const nonEmptyUrls = urls.filter(url => url && url.trim() !== "");
          
          // If we have non-empty URLs, make sure they are all valid
          const urlsValid = nonEmptyUrls.length === 0 || nonEmptyUrls.every((_, index) => {
            const fieldState = form.getFieldState(`endpoints.nodeExporterUrls.${index}`);
            return fieldState.invalid === false;
          });
          
          // For Node Exporter mode, we don't need the Prometheus URL
          return portValid && urlsValid;
        }
        
        // For regular Prometheus setup
        const baseValid = form.getFieldState("endpoints.prometheusUrl").invalid === false &&
               form.getFieldState("endpoints.scrapingInterval").invalid === false;
        
        // If Node Exporter is enabled in regular mode, also validate its fields
        if (form.watch("endpoints.enableNodeExporter")) {
          const portValid = form.getFieldState("endpoints.nodeExporterPort").invalid === false;
          
          // Check if any Node Exporter URLs are invalid
          const urls = form.watch("endpoints.nodeExporterUrls") || [];
          const urlsValid = urls.every((_, index) => {
            return form.getFieldState(`endpoints.nodeExporterUrls.${index}`).invalid === false;
          });
          
          return baseValid && portValid && urlsValid;
        }
        
        return baseValid;
      case 2:
        // Metrics step is always valid as checkboxes have defaults
        return true;
      case 3:
        const alertMethod = form.watch("notifications.alertingMethod");
        if (alertMethod === "email") {
          return form.getFieldState("notifications.contactEmail").invalid === false;
        } else if (alertMethod === "slack") {
          return form.getFieldState("notifications.slackWebhook").invalid === false;
        } else if (alertMethod === "webhook") {
          return form.getFieldState("notifications.webhookUrl").invalid === false;
        }
        return form.getFieldState("notifications.severity").invalid === false;
      default:
        return false;
    }
  };
  
  const nextStep = () => {
    if (step === STEPS.length - 1) {
      completeSetup();
    } else {
      setStep(step + 1);
    }
  };
  
  const prevStep = () => {
    setStep(Math.max(0, step - 1));
  };
  
  const completeSetup = async () => {
    try {
      const values = form.getValues();
      
      // If in Node Exporter mode, we're only configuring Node Exporter
      if (nodeExporterMode && step === 1) {
        // We need to give it a proper name for Node Exporter only mode
        if (!values.basicInfo.instanceName) {
          values.basicInfo.instanceName = "Node Exporter Monitoring";
        }
        if (!values.basicInfo.organizationName) {
          values.basicInfo.organizationName = "Default Organization";
        }
        
        console.log("Submitting Node Exporter setup:", values);
      } else {
        console.log("Submitting full monitoring setup:", values);
      }
      
      // Send the configuration data to the server to be saved
      const response = await apiRequest("POST", "/api/monitoring/setup", values);
      const savedInstance = await response.json();
      
      console.log("Monitoring configuration saved:", savedInstance);
      
      // If in Node Exporter mode, close the dialog without showing completion screen
      if (nodeExporterMode && step === 1) {
        toast({
          title: "Node Exporter Configured",
          description: "Your Node Exporter monitoring has been set up successfully!",
        });
        
        // Close dialog and return to monitoring dashboard
        window.dispatchEvent(new CustomEvent('prometheusConfigured', { 
          detail: { success: true, nodeExporterMode: true }
        }));
        
        // Close dialog
        setTimeout(() => {
          const closeButton = document.querySelector('[data-radix-dialog-close]');
          if (closeButton) {
            (closeButton as HTMLButtonElement).click();
          }
        }, 100);
      } else {
        // Normal wizard completion
        setIsComplete(true);
        toast({
          title: "Setup Complete",
          description: "Your Prometheus monitoring has been configured successfully!",
        });
      }
    } catch (error) {
      console.error("Error in setup:", error);
      toast({
        title: "Setup Failed",
        description: "There was a problem setting up monitoring. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const restartSetup = () => {
    form.reset();
    setStep(0);
    setIsComplete(false);
  };
  
  if (isComplete) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Activity className="mr-2 h-5 w-5 text-green-500" />
            Monitoring Setup Complete
          </CardTitle>
          <CardDescription>
            Your Prometheus monitoring instance has been configured
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Setup Successful!</h3>
            <p className="text-gray-500">
              Prometheus monitoring has been set up and configured for your environment.
              You can now view metrics and configure additional settings in the monitoring dashboard.
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md text-left">
            <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
            <ul className="list-disc pl-5 text-blue-700 space-y-1">
              {form.getValues("endpoints.enableNodeExporter") && (
                <li>Configure additional Node Exporter instances through the monitoring settings</li>
              )}
              <li>Configure additional alert rules in the Alerting section</li>
              <li>Set up dashboards to visualize your metrics</li>
              <li>Invite team members to access the monitoring system</li>
              <li>Review the documentation for advanced configuration</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={restartSetup}>
            Configure Another Instance
          </Button>
          <DialogPrimitive.Close asChild>
            <Button onClick={() => {
              // This function will close the dialog and then return to the monitoring page
              setTimeout(() => {
                // Make sure dialog is fully closed before doing anything else
                window.dispatchEvent(new CustomEvent('prometheusConfigured', { 
                  detail: { success: true }
                }));
              }, 100);
            }}>
              Go to Monitoring Dashboard
            </Button>
          </DialogPrimitive.Close>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          {(() => {
            const StepIcon = nodeExporterMode && step === 1 ? Activity : STEPS[step].icon;
            return <StepIcon className="mr-2 h-5 w-5 text-primary" />;
          })()}
          {nodeExporterMode && step === 1 ? "Node Exporter Configuration" : STEPS[step].title}
        </CardTitle>
        <CardDescription>
          {nodeExporterMode && step === 1 
            ? "Configure Node Exporter for direct system metrics collection" 
            : STEPS[step].description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicator */}
        {nodeExporterMode ? (
          <div className="mb-6 flex items-center justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex justify-between">
              {STEPS.map((s, i) => (
                <div 
                  key={i} 
                  className={`flex-1 text-center ${i === step ? 'text-primary' : i < step ? 'text-gray-500' : 'text-gray-300'}`}
                >
                  <div className="relative">
                    <div 
                      className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full border-2 
                        ${i === step ? 'border-primary bg-primary/10' : 
                          i < step ? 'border-gray-500 bg-gray-100' : 'border-gray-200 bg-white'}`}
                    >
                      {i < step ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    
                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div 
                        className={`absolute top-4 w-full h-0.5 
                          ${i < step ? 'bg-gray-500' : 'bg-gray-200'}`}
                      ></div>
                    )}
                  </div>
                  <div className="hidden md:block mt-2 text-xs">
                    {s.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Form {...form}>
          <form className="space-y-6">
            {/* Step 1: Basic Information */}
            {step === 0 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="basicInfo.instanceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monitoring Instance Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production Monitoring" {...field} />
                      </FormControl>
                      <FormDescription>
                        A unique name for this monitoring instance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="basicInfo.environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Environment</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The environment this monitoring instance is for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="basicInfo.organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your organization or team name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Step 2: Endpoints Configuration */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Only show Prometheus fields when not in Node Exporter mode */}
                {!nodeExporterMode && (
                  <>
                    <FormField
                      control={form.control}
                      name="endpoints.prometheusUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prometheus Server URL</FormLabel>
                          <FormControl>
                            <Input placeholder="http://localhost:9090" {...field} />
                          </FormControl>
                          <FormDescription>
                            The URL where your Prometheus server is accessible
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endpoints.scrapingInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scraping Interval (seconds)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>
                            How often Prometheus should collect metrics (15-3600 seconds)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endpoints.apiEndpoint"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Enable API Endpoint
                            </FormLabel>
                            <FormDescription>
                              Expose a /metrics endpoint for Prometheus to scrape
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Separator className="my-4" />
                    
                    <h3 className="text-base font-medium mb-3">Node Exporter Configuration</h3>
                    
                    <FormField
                      control={form.control}
                      name="endpoints.enableNodeExporter"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Enable Node Exporter Integration
                            </FormLabel>
                            <FormDescription>
                              Connect directly to Node Exporter instances for system-level metrics
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {/* Special header for Node Exporter mode */}
                {nodeExporterMode && (
                  <div className="mb-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                      <h3 className="text-base font-medium text-blue-800 mb-2">Node Exporter Configuration</h3>
                      <p className="text-sm text-blue-700">
                        Configure direct system metrics collection using Node Exporter. 
                        Node Exporter provides hardware and OS metrics from your servers.
                      </p>
                    </div>
                  </div>
                )}

                {form.watch("endpoints.enableNodeExporter") && (
                  <div className="space-y-4 mt-4 pl-6 border-l-2 border-primary/20">
                    <FormField
                      control={form.control}
                      name="endpoints.nodeExporterPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Node Exporter Port</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>
                            Default port is 9100
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <FormLabel>Node Exporter URLs (Optional)</FormLabel>
                      <FormDescription className="mt-0">
                        Enter specific Node Exporter URLs if available
                      </FormDescription>
                      
                      {form.watch("endpoints.nodeExporterUrls")?.map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`endpoints.nodeExporterUrls.${index}`}
                            render={({ field }) => (
                              <FormItem className="flex-1 mb-0">
                                <FormControl>
                                  <Input placeholder="http://node-host:9100" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              const currentUrls = form.getValues("endpoints.nodeExporterUrls") || [];
                              form.setValue(
                                "endpoints.nodeExporterUrls",
                                currentUrls.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const currentUrls = form.getValues("endpoints.nodeExporterUrls") || [];
                          form.setValue("endpoints.nodeExporterUrls", [...currentUrls, ""]);
                        }}
                      >
                        Add Node Exporter URL
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Metrics Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 mb-4">
                  Select which metrics you want to collect and monitor
                </p>
                
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="metrics.systemMetrics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            System Metrics
                          </FormLabel>
                          <FormDescription>
                            CPU, memory, disk usage, and network metrics
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="metrics.applicationMetrics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Application Metrics
                          </FormLabel>
                          <FormDescription>
                            API response times, error rates, and request counts
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="metrics.databaseMetrics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Database Metrics
                          </FormLabel>
                          <FormDescription>
                            Query times, connection pool, and database performance
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="metrics.businessMetrics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Business Metrics
                          </FormLabel>
                          <FormDescription>
                            User activity, transactions, and business KPIs
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="metrics.customMetrics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Custom Metrics
                          </FormLabel>
                          <FormDescription>
                            Enable support for custom application metrics
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            {/* Step 4: Notifications */}
            {step === 3 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notifications.alertingMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Alert Notifications Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="email" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Email Notifications
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="slack" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Slack Notifications
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="webhook" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Custom Webhook
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="none" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              No Notifications
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="my-4" />
                
                {form.watch("notifications.alertingMethod") === "email" && (
                  <FormField
                    control={form.control}
                    name="notifications.contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="alerts@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Email address to receive alert notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch("notifications.alertingMethod") === "slack" && (
                  <FormField
                    control={form.control}
                    name="notifications.slackWebhook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slack Webhook URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://hooks.slack.com/services/..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Slack webhook URL for alert notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch("notifications.alertingMethod") === "webhook" && (
                  <FormField
                    control={form.control}
                    name="notifications.webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-service.com/webhook" {...field} />
                        </FormControl>
                        <FormDescription>
                          Custom webhook URL for alert notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch("notifications.alertingMethod") !== "none" && (
                  <FormField
                    control={form.control}
                    name="notifications.severity"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Alert Severity Levels</FormLabel>
                          <FormDescription>
                            Select which severity levels to send notifications for
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          <FormField
                            control={form.control}
                            name="notifications.severity"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes('critical')}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, 'critical'])
                                        : field.onChange(field.value?.filter((value) => value !== 'critical'));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-red-600">
                                  Critical Alerts
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="notifications.severity"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes('warning')}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, 'warning'])
                                        : field.onChange(field.value?.filter((value) => value !== 'warning'));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-yellow-600">
                                  Warning Alerts
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="notifications.severity"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes('info')}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, 'info'])
                                        : field.onChange(field.value?.filter((value) => value !== 'info'));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-blue-600">
                                  Informational Alerts
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        {nodeExporterMode && step === 1 ? (
          <Button
            variant="outline"
            onClick={() => {
              setNodeExporterMode(false);
              window.dispatchEvent(new CustomEvent('prometheusConfigured', { 
                detail: { success: false }
              }));
              // Close dialog
              setTimeout(() => {
                const closeButton = document.querySelector('[data-radix-dialog-close]');
                if (closeButton) {
                  (closeButton as HTMLButtonElement).click();
                }
              }, 100);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        )}
        
        <Button
          onClick={nodeExporterMode && step === 1 ? completeSetup : nextStep}
          disabled={!isValid()}
        >
          {step === STEPS.length - 1 ? 'Complete Setup' : 
            (nodeExporterMode && step === 1) ? 'Save Node Exporter Configuration' : 'Next'} 
          {step < STEPS.length - 1 && !nodeExporterMode && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}