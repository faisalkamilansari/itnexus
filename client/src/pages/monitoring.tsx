import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  fetchMonitoringAlerts, 
  acknowledgeAlert, 
  resolveAlert, 
  fetchPrometheusMetrics,
  fetchPrometheusInstances 
} from "@/lib/api";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Search, RefreshCcw, Info, AlertTriangle, AlertCircle, Activity, Settings, Server, X, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, SystemMetrics } from "@/types";
import SystemHealth from "@/components/dashboard/system-health";
import PrometheusMetrics from "@/components/monitoring/prometheus-metrics";
import MonitoringConfig from "@/components/monitoring/monitoring-config";
import MonitoringSetupWizard from "@/components/monitoring/monitoring-setup-wizard";
import CommunicationConfig from "@/components/monitoring/communication-config";

export default function Monitoring() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showCommunicationConfig, setShowCommunicationConfig] = useState(false);
  const { toast } = useToast();
  
  // Listen for events from the setup wizard and config dialogs
  useEffect(() => {
    const handleSetupComplete = (event: CustomEvent) => {
      setShowSetupWizard(false);
      toast({
        title: "Setup Successful", 
        description: "Prometheus monitoring has been configured successfully!"
      });
      // Refresh metrics data after setup
      queryClient.invalidateQueries({ queryKey: ['/api/prometheus-metrics'] });
    };
    
    const handleConfigSaved = (event: CustomEvent) => {
      setShowConfig(false);
      // Refresh metrics data after config changes
      queryClient.invalidateQueries({ queryKey: ['/api/prometheus-metrics'] });
    };
    
    window.addEventListener('prometheusConfigured', handleSetupComplete as EventListener);
    window.addEventListener('monitoringConfigSaved', handleConfigSaved as EventListener);
    
    return () => {
      window.removeEventListener('prometheusConfigured', handleSetupComplete as EventListener);
      window.removeEventListener('monitoringConfigSaved', handleConfigSaved as EventListener);
    };
  }, [toast]);

  const { data: alerts, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/monitoring-alerts'],
    queryFn: fetchMonitoringAlerts
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-alerts'] });
      toast({
        title: "Alert acknowledged",
        description: "The alert has been acknowledged successfully."
      });
      setSelectedAlert(null);
    },
    onError: (error) => {
      toast({
        title: "Error acknowledging alert",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring-alerts'] });
      toast({
        title: "Alert resolved",
        description: "The alert has been resolved successfully."
      });
      setSelectedAlert(null);
    },
    onError: (error) => {
      toast({
        title: "Error resolving alert",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleAcknowledge = (id: number) => {
    acknowledgeMutation.mutate(id);
  };

  const handleResolve = (id: number) => {
    resolveMutation.mutate(id);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing alerts",
      description: "Fetching latest monitoring alerts."
    });
  };

  const getFilteredAlerts = () => {
    let filtered = alerts || [];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((alert: Alert) => 
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter((alert: Alert) => alert.status === activeTab);
    }
    
    return filtered;
  };

  const filteredAlerts = getFilteredAlerts();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      case "info":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Info</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Active</Badge>;
      case "acknowledged":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Acknowledged</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Prometheus metrics query
  const { data: prometheusData, isLoading: isLoadingMetrics, error: metricsError } = useQuery({
    queryKey: ['/api/prometheus-metrics'],
    queryFn: fetchPrometheusMetrics,
    refetchInterval: 60000, // Refresh every minute
    retry: 3
  });
  
  // Query for Prometheus instances configuration
  const { data: prometheusInstances, isLoading: isLoadingInstances } = useQuery({
    queryKey: ['/api/monitoring/instances'],
    queryFn: fetchPrometheusInstances,
    refetchInterval: 60000 // Refresh every minute
  });

  // System health data - replace with real data from Prometheus when available
  const systemHealth: SystemMetrics = {
    cpu: 65,
    memory: 42,
    disk: 78,
    network: 35,
    services: [
      { name: "Web Servers", status: "operational" as "operational" | "degraded" | "outage" },
      { name: "Database Cluster", status: "operational" as "operational" | "degraded" | "outage" },
      { name: "Email Services", status: "degraded" as "operational" | "degraded" | "outage" },
      { name: "API Gateway", status: "operational" as "operational" | "degraded" | "outage" },
    ]
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring & Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor system health and respond to alerts
          </p>
        </div>
        
        <Button onClick={handleRefresh} className="flex items-center">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      {/* Monitoring Setup Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
        <Button variant="outline" onClick={() => {
          setShowSetupWizard(true);
          // Set a custom event to show directly the Node Exporter section
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openNodeExporterSetup'));
          }, 100);
        }}>
          <Activity className="h-4 w-4 mr-2" />
          Node Exporter Setup
        </Button>
        <Button variant="outline" onClick={() => setShowSetupWizard(true)}>
          <Server className="h-4 w-4 mr-2" />
          Prometheus Setup
        </Button>
        <Button variant="outline" onClick={() => setShowConfig(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
        <Button variant="outline" onClick={() => setShowCommunicationConfig(true)}>
          <Bell className="h-4 w-4 mr-2" />
          Notification Channels
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health Overview</CardTitle>
              <CardDescription>Current health metrics for key systems</CardDescription>
            </CardHeader>
            <CardContent>
              <SystemHealth metrics={systemHealth} />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Alert Summary</CardTitle>
              <CardDescription>Alert counts by severity and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">By Severity</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-red-50 p-3 rounded-md text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {filteredAlerts.filter((a: Alert) => a.severity === "critical").length}
                      </div>
                      <div className="text-xs text-red-600">Critical</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-md text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {filteredAlerts.filter((a: Alert) => a.severity === "warning").length}
                      </div>
                      <div className="text-xs text-yellow-600">Warning</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-md text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredAlerts.filter((a: Alert) => a.severity === "info").length}
                      </div>
                      <div className="text-xs text-blue-600">Info</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">By Status</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-red-50 p-3 rounded-md text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {filteredAlerts.filter((a: Alert) => a.status === "active").length}
                      </div>
                      <div className="text-xs text-red-600">Active</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-md text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {filteredAlerts.filter((a: Alert) => a.status === "acknowledged").length}
                      </div>
                      <div className="text-xs text-yellow-600">Acknowledged</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-md text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {filteredAlerts.filter((a: Alert) => a.status === "resolved").length}
                      </div>
                      <div className="text-xs text-green-600">Resolved</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert details dialog */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {getSeverityIcon(selectedAlert.severity)}
                <span className="ml-2">{selectedAlert.title}</span>
              </DialogTitle>
              <DialogDescription>
                Alert details and actions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Severity</h3>
                  <div className="mt-1">{getSeverityBadge(selectedAlert.severity)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">{getStatusBadge(selectedAlert.status)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Source</h3>
                  <div className="mt-1 text-sm">{selectedAlert.source}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <div className="mt-1 text-sm">{formatDate(selectedAlert.createdAt)}</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-sm">{selectedAlert.description}</p>
              </div>
              
              {selectedAlert.assetName && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Affected Asset</h3>
                  <p className="mt-1 text-sm">{selectedAlert.assetName}</p>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </Button>
              <div className="flex space-x-2 mt-3 sm:mt-0">
                {selectedAlert.status === "active" && (
                  <Button
                    variant="outline"
                    onClick={() => selectedAlert.id && handleAcknowledge(selectedAlert.id)}
                    disabled={acknowledgeMutation.isPending}
                  >
                    {acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge"}
                  </Button>
                )}
                {(selectedAlert.status === "active" || selectedAlert.status === "acknowledged") && (
                  <Button
                    onClick={() => selectedAlert.id && handleResolve(selectedAlert.id)}
                    disabled={resolveMutation.isPending}
                  >
                    {resolveMutation.isPending ? "Resolving..." : "Resolve"}
                  </Button>
                )}
              </div>
            </DialogFooter>
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
                  placeholder="Search alerts..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter</span>
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
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
              <p className="text-red-500">Error loading alerts: {(error as Error).message}</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No alerts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert: Alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-danger-100 text-danger-500">
                            {getSeverityIcon(alert.severity)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                            <div className="text-sm text-gray-500">{alert.assetName || "Unknown asset"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{alert.source}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(alert.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            View Details
                          </Button>
                          
                          {alert.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              Acknowledge
                            </Button>
                          )}
                          
                          {(alert.status === "active" || alert.status === "acknowledged") && (
                            <Button
                              size="sm"
                              onClick={() => handleResolve(alert.id)}
                              disabled={resolveMutation.isPending}
                            >
                              Resolve
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

      {/* Monitoring Instances */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Server className="mr-2 h-5 w-5 text-primary" />
                Monitoring Instances
              </CardTitle>
              <CardDescription>
                Configured monitoring systems (Prometheus and Node Exporter)
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/monitoring/instances'] });
                toast({
                  title: "Refreshing instances",
                  description: "Fetching latest monitoring instance configurations."
                });
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh Instances
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInstances ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !prometheusInstances || prometheusInstances.length === 0 ? (
            <div className="text-center py-6 border rounded-lg border-dashed">
              <Server className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-600 mb-1">No Monitoring Instances</h3>
              <p className="text-sm text-gray-500 mb-4">Use the setup wizard to configure monitoring</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setShowSetupWizard(true)}>
                  <Server className="mr-2 h-4 w-4" />
                  Setup Prometheus
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowSetupWizard(true);
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('openNodeExporterSetup'));
                  }, 100);
                }}>
                  <Activity className="mr-2 h-4 w-4" />
                  Setup Node Exporter
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {/* Node Exporter Instances */}
              {prometheusInstances.some((instance: any) => instance.isNodeExporter) && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-primary mb-3 flex items-center">
                    <Activity className="mr-2 h-5 w-5" />
                    Node Exporter Instances
                  </h3>
                  <div className="space-y-4">
                    {prometheusInstances
                      .filter((instance: any) => instance.isNodeExporter)
                      .map((instance: any) => (
                        <div key={instance.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="text-lg font-medium">{instance.instance_name}</h3>
                              <p className="text-sm text-gray-500">{instance.organization_name} - {instance.environment}</p>
                            </div>
                            <Badge className={instance.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                              {instance.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Node Exporter URLs</h4>
                              {instance.additionalConfig && instance.additionalConfig.nodeExporterUrls && instance.additionalConfig.nodeExporterUrls.length > 0 ? (
                                <div className="text-sm truncate">
                                  {instance.additionalConfig.nodeExporterUrls.map((url: string, idx: number) => (
                                    <p key={idx} className="text-sm truncate">{url}</p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm truncate">{instance.prometheus_url.replace('nodeexporter://', '')}</p>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Port</h4>
                              <p className="text-sm">
                                {instance.additionalConfig?.nodeExporterPort || 9100}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Created</h4>
                              <p className="text-sm">{new Date(instance.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Prometheus Instances */}
              {prometheusInstances.some((instance: any) => !instance.isNodeExporter) && (
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3 flex items-center">
                    <Server className="mr-2 h-5 w-5" />
                    Prometheus Instances
                  </h3>
                  <div className="space-y-4">
                    {prometheusInstances
                      .filter((instance: any) => !instance.isNodeExporter)
                      .map((instance: any) => (
                        <div key={instance.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="text-lg font-medium">{instance.instance_name}</h3>
                              <p className="text-sm text-gray-500">{instance.organization_name} - {instance.environment}</p>
                            </div>
                            <Badge className={instance.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                              {instance.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">URL</h4>
                              <p className="text-sm truncate">{instance.prometheus_url}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Scraping Interval</h4>
                              <p className="text-sm">{instance.scraping_interval}s</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Created</h4>
                              <p className="text-sm">{new Date(instance.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Prometheus Metrics */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-primary" />
                Prometheus Metrics
              </CardTitle>
              <CardDescription>
                Detailed system and application metrics powered by Prometheus
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/prometheus-metrics'] })}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh Metrics
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PrometheusMetrics 
            metrics={prometheusData?.metrics || []} 
            isLoading={isLoadingMetrics} 
            error={metricsError as Error} 
          />
        </CardContent>
      </Card>
      
      {/* Monitoring Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-[650px] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary" />
              Monitoring Configuration
            </DialogTitle>
            <DialogDescription>
              Configure monitoring settings, thresholds, and alerts
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-1">
            <MonitoringConfig />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Monitoring Setup Wizard Dialog */}
      <Dialog open={showSetupWizard} onOpenChange={setShowSetupWizard}>
        <DialogContent className="sm:max-w-[650px] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5 text-primary" />
              Monitoring Setup Wizard
            </DialogTitle>
            <DialogDescription>
              Set up and configure your monitoring environment
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-1">
            <MonitoringSetupWizard />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Communication Configuration Dialog */}
      <Dialog open={showCommunicationConfig} onOpenChange={setShowCommunicationConfig}>
        <DialogContent className="sm:max-w-[700px] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-primary" />
              Alert Notification Channels
            </DialogTitle>
            <DialogDescription>
              Configure communication channels for sending automated alert notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-1" style={{ maxHeight: 'calc(85vh - 200px)' }}>
            <CommunicationConfig />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
