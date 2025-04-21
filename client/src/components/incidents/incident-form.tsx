import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createIncident, updateIncident, fetchAssets } from "@/lib/api";
import { insertIncidentSchema } from "@shared/schema";
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
import { Incident, Asset } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// Form-specific schema separated from the API schema
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  severity: z.enum(["low", "medium", "high", "critical"], {
    required_error: "Please select a severity level"
  }),
  status: z.enum(["new", "assigned", "in_progress", "resolved", "closed"]).default("new"),
  affectedAsset: z.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface IncidentFormProps {
  incident?: Incident;
  onSuccess?: () => void;
}

export default function IncidentForm({ incident, onSuccess }: IncidentFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: fetchAssets,
  });

  // Create default values based on whether we're editing or creating
  const defaultValues: Partial<FormValues> = incident ? {
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    affectedAsset: incident.affectedAsset,
  } : {
    title: "",
    description: "",
    severity: "medium",
    status: "new",
    affectedAsset: null,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      toast({
        title: "Incident created",
        description: "The incident has been created successfully.",
      });
      form.reset();
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating incident",
        description: (error as Error).message,
        variant: "destructive",
      });
      console.error("Incident creation error:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateIncident,
    onSuccess: () => {
      toast({
        title: "Incident updated",
        description: "The incident has been updated successfully.",
      });
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating incident",
        description: (error as Error).message,
        variant: "destructive",
      });
      console.error("Incident update error:", error);
    },
  });

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
        title: incident ? "Updating incident..." : "Creating incident...",
        description: "Please wait while we process your request",
      });

      console.log("Form submission data:", data);

      // Prepare data for API - add tenantId and other required fields
      const apiData = {
        ...data,
        tenantId: user.tenantId,
        affectedAsset: data.affectedAsset || undefined // Convert null to undefined
      };

      console.log("Processed API data:", apiData);

      if (incident) {
        updateMutation.mutate({ id: incident.id, data: apiData });
      } else {
        createMutation.mutate(apiData);
      }
    } catch (error) {
      toast({
        title: incident ? "Error updating incident" : "Error creating incident",
        description: (error as Error).message,
        variant: "destructive",
      });
      console.error("Incident operation error:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
                <Input placeholder="Enter incident title" {...field} />
              </FormControl>
              <FormDescription>
                A clear and concise title for the incident
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
                  placeholder="Describe the incident in detail"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Detailed information about what happened and the impact
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Impact level of the incident
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {incident && (
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
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Current status of the incident
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="affectedAsset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Affected Asset</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assetsLoading ? (
                      <SelectItem value="loading" disabled>Loading assets...</SelectItem>
                    ) : assets?.length === 0 ? (
                      <SelectItem value="no_assets" disabled>No assets found</SelectItem>
                    ) : (
                      assets?.map((asset: Asset) => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.name} ({asset.type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The IT asset affected by this incident
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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
            {isPending ? "Saving..." : incident ? "Update Incident" : "Create Incident"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
