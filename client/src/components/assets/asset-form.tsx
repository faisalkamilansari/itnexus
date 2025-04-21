import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createAsset, updateAsset, fetchAssets } from "@/lib/api";
import { insertAssetSchema } from "@shared/schema";
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
import { Asset } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// For the form, we need a different schema than the API one
// Create a form-specific schema
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.enum(["server", "desktop", "laptop", "network", "software", "other"]),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).default("active"),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(), // Keep as string in the form
  location: z.string().optional(),
  assignedTo: z.number().optional().nullable(),
  metadata: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AssetFormProps {
  asset?: Asset;
  onSuccess?: () => void;
}

export default function AssetForm({ asset, onSuccess }: AssetFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Format the date for datetime-local input
  const formatDateForInput = (dateValue: string | Date | null | undefined) => {
    if (!dateValue) return "";
    
    try {
      let date: Date;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else {
        return "";
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date encountered:", dateValue);
        return "";
      }
      
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Create default values based on whether we're editing or creating
  const defaultValues: Partial<FormValues> = asset ? {
    name: asset.name,
    type: asset.type,
    status: asset.status,
    serialNumber: asset.serialNumber || "",
    purchaseDate: formatDateForInput(asset.purchaseDate),
    location: asset.location || "",
    assignedTo: asset.assignedTo,
    metadata: asset.metadata || {},
  } : {
    name: "",
    type: "desktop",
    status: "active",
    serialNumber: "",
    purchaseDate: "",
    location: "",
    metadata: {},
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
      form.reset();
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating asset",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAsset,
    onSuccess: () => {
      toast({
        title: "Asset updated",
        description: "The asset has been updated successfully.",
      });
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating asset",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormValues) => {
    // Debug form submission
    console.log("Form submitted with values:", data);
    console.log("Form validation state:", form.formState);
    
    // Check for form validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      console.error("Form has validation errors:", form.formState.errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    if (!user || !user.tenantId) {
      console.error("No user or tenantId available");
      toast({
        title: "Authentication error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Show the user what's happening
      toast({
        title: asset ? "Updating asset..." : "Creating asset...",
        description: "Please wait while we process your request",
      });

      // Convert date string to Date object for API
      let purchaseDate = null;
      if (data.purchaseDate && data.purchaseDate.trim() !== '') {
        try {
          purchaseDate = new Date(data.purchaseDate);
          if (isNaN(purchaseDate.getTime())) {
            console.warn("Invalid date:", data.purchaseDate);
            purchaseDate = null;
          }
        } catch (e) {
          console.error("Date conversion error:", e);
          purchaseDate = null;
        }
      }
      
      // Extract only the fields we need from the form data
      // and convert to the format expected by the API
      const processedData = {
        name: data.name,
        type: data.type,
        status: data.status,
        serialNumber: data.serialNumber || undefined,
        location: data.location || undefined,
        assignedTo: data.assignedTo || undefined,
        metadata: data.metadata || undefined,
        tenantId: user.tenantId,
        purchaseDate // This is now a proper Date object or null
      };
      
      console.log("Processing form submission with data:", {
        ...processedData,
        purchaseDate: purchaseDate ? purchaseDate.toISOString() : null
      });
      
      if (asset) {
        console.log("Updating existing asset with ID:", asset.id);
        // Use the built-in mutation
        updateMutation.mutate({ 
          id: asset.id, 
          data: processedData 
        });
      } else {
        console.log("Creating new asset");
        // Use the built-in mutation rather than custom fetch
        createMutation.mutate(processedData);
      }
    } catch (error) {
      // This catch will handle errors that occur before the mutation
      toast({
        title: asset ? "Error updating asset" : "Error creating asset",
        description: (error as Error).message,
        variant: "destructive",
      });
      console.error("Asset operation error:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter asset name" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for the asset
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="network">Network Device</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The type of IT asset
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Current operational status
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter serial number" 
                    value={field.value || ""} 
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>
                  Asset serial or identification number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    value={field.value || ""} 
                    onChange={(e) => {
                      // Validate date format (YYYY-MM-DD)
                      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                      if (e.target.value === "" || datePattern.test(e.target.value)) {
                        field.onChange(e);
                      }
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    max="2100-12-31" // Set reasonable date boundaries
                    min="1970-01-01"
                  />
                </FormControl>
                <FormDescription>
                  When the asset was purchased
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Where is this asset located?" 
                  value={field.value || ""} 
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Physical location of the asset
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess?.()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : asset ? "Update Asset" : "Create Asset"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
