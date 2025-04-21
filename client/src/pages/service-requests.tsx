import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchServiceRequests, updateServiceRequest, fetchServiceCatalog } from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Filter, Search, FileText, ExternalLink, CheckSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import RequestForm from "@/components/service-requests/request-form";
import { ServiceRequest } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function ServiceRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['/api/service-requests'],
    queryFn: fetchServiceRequests
  });

  const { data: catalogItems } = useQuery({
    queryKey: ['/api/service-catalog'],
    queryFn: fetchServiceCatalog
  });

  const updateMutation = useMutation({
    mutationFn: updateServiceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({
        title: "Request updated",
        description: "The service request has been updated successfully."
      });
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating request",
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

  // Extract unique values for filters
  const uniqueTypes = useMemo(() => {
    if (!requests) return [];
    const types = new Set<string>();
    requests.forEach(request => {
      if (request.requestType) types.add(request.requestType);
    });
    return Array.from(types);
  }, [requests]);

  const uniquePriorities = useMemo(() => {
    if (!requests) return [];
    const priorities = new Set<string>();
    requests.forEach(request => {
      if (request.priority) priorities.add(request.priority);
    });
    return Array.from(priorities);
  }, [requests]);

  const uniqueStatuses = useMemo(() => {
    if (!requests) return [];
    const statuses = new Set<string>();
    requests.forEach(request => {
      if (request.status) statuses.add(request.status);
    });
    return Array.from(statuses);
  }, [requests]);

  const getFilteredRequests = () => {
    let filtered = requests || [];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter(request => {
        switch (activeTab) {
          case "pending":
            return ["new", "assigned", "in_progress", "pending_approval"].includes(request.status);
          case "approved":
            return request.status === "approved";
          case "completed":
            return request.status === "completed";
          default:
            return true;
        }
      });
    }
    
    // Filter by type
    if (typeFilters.length > 0) {
      filtered = filtered.filter(request => 
        typeFilters.includes(request.requestType)
      );
    }
    
    // Filter by priority
    if (priorityFilters.length > 0) {
      filtered = filtered.filter(request => 
        priorityFilters.includes(request.priority)
      );
    }
    
    // Filter by status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(request => 
        statusFilters.includes(request.status)
      );
    }
    
    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
      case "assigned":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Assigned</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In Progress</Badge>;
      case "pending_approval":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Pending Approval</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage service requests from your users
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Create Service Request</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new service request
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1">
              <RequestForm 
                catalogItems={catalogItems || []}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-[650px] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Edit Service Request</DialogTitle>
              <DialogDescription>
                Update service request details
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1">
              <RequestForm 
                request={selectedRequest}
                catalogItems={catalogItems || []} 
                onSuccess={() => {
                  setSelectedRequest(null);
                  queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search requests..."
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
                      {(typeFilters.length > 0 || priorityFilters.length > 0 || statusFilters.length > 0) && (
                        <Badge variant="secondary" className="ml-1 px-1 text-xs">
                          {typeFilters.length + priorityFilters.length + statusFilters.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Filter Service Requests</h4>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Type</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {uniqueTypes.map(type => (
                            <Button
                              key={type}
                              variant={typeFilters.includes(type) ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => {
                                setTypeFilters(prev => 
                                  prev.includes(type) 
                                    ? prev.filter(t => t !== type) 
                                    : [...prev, type]
                                );
                              }}
                            >
                              {typeFilters.includes(type) && <CheckSquare className="mr-2 h-4 w-4" />}
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Priority</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {uniquePriorities.map(priority => (
                            <Button
                              key={priority}
                              variant={priorityFilters.includes(priority) ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => {
                                setPriorityFilters(prev => 
                                  prev.includes(priority) 
                                    ? prev.filter(p => p !== priority) 
                                    : [...prev, priority]
                                );
                              }}
                            >
                              {priorityFilters.includes(priority) && <CheckSquare className="mr-2 h-4 w-4" />}
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
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
                              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setTypeFilters([]);
                            setPriorityFilters([]);
                            setStatusFilters([]);
                          }}
                          disabled={typeFilters.length === 0 && priorityFilters.length === 0 && statusFilters.length === 0}
                        >
                          Reset Filters
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => (document.querySelector('[data-radix-popper-content-id]') as HTMLElement)?.querySelector('button[data-radix-collection-item]')?.click()}
                        >
                          Apply Filters
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
              <TabsList className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
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
              <p className="text-red-500">Error loading service requests: {(error as Error).message}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No service requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">#{request.id}</TableCell>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>{request.requestType}</TableCell>
                      <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          
                          {request.status === "pending_approval" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(request.id, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(request.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {request.status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(request.id, "completed")}
                            >
                              Complete
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
