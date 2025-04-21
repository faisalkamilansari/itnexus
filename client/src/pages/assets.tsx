import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAssets, updateAsset } from "@/lib/api";
import { Link } from "wouter";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Filter, Search, FileText, ExternalLink, Computer, Server, Laptop, Network, CheckSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Asset } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: assets, isLoading, error } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: fetchAssets
  });

  const updateMutation = useMutation({
    mutationFn: updateAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: "Asset updated",
        description: "The asset has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating asset",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (id: number, newStatus: string) => {
    updateMutation.mutate({
      id,
      data: { status: newStatus }
    });
  };

  const getFilteredAssets = () => {
    let filtered = assets || [];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by tab/type
    if (activeTab !== "all") {
      filtered = filtered.filter(asset => asset.type === activeTab);
    }
    
    // Filter by multiple status selections
    if (statusFilters.length > 0) {
      filtered = filtered.filter(asset => statusFilters.includes(asset.status));
    }
    
    // Filter by multiple location selections
    if (locationFilters.length > 0) {
      filtered = filtered.filter(asset => 
        asset.location && locationFilters.includes(asset.location)
      );
    }
    
    return filtered;
  };

  const filteredAssets = getFilteredAssets();
  
  // Extract unique locations from assets list for filter options
  const getUniqueLocations = () => {
    if (!assets) return [];
    const locations = assets
      .map(asset => asset.location)
      .filter((location): location is string => !!location);
    return [...new Set(locations)].sort();
  };
  
  // Get unique statuses for filter options
  const getUniqueStatuses = () => {
    if (!assets) return [];
    const statuses = assets.map(asset => asset.status);
    return [...new Set(statuses)].sort();
  };
  
  const uniqueLocations = getUniqueLocations();
  const uniqueStatuses = getUniqueStatuses();

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case "server":
        return <Server className="h-5 w-5" />;
      case "desktop":
        return <Computer className="h-5 w-5" />;
      case "laptop":
        return <Laptop className="h-5 w-5" />;
      case "network":
        return <Network className="h-5 w-5" />;
      default:
        return <Computer className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      case "maintenance":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Maintenance</Badge>;
      case "retired":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Retired</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IT Assets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track IT assets across your organization
          </p>
        </div>
        
        <Link href="/assets/create">
          <Button className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </Link>
      </div>



      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search assets..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Filter className="h-3.5 w-3.5" />
                      <span>Filter</span>
                      {(statusFilters.length > 0 || locationFilters.length > 0) && (
                        <Badge variant="secondary" className="ml-1 px-1 text-xs">
                          {statusFilters.length + locationFilters.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Filter Assets</h4>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Status</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {uniqueStatuses.map(status => (
                            <Button
                              key={status}
                              variant={statusFilters.includes(status) ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => {
                                setStatusFilters(prev => 
                                  prev.includes(status) 
                                    ? prev.filter(s => s !== status) 
                                    : [...prev, status]
                                );
                              }}
                            >
                              {statusFilters.includes(status) && <CheckSquare className="mr-2 h-4 w-4" />}
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {uniqueLocations.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Location</h5>
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {uniqueLocations.map(location => (
                              <Button
                                key={location}
                                variant={locationFilters.includes(location) ? "default" : "outline"}
                                size="sm"
                                className="justify-start"
                                onClick={() => {
                                  setLocationFilters(prev => 
                                    prev.includes(location) 
                                      ? prev.filter(l => l !== location) 
                                      : [...prev, location]
                                  );
                                }}
                              >
                                {locationFilters.includes(location) && <CheckSquare className="mr-2 h-4 w-4" />}
                                {location}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setStatusFilters([]);
                            setLocationFilters([]);
                          }}
                          disabled={statusFilters.length === 0 && locationFilters.length === 0}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="server">Servers</TabsTrigger>
                <TabsTrigger value="desktop">Desktops</TabsTrigger>
                <TabsTrigger value="laptop">Laptops</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">Error loading assets: {(error as Error).message}</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No assets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getAssetTypeIcon(asset.type)}
                          <span className="ml-2 capitalize">{asset.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{asset.serialNumber || "N/A"}</TableCell>
                      <TableCell>{asset.location || "N/A"}</TableCell>
                      <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/assets/update/${asset.id}`}>
                            <Button 
                              variant="ghost"
                              size="sm"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </Link>
                          
                          {asset.status !== "maintenance" && asset.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(asset.id, "maintenance")}
                            >
                              Set Maintenance
                            </Button>
                          )}
                          
                          {asset.status !== "retired" && asset.status !== "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(asset.id, "active")}
                            >
                              Set Active
                            </Button>
                          )}
                          
                          {asset.status !== "retired" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(asset.id, "retired")}
                            >
                              Retire
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
