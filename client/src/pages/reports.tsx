import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  FileText, 
  Download, 
  ChevronDown,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchIncidents, fetchServiceRequests, fetchChangeRequests, fetchMonitoringAlerts, fetchAssets } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// Chart colors
const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#6B7280'];

export default function Reports() {
  const [timeframe, setTimeframe] = useState("7days");
  const [reportType, setReportType] = useState("incidents");
  const [chartView, setChartView] = useState("bar");
  const { toast } = useToast();

  // Fetch all the data we need for reports
  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['/api/incidents'],
    queryFn: fetchIncidents
  });

  const { data: serviceRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/service-requests'],
    queryFn: fetchServiceRequests
  });

  const { data: changeRequests, isLoading: changesLoading } = useQuery({
    queryKey: ['/api/change-requests'],
    queryFn: fetchChangeRequests
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/monitoring-alerts'],
    queryFn: fetchMonitoringAlerts
  });

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: fetchAssets
  });

  const isLoading = incidentsLoading || requestsLoading || changesLoading || alertsLoading || assetsLoading;

  // Event handlers
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    toast({
      title: "Timeframe changed",
      description: `Report data updated for ${getTimeframeLabel(value)}`
    });
  };

  const handleExport = () => {
    toast({
      title: "Exporting report",
      description: "Your report is being generated and will download shortly."
    });
  };

  // Helper functions
  const getTimeframeLabel = (value: string) => {
    switch (value) {
      case "7days": return "Last 7 days";
      case "30days": return "Last 30 days";
      case "90days": return "Last 90 days";
      case "custom": return "Custom range";
      default: return "Last 7 days";
    }
  };

  // Function to filter data by timeframe
  const filterByTimeframe = (data: any[] = []) => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case "7days":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30days":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90days":
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    return data.filter(item => new Date(item.createdAt) >= startDate);
  };

  // Prepare chart data based on report type
  const getChartData = () => {
    switch (reportType) {
      case "incidents": {
        const filteredIncidents = filterByTimeframe(incidents);
        
        // For bar/line chart - incidents by severity
        if (chartView === "bar" || chartView === "line") {
          const severityCounts = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
          };
          
          filteredIncidents?.forEach(incident => {
            if (severityCounts.hasOwnProperty(incident.severity)) {
              severityCounts[incident.severity as keyof typeof severityCounts]++;
            }
          });
          
          return [
            { name: "Low", value: severityCounts.low },
            { name: "Medium", value: severityCounts.medium },
            { name: "High", value: severityCounts.high },
            { name: "Critical", value: severityCounts.critical }
          ];
        }
        
        // For pie chart - incidents by status
        if (chartView === "pie") {
          const statusCounts: Record<string, number> = {};
          
          filteredIncidents?.forEach(incident => {
            const status = incident.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          
          return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        }
        
        return [];
      }

      case "service-requests": {
        const filteredRequests = filterByTimeframe(serviceRequests);
        
        // For bar/line chart - requests by priority
        if (chartView === "bar" || chartView === "line") {
          const priorityCounts = {
            low: 0,
            medium: 0,
            high: 0
          };
          
          filteredRequests?.forEach(request => {
            if (priorityCounts.hasOwnProperty(request.priority)) {
              priorityCounts[request.priority as keyof typeof priorityCounts]++;
            }
          });
          
          return [
            { name: "Low", value: priorityCounts.low },
            { name: "Medium", value: priorityCounts.medium },
            { name: "High", value: priorityCounts.high }
          ];
        }
        
        // For pie chart - requests by status
        if (chartView === "pie") {
          const statusCounts: Record<string, number> = {};
          
          filteredRequests?.forEach(request => {
            const status = request.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          
          return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        }
        
        return [];
      }

      case "changes": {
        const filteredChanges = filterByTimeframe(changeRequests);
        
        // For bar/line chart - changes by type
        if (chartView === "bar" || chartView === "line") {
          const typeCounts = {
            normal: 0,
            standard: 0,
            emergency: 0
          };
          
          filteredChanges?.forEach(change => {
            if (typeCounts.hasOwnProperty(change.changeType)) {
              typeCounts[change.changeType as keyof typeof typeCounts]++;
            }
          });
          
          return [
            { name: "Normal", value: typeCounts.normal },
            { name: "Standard", value: typeCounts.standard },
            { name: "Emergency", value: typeCounts.emergency }
          ];
        }
        
        // For pie chart - changes by status
        if (chartView === "pie") {
          const statusCounts: Record<string, number> = {};
          
          filteredChanges?.forEach(change => {
            const status = change.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          
          return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        }
        
        return [];
      }

      case "assets": {
        // For bar/line chart - assets by type
        if (chartView === "bar" || chartView === "line") {
          const typeCounts: Record<string, number> = {};
          
          assets?.forEach(asset => {
            const type = asset.type;
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });
          
          return Object.entries(typeCounts).map(([name, value]) => ({ 
            name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
            value 
          }));
        }
        
        // For pie chart - assets by status
        if (chartView === "pie") {
          const statusCounts: Record<string, number> = {};
          
          assets?.forEach(asset => {
            const status = asset.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          
          return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        }
        
        return [];
      }

      default:
        return [];
    }
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    const filteredIncidents = filterByTimeframe(incidents);
    const filteredRequests = filterByTimeframe(serviceRequests);
    const filteredChanges = filterByTimeframe(changeRequests);
    const filteredAlerts = filterByTimeframe(alerts);
    
    // Calculate SLA compliance
    const slaBreachedCount = filteredIncidents?.filter(i => i.slaBreached).length || 0;
    const totalIncidents = filteredIncidents?.length || 1;
    const slaCompliance = Math.round(((totalIncidents - slaBreachedCount) / totalIncidents) * 100);
    
    return {
      openIncidents: filteredIncidents?.filter(i => !["resolved", "closed"].includes(i.status)).length || 0,
      highPriorityIncidents: filteredIncidents?.filter(i => ["high", "critical"].includes(i.severity)).length || 0,
      openRequests: filteredRequests?.filter(r => !["completed", "cancelled", "rejected"].includes(r.status)).length || 0,
      pendingChanges: filteredChanges?.filter(c => ["draft", "submitted", "under_review"].includes(c.status)).length || 0,
      successfulChanges: filteredChanges?.filter(c => c.status === "completed").length || 0,
      failedChanges: filteredChanges?.filter(c => c.status === "failed").length || 0,
      criticalAlerts: filteredAlerts?.filter(a => a.severity === "critical").length || 0,
      slaCompliance
    };
  };

  const stats = getSummaryStats();
  const chartData = getChartData();

  // Render Chart based on chartView
  const renderChart = () => {
    if (isLoading) {
      return <Skeleton className="h-80 w-full" />;
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-80">
          <p className="text-gray-500">No data available for the selected criteria</p>
        </div>
      );
    }

    switch (chartView) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3B82F6" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" name="Count" />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze IT service management data and generate reports
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative inline-block">
            <Select
              value={timeframe}
              onValueChange={handleTimeframeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={handleExport} className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start">
              <div className="bg-red-100 rounded-full p-2 mr-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Open Incidents</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900 mr-2">{stats.openIncidents}</p>
                  <p className="text-sm text-gray-500">({stats.highPriorityIncidents} high priority)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-4">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Open Requests</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900 mr-2">{stats.openRequests}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start">
              <div className="bg-green-100 rounded-full p-2 mr-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">SLA Compliance</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900 mr-2">{stats.slaCompliance}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start">
              <div className="bg-yellow-100 rounded-full p-2 mr-4">
                <Activity className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Critical Alerts</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900 mr-2">{stats.criticalAlerts}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Report Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Report Visualization</CardTitle>
              <CardDescription>Visual analytics based on selected criteria</CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select
                value={reportType}
                onValueChange={setReportType}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incidents">Incidents</SelectItem>
                  <SelectItem value="service-requests">Service Requests</SelectItem>
                  <SelectItem value="changes">Changes</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex rounded-md overflow-hidden border">
                <Button
                  variant={chartView === "bar" ? "default" : "ghost"}
                  className="rounded-none px-3"
                  onClick={() => setChartView("bar")}
                >
                  <BarChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartView === "line" ? "default" : "ghost"}
                  className="rounded-none px-3"
                  onClick={() => setChartView("line")}
                >
                  <Activity className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartView === "pie" ? "default" : "ghost"}
                  className="rounded-none px-3"
                  onClick={() => setChartView("pie")}
                >
                  <PieChartIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Report Details Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Reports</CardTitle>
          <CardDescription>Detailed analysis and reports by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="incidents" value={reportType} onValueChange={setReportType}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-1">
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="service-requests">Requests</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="incidents">
              <div className="space-y-4 my-4">
                <h3 className="text-lg font-medium">Incident Report Summary</h3>
                <p className="text-sm text-gray-500">
                  This report provides an overview of incidents during the selected time period.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Severity</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Critical:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.severity === "critical").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>High:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.severity === "high").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Medium:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.severity === "medium").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Low:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.severity === "low").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Status</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>New:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.status === "new").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>In Progress:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.status === "in_progress").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Resolved:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.status === "resolved").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Closed:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.status === "closed").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">SLA Performance</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>SLA Breached:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => i.slaBreached).length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Within SLA:</span>
                          <span className="font-medium">
                            {filterByTimeframe(incidents)?.filter(i => !i.slaBreached).length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>SLA Compliance:</span>
                          <span className="font-medium">{stats.slaCompliance}%</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Full Report
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="service-requests">
              <div className="space-y-4 my-4">
                <h3 className="text-lg font-medium">Service Request Report Summary</h3>
                <p className="text-sm text-gray-500">
                  This report provides an overview of service requests during the selected time period.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Priority</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>High:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.priority === "high").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Medium:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.priority === "medium").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Low:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.priority === "low").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Status</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>New:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.status === "new").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>In Progress:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.status === "in_progress").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Completed:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.status === "completed").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Approval Analytics</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Pending Approval:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.status === "pending_approval").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Approved:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.status === "approved").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Rejected:</span>
                          <span className="font-medium">
                            {filterByTimeframe(serviceRequests)?.filter(r => r.status === "rejected").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Full Report
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="changes">
              <div className="space-y-4 my-4">
                <h3 className="text-lg font-medium">Change Management Report Summary</h3>
                <p className="text-sm text-gray-500">
                  This report provides an overview of change requests during the selected time period.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Type</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Normal:</span>
                          <span className="font-medium">
                            {filterByTimeframe(changeRequests)?.filter(c => c.changeType === "normal").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Standard:</span>
                          <span className="font-medium">
                            {filterByTimeframe(changeRequests)?.filter(c => c.changeType === "standard").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Emergency:</span>
                          <span className="font-medium">
                            {filterByTimeframe(changeRequests)?.filter(c => c.changeType === "emergency").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Status</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Pending:</span>
                          <span className="font-medium">{stats.pendingChanges}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Approved:</span>
                          <span className="font-medium">
                            {filterByTimeframe(changeRequests)?.filter(c => c.status === "approved").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Completed:</span>
                          <span className="font-medium">{stats.successfulChanges}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Failed:</span>
                          <span className="font-medium">{stats.failedChanges}</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Risk Analysis</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>High Risk:</span>
                          <span className="font-medium">
                            {filterByTimeframe(changeRequests)?.filter(c => c.risk === "high").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Medium Risk:</span>
                          <span className="font-medium">
                            {filterByTimeframe(changeRequests)?.filter(c => c.risk === "medium").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Low Risk:</span>
                          <span className="font-medium">
                            {filterByTimeframe(changeRequests)?.filter(c => c.risk === "low").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Full Report
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="assets">
              <div className="space-y-4 my-4">
                <h3 className="text-lg font-medium">Asset Management Report Summary</h3>
                <p className="text-sm text-gray-500">
                  This report provides an overview of IT assets in your inventory.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Type</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Servers:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.type === "server").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Desktops:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.type === "desktop").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Laptops:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.type === "laptop").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Network:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.type === "network").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Other:</span>
                          <span className="font-medium">
                            {assets?.filter(a => !["server", "desktop", "laptop", "network"].includes(a.type)).length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">By Status</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Active:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.status === "active").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Maintenance:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.status === "maintenance").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Inactive:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.status === "inactive").length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Retired:</span>
                          <span className="font-medium">
                            {assets?.filter(a => a.status === "retired").length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Related Issues</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Assets with Incidents:</span>
                          <span className="font-medium">
                            {incidents?.filter(i => i.affectedAsset !== null).length || 0}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Assets with Alerts:</span>
                          <span className="font-medium">
                            {alerts?.filter(a => a.relatedAssetId !== null).length || 0}
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Full Report
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Layout>
  );
}
