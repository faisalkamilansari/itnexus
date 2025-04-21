import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchChangeRequests, updateChangeRequest } from "@/lib/api";
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
import { Plus, Filter, Search, FileText, ExternalLink, Calendar, CheckSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import ChangeForm from "@/components/changes/change-form";
import { ChangeRequest } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Changes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [riskFilters, setRiskFilters] = useState<string[]>([]);
  const [impactFilters, setImpactFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: changes, isLoading, error } = useQuery({
    queryKey: ['/api/change-requests'],
    queryFn: fetchChangeRequests
  });

  const updateMutation = useMutation({
    mutationFn: updateChangeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-requests'] });
      toast({
        title: "Change request updated",
        description: "The change request has been updated successfully."
      });
      setSelectedChange(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating change request",
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
    if (!changes) return [];
    const types = new Set<string>();
    changes.forEach(change => {
      if (change.changeType) types.add(change.changeType);
    });
    return Array.from(types);
  }, [changes]);

  const uniqueRisks = useMemo(() => {
    if (!changes) return [];
    const risks = new Set<string>();
    changes.forEach(change => {
      if (change.risk) risks.add(change.risk);
    });
    return Array.from(risks);
  }, [changes]);

  const uniqueImpacts = useMemo(() => {
    if (!changes) return [];
    const impacts = new Set<string>();
    changes.forEach(change => {
      if (change.impact) impacts.add(change.impact);
    });
    return Array.from(impacts);
  }, [changes]);

  const uniqueStatuses = useMemo(() => {
    if (!changes) return [];
    const statuses = new Set<string>();
    changes.forEach(change => {
      if (change.status) statuses.add(change.status);
    });
    return Array.from(statuses);
  }, [changes]);

  const getFilteredChanges = () => {
    let filtered = changes || [];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(change => 
        change.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter(change => {
        switch (activeTab) {
          case "draft":
            return change.status === "draft";
          case "submitted":
            return ["submitted", "under_review"].includes(change.status);
          case "approved":
            return ["approved", "scheduled", "implementing"].includes(change.status);
          case "completed":
            return ["completed", "failed", "cancelled"].includes(change.status);
          default:
            return true;
        }
      });
    }
    
    // Filter by type
    if (typeFilters.length > 0) {
      filtered = filtered.filter(change => 
        typeFilters.includes(change.changeType)
      );
    }
    
    // Filter by risk
    if (riskFilters.length > 0) {
      filtered = filtered.filter(change => 
        riskFilters.includes(change.risk)
      );
    }
    
    // Filter by impact
    if (impactFilters.length > 0) {
      filtered = filtered.filter(change => 
        impactFilters.includes(change.impact)
      );
    }
    
    // Filter by status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(change => 
        statusFilters.includes(change.status)
      );
    }
    
    return filtered;
  };

  const filteredChanges = getFilteredChanges();

  const getRiskImpactBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 border-red-200">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{level}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>;
      case "under_review":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Under Review</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case "implementing":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Implementing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "normal":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Normal</Badge>;
      case "standard":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Standard</Badge>;
      case "emergency":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Emergency</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plan and track changes to your IT environment
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Change
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Create Change Request</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new change request
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1">
              <ChangeForm 
                onSuccess={() => {
                  setShowCreateDialog(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/change-requests'] });
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedChange && (
        <Dialog open={!!selectedChange} onOpenChange={() => setSelectedChange(null)}>
          <DialogContent className="sm:max-w-[650px] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Edit Change Request</DialogTitle>
              <DialogDescription>
                Update change request details
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1">
              <ChangeForm 
                change={selectedChange} 
                onSuccess={() => {
                  setSelectedChange(null);
                  queryClient.invalidateQueries({ queryKey: ['/api/change-requests'] });
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
                  placeholder="Search change requests..."
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
                      {(typeFilters.length > 0 || riskFilters.length > 0 || impactFilters.length > 0 || statusFilters.length > 0) && (
                        <Badge variant="secondary" className="ml-1 px-1 text-xs">
                          {typeFilters.length + riskFilters.length + impactFilters.length + statusFilters.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Filter Change Requests</h4>
                      
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
                        <h5 className="text-sm font-medium">Risk</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {uniqueRisks.map(risk => (
                            <Button
                              key={risk}
                              variant={riskFilters.includes(risk) ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => {
                                setRiskFilters(prev => 
                                  prev.includes(risk) 
                                    ? prev.filter(r => r !== risk) 
                                    : [...prev, risk]
                                );
                              }}
                            >
                              {riskFilters.includes(risk) && <CheckSquare className="mr-2 h-4 w-4" />}
                              {risk.charAt(0).toUpperCase() + risk.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Impact</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {uniqueImpacts.map(impact => (
                            <Button
                              key={impact}
                              variant={impactFilters.includes(impact) ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => {
                                setImpactFilters(prev => 
                                  prev.includes(impact) 
                                    ? prev.filter(i => i !== impact) 
                                    : [...prev, impact]
                                );
                              }}
                            >
                              {impactFilters.includes(impact) && <CheckSquare className="mr-2 h-4 w-4" />}
                              {impact.charAt(0).toUpperCase() + impact.slice(1)}
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
                            setRiskFilters([]);
                            setImpactFilters([]);
                            setStatusFilters([]);
                          }}
                          disabled={typeFilters.length === 0 && riskFilters.length === 0 && impactFilters.length === 0 && statusFilters.length === 0}
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
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Calendar</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="submitted">Submitted</TabsTrigger>
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
              <p className="text-red-500">Error loading change requests: {(error as Error).message}</p>
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No change requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Risk/Impact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChanges.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell className="font-medium">#{change.id}</TableCell>
                      <TableCell>{change.title}</TableCell>
                      <TableCell>{getChangeTypeBadge(change.changeType)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Risk:</span>
                            {getRiskImpactBadge(change.risk)}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Impact:</span>
                            {getRiskImpactBadge(change.impact)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(change.status)}</TableCell>
                      <TableCell>{formatDate(change.scheduledStartTime)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedChange(change)}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          
                          {change.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(change.id, "submitted")}
                            >
                              Submit
                            </Button>
                          )}
                          
                          {change.status === "under_review" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(change.id, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(change.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {change.status === "implementing" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(change.id, "completed")}
                              >
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(change.id, "failed")}
                              >
                                Failed
                              </Button>
                            </>
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
