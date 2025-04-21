import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchIncidents, updateIncident } from "@/lib/api";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
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
import IncidentForm from "@/components/incidents/incident-form";
import { Incident } from "@shared/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Incidents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [severityFilters, setSeverityFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: incidents, isLoading, error } = useQuery({
    queryKey: ['/api/incidents'],
    queryFn: fetchIncidents
  });

  const updateMutation = useMutation({
    mutationFn: updateIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      toast({
        title: "Incident updated",
        description: "The incident has been updated successfully."
      });
      setSelectedIncident(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating incident",
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

  // Extract unique severity and status values for filter options
  const uniqueSeverities = useMemo(() => {
    if (!incidents) return [];
    const severities = new Set<string>();
    incidents.forEach(incident => {
      if (incident.severity) severities.add(incident.severity);
    });
    return Array.from(severities);
  }, [incidents]);

  const uniqueStatuses = useMemo(() => {
    if (!incidents) return [];
    const statuses = new Set<string>();
    incidents.forEach(incident => {
      if (incident.status) statuses.add(incident.status);
    });
    return Array.from(statuses);
  }, [incidents]);

  // Apply all filters
  const getFilteredIncidents = () => {
    let filtered = incidents || [];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(incident => 
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by severity
    if (severityFilters.length > 0) {
      filtered = filtered.filter(incident => 
        severityFilters.includes(incident.severity)
      );
    }
    
    // Filter by status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(incident => 
        statusFilters.includes(incident.status)
      );
    }
    
    return filtered;
  };

  const filteredIncidents = getFilteredIncidents();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{severity}</Badge>;
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
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>;
      case "closed":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Closed</Badge>;
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
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and respond to incidents across your IT environment
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Create New Incident</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new incident
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1">
              <IncidentForm onSuccess={() => {
                setShowCreateDialog(false);
                queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
              }} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedIncident && (
        <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent className="sm:max-w-[650px] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Edit Incident</DialogTitle>
              <DialogDescription>
                Update incident details
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1">
              <IncidentForm 
                incident={selectedIncident} 
                onSuccess={() => {
                  setSelectedIncident(null);
                  queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search incidents..."
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
                    {(severityFilters.length > 0 || statusFilters.length > 0) && (
                      <Badge variant="secondary" className="ml-1 px-1 text-xs">
                        {severityFilters.length + statusFilters.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Filter Incidents</h4>
                    
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Severity</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {uniqueSeverities.map(severity => (
                          <Button
                            key={severity}
                            variant={severityFilters.includes(severity) ? "default" : "outline"}
                            size="sm"
                            className="justify-start"
                            onClick={() => {
                              setSeverityFilters(prev => 
                                prev.includes(severity) 
                                  ? prev.filter(s => s !== severity) 
                                  : [...prev, severity]
                              );
                            }}
                          >
                            {severityFilters.includes(severity) && <CheckSquare className="mr-2 h-4 w-4" />}
                            {severity.charAt(0).toUpperCase() + severity.slice(1)}
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
                          setSeverityFilters([]);
                          setStatusFilters([]);
                        }}
                        disabled={severityFilters.length === 0 && statusFilters.length === 0}
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
              <p className="text-red-500">Error loading incidents: {(error as Error).message}</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No incidents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">#{incident.id}</TableCell>
                      <TableCell>{incident.title}</TableCell>
                      <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                      <TableCell>{formatDate(incident.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIncident(incident)}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          
                          {incident.status !== "resolved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(incident.id, "resolved")}
                            >
                              Resolve
                            </Button>
                          )}
                          
                          {incident.status !== "closed" && incident.status === "resolved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(incident.id, "closed")}
                            >
                              Close
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
