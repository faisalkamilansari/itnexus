import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createServiceRequest, updateServiceRequest, fetchAssets } from "@/lib/api";
import { insertServiceRequestSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ServiceRequest, ServiceCatalogItem, Asset } from "@shared/schema";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CalendarIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";



// Extend the insertServiceRequestSchema with additional client-side validation
// This logs the schema details to help with debugging
console.log("Original insert schema:", insertServiceRequestSchema);

// Log the schema fields
console.log("Expected schema fields:", Object.keys(insertServiceRequestSchema.shape || {}));

// Log the default values we're using
console.log("Default form values:", {
  title: "",
  description: "",
  requestType: "",
  priority: "medium",
  status: "new",
  formData: {},
});

const formSchema = insertServiceRequestSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Please select a priority level"
  }),
  requestType: z.enum([
    "password_reset", 
    "new_equipment", 
    "software_installation", 
    "access_request", 
    "technical_support", 
    "network_issue", 
    "other"
  ], {
    required_error: "Please select a request type"
  }),
  // Make tenantId optional in the form schema since we'll add it during submission
  tenantId: z.number().optional(),
  // Allow relatedAsset to be a number or null
  relatedAsset: z.number().nullable().optional(),
  // Ensure formData is properly typed as a Record/object rather than unknown
  formData: z.record(z.string().optional()).optional().default({}),
  // Enhanced date validation for dueDate
  dueDate: z.union([
    // Empty string is allowed
    z.literal(""),
    // Standard ISO date format (YYYY-MM-DD)
    z.string().refine(val => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "Date format should be YYYY-MM-DD"
    }),
    // Allow common date formats during typing (MM/DD/YYYY, MM-DD-YYYY)
    z.string().refine(val => 
      /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/.test(val), {
      message: "Date should be MM/DD/YYYY, MM-DD-YYYY or similar"
    }),
    // Already a Date object
    z.date()
  ])
  .optional()
  // Transform to proper Date on form submission
  .transform(val => {
    if (!val) return undefined;
    if (val === "") return undefined;
    if (val instanceof Date) return val;
    
    // Handle common date formats
    if (/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/.test(val)) {
      // Convert MM/DD/YYYY to YYYY-MM-DD for Date constructor
      const [_, month, day, year] = val.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/) || [];
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    
    // Handle ISO format
    return new Date(val);
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface RequestFormProps {
  request?: ServiceRequest;
  catalogItems: ServiceCatalogItem[];
  onSuccess?: () => void;
}

export default function RequestForm({ request, catalogItems, onSuccess }: RequestFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ServiceCatalogItem | null>(null);
  
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: fetchAssets,
  });

  // Map any requestType string to a valid enum value
  const mapToValidRequestType = (type: string): "password_reset" | "new_equipment" | "software_installation" | "access_request" | "technical_support" | "network_issue" | "other" => {
    const lowercased = type.toLowerCase();
    
    if (lowercased.includes('password')) return "password_reset";
    if (lowercased.includes('equipment') || lowercased.includes('hardware')) return "new_equipment";
    if (lowercased.includes('software') || lowercased.includes('install')) return "software_installation";
    if (lowercased.includes('access')) return "access_request";
    if (lowercased.includes('support')) return "technical_support";
    if (lowercased.includes('network')) return "network_issue";
    
    return "other";
  };
  
  // Format the date for input
  const formatDateForInput = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "";
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      console.error("Invalid date:", dateString);
      return "";
    }
    
    return date.toISOString().split('T')[0];
  };
  
  // Handle date input with a more user-friendly approach
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    
    // Allow empty values
    if (!value || value === "") {
      field.onChange("");
      return;
    }

    try {
      // If the input came from the date picker (looks like YYYY-MM-DD)
      if (e.target.type === 'date' || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const dateObj = new Date(value);
        
        // Check if it's a valid date
        if (!isNaN(dateObj.getTime())) {
          // Format as YYYY-MM-DD for consistent storage
          const formattedDate = dateObj.toISOString().split('T')[0];
          field.onChange(formattedDate);
          
          console.log("Date picker format processed:", {
            original: value,
            formatted: formattedDate,
            dateObject: dateObj
          });
        } else {
          console.warn("Invalid date from picker:", value);
          field.onChange(value);
        }
      } 
      // For manual text input, store as is during typing
      else {
        // Allow typing while maintaining the text format
        field.onChange(value);
        
        // Try to convert typed text to date when appropriate
        if (value.length >= 8) { // Reasonable date string length
          // Common date input patterns
          const dateFormats = [
            // Try to parse various date formats
            new Date(value), // Standard parsing
            new Date(value.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2')), // MM/DD/YYYY
            new Date(value.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$1-$2')), // MM-DD-YYYY
            new Date(value.replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/, '$3-$1-$2')) // MM.DD.YYYY
          ];
          
          // Find first valid date
          const validDate = dateFormats.find(d => !isNaN(d.getTime()));
          
          if (validDate) {
            console.log("Successfully parsed typed date:", {
              original: value,
              parsed: validDate
            });
            // Don't update field during typing to avoid disrupting the user
          }
        }
      }
    } catch (err) {
      console.error("Date parsing error:", err);
      // Just pass the value as is if we hit an error
      field.onChange(value);
    }
  };

  // Create default values based on whether we're editing or creating
  const defaultValues: Partial<FormValues> = request ? {
    title: request.title,
    description: request.description,
    // Convert any string requestType to a valid enum value
    requestType: mapToValidRequestType(request.requestType),
    priority: request.priority as "low" | "medium" | "high",
    status: request.status,
    relatedAsset: request.relatedAsset,
    // Format due date for input
    dueDate: formatDateForInput(request.dueDate),
    // Add tenantId from user if available
    tenantId: user?.tenantId || request.tenantId,
    // Ensure formData is properly handled as an object
    formData: request.formData ? (typeof request.formData === 'string' 
      ? JSON.parse(request.formData) 
      : request.formData as Record<string, any>) : {},
  } : {
    title: "",
    description: "",
    requestType: "other", // Initialize with a valid enum value
    priority: "medium",
    status: "new",
    formData: {},
    dueDate: "", // Initialize with empty due date
    // Add tenantId from user if available
    tenantId: user?.tenantId
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange" // Enable validation on change for better error visibility
  });
  
  // Debug form errors
  useEffect(() => {
    const subscription = form.watch(() => {
      console.log("Form values:", form.getValues());
      console.log("Form errors:", form.formState.errors);
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Initialize tenant ID from user
  useEffect(() => {
    if (user?.tenantId) {
      console.log("Setting tenant ID in form:", user.tenantId);
      form.setValue("tenantId", user.tenantId);
    }
  }, [user, form]);

  // When a catalog item is selected, update the form with predefined values
  useEffect(() => {
    if (selectedCatalogItem) {
      // Map service catalog name to valid request type enum value
      const getRequestTypeFromCatalog = (catalog: string): "password_reset" | "new_equipment" | "software_installation" | "access_request" | "technical_support" | "network_issue" | "other" => {
        const lowercased = catalog.toLowerCase();
        
        if (lowercased.includes('password')) return "password_reset";
        if (lowercased.includes('equipment') || lowercased.includes('hardware')) return "new_equipment";
        if (lowercased.includes('software') || lowercased.includes('install')) return "software_installation";
        if (lowercased.includes('access')) return "access_request";
        if (lowercased.includes('support')) return "technical_support";
        if (lowercased.includes('network')) return "network_issue";
        
        return "other";
      };
      
      form.setValue("requestType", getRequestTypeFromCatalog(selectedCatalogItem.name));
      form.setValue("title", selectedCatalogItem.name);
      form.setValue("description", selectedCatalogItem.description);
      
      // If the catalog item has a form template, initialize formData
      if (selectedCatalogItem.formTemplate) {
        form.setValue("formData", 
          // Initialize with empty values for all fields in the template
          Object.keys(selectedCatalogItem.formTemplate).reduce(
            (acc, key) => ({ ...acc, [key]: "" }), 
            {}
          )
        );
      }
    }
  }, [selectedCatalogItem, form]);

  const createMutation = useMutation({
    mutationFn: createServiceRequest,
    onSuccess: () => {
      toast({
        title: "Service request created",
        description: "The service request has been created successfully.",
      });
      form.reset();
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating service request",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateServiceRequest,
    onSuccess: () => {
      toast({
        title: "Service request updated",
        description: "The service request has been updated successfully.",
      });
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating service request",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submission starting", { data, user });
    
    if (!user?.tenantId) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      console.error("No tenant ID found in user data", user);
      return;
    }

    // Ensure formData is properly formatted as an object and add tenantId
    const formattedData = {
      ...data,
      tenantId: user.tenantId,
      formData: data.formData || {},
      // Handle date conversion for different input formats
      ...(data.dueDate && { 
        dueDate: (() => {
          // Already a Date object
          if (data.dueDate instanceof Date) return data.dueDate;
          
          // For typed date formats like MM/DD/YYYY, MM-DD-YYYY, etc.
          if (/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/.test(data.dueDate)) {
            const [_, month, day, year] = data.dueDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/) || [];
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          }
          
          // For ISO format YYYY-MM-DD
          return new Date(data.dueDate);
        })()
      }),
      // Add requestedBy if available
      ...(user.id && { requestedBy: user.id })
    };
    
    console.log("Service request submission data:", formattedData);
    
    try {
      console.log("About to submit request", { 
        isUpdating: !!request, 
        requestId: request?.id,
        mutationStatus: request ? updateMutation.status : createMutation.status 
      });
      
      toast({
        title: request ? "Updating service request..." : "Creating service request...",
        description: "Please wait while we process your request",
      });
      
      if (request) {
        console.log("Calling updateMutation.mutate");
        updateMutation.mutate({ id: request.id, data: formattedData });
      } else {
        console.log("Calling createMutation.mutate");
        createMutation.mutate(formattedData);
      }
      
      console.log("Mutation called successfully");
    } catch (error) {
      console.error("Service request operation error (caught):", error);
      toast({
        title: request ? "Error updating service request" : "Error creating service request",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Add a direct handler for form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submit button clicked!");
    
    try {
      // First, ensure requestType is valid regardless of case and format
      const currentValues = form.getValues();
      
      // Fix the requestType if it's not in the correct format
      if (currentValues.requestType && typeof currentValues.requestType === 'string') {
        const normalizedType = mapToValidRequestType(currentValues.requestType);
        form.setValue("requestType", normalizedType, { shouldValidate: true });
      }
      
      // Log the form state with more details
      console.log("Form values after normalization:", JSON.stringify(form.getValues(), null, 2));
      console.log("Form errors:", JSON.stringify(form.formState.errors, null, 2));
      
      // Log each specific error for clarity
      Object.entries(form.formState.errors).forEach(([field, error]) => {
        console.log(`Error in field '${field}': ${error.message}`);
      });
      
      // Validate the form manually with await for proper error handling
      const isValid = await form.trigger();
      console.log("Manual validation result:", isValid);
      
      if (isValid) {
        console.log("Form is valid, submitting...");
        const data = form.getValues();
        
        // Ensure proper tenantId is present
        if (!data.tenantId && user?.tenantId) {
          data.tenantId = user.tenantId;
        }
        
        onSubmit(data);
      } else {
        console.error("Form validation failed");
        
        // Show more specific error messages
        const errorFields = Object.keys(form.formState.errors);
        const errorMessage = errorFields.length > 0 
          ? `Please check these fields: ${errorFields.join(', ')}` 
          : "Please fix the form errors before submitting.";
        
        toast({
          title: "Validation Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Form Error",
        description: "An unexpected error occurred during form submission",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {!request && catalogItems.length > 0 && (
          <FormItem>
            <FormLabel>Service Catalog</FormLabel>
            <Select
              onValueChange={(value) => {
                const catalogItem = catalogItems.find(item => item.id.toString() === value);
                setSelectedCatalogItem(catalogItem || null);
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select from service catalog" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {catalogItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Choose a predefined service or create a custom request
            </FormDescription>
          </FormItem>
        )}
        
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter request title" {...field} />
              </FormControl>
              <FormDescription>
                A clear title for the service request
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe what you need"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Detailed information about what you need
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="requestType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Request Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="password_reset">Password Reset</SelectItem>
                    <SelectItem value="new_equipment">New Equipment</SelectItem>
                    <SelectItem value="software_installation">Software Installation</SelectItem>
                    <SelectItem value="access_request">Access Request</SelectItem>
                    <SelectItem value="technical_support">Technical Support</SelectItem>
                    <SelectItem value="network_issue">Network Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Category of the service request
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The urgency of this request
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <div className="relative date-input-container flex">
                    <Input 
                      type="text" 
                      value={field.value || ""}
                      onChange={(e) => handleDateChange(e, field)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      className="date-input w-full pr-10"
                      placeholder="YYYY-MM-DD"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                      <Input 
                        type="date" 
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" 
                        value={field.value || ""}
                        min="1970-01-01" 
                        max="2100-12-31"
                        onChange={(e) => handleDateChange(e, field)}
                      />
                      <CalendarIcon className="h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  When this request needs to be completed by
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {request && (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Current status of the request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="relatedAsset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Related Asset</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    // Convert "none" to null, otherwise parse as int
                    const parsedValue = value === "none" ? null : (value ? parseInt(value) : null);
                    field.onChange(parsedValue);
                  }} 
                  defaultValue={field.value?.toString() || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an asset (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {assetsLoading ? (
                      <SelectItem value="loading" disabled>Loading assets...</SelectItem>
                    ) : assets?.length === 0 ? (
                      <SelectItem value="no_assets" disabled>No assets found</SelectItem>
                    ) : (
                      Array.isArray(assets) && assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.name} ({asset.type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The IT asset related to this request
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Dynamic form fields temporarily removed for troubleshooting */}
        {selectedCatalogItem ? (
          <div className="border rounded-md p-4">
            <h3 className="text-lg font-medium">Template: {selectedCatalogItem.name}</h3>
            <p className="text-sm text-muted-foreground">Using service template with ID: {selectedCatalogItem.id}</p>
          </div>
        ) : null}
        
        {/* 
          NOTE: Form validation issue fixed by:
          1. Converting requestType from a text input to a dropdown with predefined enum values
          2. Making sure the form schema validates requestType as one of these enum values
          3. Adding conversion functions to map any string requestType to a valid enum value
        */}
          
        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess?.()}
          >
            Cancel
          </Button>
          
          {/* Submit button */}
          <Button 
            type="submit"  
            disabled={isPending}
          >
            {isPending ? "Saving..." : request ? "Update Request" : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
