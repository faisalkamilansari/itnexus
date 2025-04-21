import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createChangeRequest, updateChangeRequest, fetchAssets } from "@/lib/api";
import { insertChangeRequestSchema } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ChangeRequest, Asset } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

// Create a form-specific schema separated from the API schema
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  changeType: z.enum(["normal", "standard", "emergency"]).default("normal"),
  impact: z.enum(["low", "medium", "high"]).default("medium"),
  risk: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum([
    "draft", "submitted", "under_review", "approved", 
    "rejected", "scheduled", "implementing", "completed", 
    "failed", "cancelled"
  ]).default("draft"),
  // For form validation, we treat dates as strings with more specific validation
  scheduledStartTime: z.string()
    .refine(val => val === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val), {
      message: "Invalid date/time format"
    })
    .optional(),
  scheduledEndTime: z.string()
    .refine(val => val === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val), {
      message: "Invalid date/time format"
    })
    .optional(),
  implementationPlan: z.string().optional(),
  rollbackPlan: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ChangeFormProps {
  change?: ChangeRequest;
  onSuccess?: () => void;
}

export default function ChangeForm({ change, onSuccess }: ChangeFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedAssets, setSelectedAssets] = useState<number[]>(
    change?.affectedAssets || []
  );
  
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: fetchAssets,
  });

  // Format the date for datetime-local input
  const formatDateForInput = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "";
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      console.error("Invalid date:", dateString);
      return "";
    }
    
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);
  };

  // Create default values based on whether we're editing or creating
  const defaultValues: Partial<FormValues> = change ? {
    title: change.title,
    description: change.description,
    changeType: change.changeType,
    impact: change.impact,
    risk: change.risk,
    status: change.status,
    implementationPlan: change.implementationPlan || "",
    rollbackPlan: change.rollbackPlan || "",
    scheduledStartTime: formatDateForInput(change.scheduledStartTime),
    scheduledEndTime: formatDateForInput(change.scheduledEndTime),
  } : {
    title: "",
    description: "",
    changeType: "normal",
    impact: "medium",
    risk: "medium",
    status: "draft",
    implementationPlan: "",
    rollbackPlan: "",
    scheduledStartTime: "",
    scheduledEndTime: "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: createChangeRequest,
    onSuccess: () => {
      toast({
        title: "Change request created",
        description: "The change request has been created successfully.",
      });
      form.reset();
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/change-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating change request",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateChangeRequest,
    onSuccess: () => {
      toast({
        title: "Change request updated",
        description: "The change request has been updated successfully.",
      });
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/change-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating change request",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Validate datetime input to prevent more than 4 digits in year
  const validateDateTimeInput = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    // Check if the date follows valid format and year isn't more than 4 digits
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    const value = e.target.value;

    if (value === "" || dateRegex.test(value)) {
      // Extract year from the date string
      if (value) {
        const year = parseInt(value.substring(0, 4));
        if (year > 2100 || year < 1970) {
          // Prevent invalid years
          return;
        }
      }
      field.onChange(e);
    }
  };

  const onSubmit = (data: FormValues) => {
    if (!user?.tenantId) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: change ? "Updating change request..." : "Creating change request...",
        description: "Please wait while we process your request",
      });

      console.log("Form submission data:", data);

      // Send data with tenant ID and assets with proper date objects
      const formData = {
        ...data,
        tenantId: user.tenantId,
        affectedAssets: selectedAssets,
        // Ensure scheduledStartTime and scheduledEndTime are Date objects for the API
        scheduledStartTime: data.scheduledStartTime ? new Date(data.scheduledStartTime as unknown as string) : null,
        scheduledEndTime: data.scheduledEndTime ? new Date(data.scheduledEndTime as unknown as string) : null,
      };

      console.log("Processed API data:", formData);

      if (change) {
        updateMutation.mutate({ id: change.id, data: formData });
      } else {
        createMutation.mutate(formData);
      }
    } catch (error) {
      toast({
        title: change ? "Error updating change request" : "Error creating change request",
        description: (error as Error).message,
        variant: "destructive",
      });
      console.error("Change request operation error:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleAssetToggle = (assetId: number) => {
    setSelectedAssets(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter change title" {...field} />
              </FormControl>
              <FormDescription>
                A clear and concise title for the change
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
                  placeholder="Describe the change in detail"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Detailed information about what will change and why
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="changeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Change Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select change type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Category of the change
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="impact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Impact</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select impact level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Impact level of the change
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="risk"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risk</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Risk level of the change
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {change && (
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="implementing">Implementing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Current status of the change
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="scheduledStartTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Start Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    value={field.value || ""}
                    onChange={(e) => validateDateTimeInput(e, field)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    min="1970-01-01T00:00" 
                    max="2100-12-31T23:59" 
                  />
                </FormControl>
                <FormDescription>
                  When the change implementation will start
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="scheduledEndTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled End Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    value={field.value || ""}
                    onChange={(e) => validateDateTimeInput(e, field)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    min="1970-01-01T00:00" 
                    max="2100-12-31T23:59" 
                  />
                </FormControl>
                <FormDescription>
                  When the change implementation will end
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="implementationPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Implementation Plan</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Step by step plan for implementing the change"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Detailed steps for how the change will be implemented
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="rollbackPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rollback Plan</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Plan for rolling back the change if needed"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Steps to restore service if the change needs to be reversed
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <FormLabel>Affected Assets</FormLabel>
          <div className="border rounded-md p-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {assetsLoading ? (
                <div className="col-span-2 text-center py-4">Loading assets...</div>
              ) : assets.length === 0 ? (
                <div className="col-span-2 text-center py-4">No assets found</div>
              ) : (
                assets.map((asset: Asset) => (
                  <div key={asset.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`asset-${asset.id}`} 
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={() => handleAssetToggle(asset.id)}
                    />
                    <label
                      htmlFor={`asset-${asset.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {asset.name} ({asset.type})
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess?.()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : change ? "Update Change" : "Create Change"}
          </Button>
        </div>
      </form>
    </Form>
  );
}