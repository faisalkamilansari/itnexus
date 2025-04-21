import { useQuery } from "@tanstack/react-query";
import { fetchDashboardData } from "@/lib/api";
import Layout from "@/components/layout/layout";
import MetricCard from "@/components/dashboard/metric-card";
import AlertsTable from "@/components/dashboard/alerts-table";
import TicketsList from "@/components/dashboard/tickets-list";
import TimelineView from "@/components/dashboard/timeline-view";
import SystemHealth from "@/components/dashboard/system-health";
import { 
  AlertTriangle, 
  HeadphonesIcon, 
  Timer, 
  Activity,
  ArrowDown,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard'],
    queryFn: fetchDashboardData
  });

  if (error) {
    toast({
      title: "Error loading dashboard",
      description: (error as Error).message,
      variant: "destructive",
    });
  }

  const handleViewAllAlerts = () => {
    navigate("/monitoring");
  };

  const handleViewAllTickets = () => {
    navigate("/incidents");
  };

  const handleExport = () => {
    toast({
      title: "Export started",
      description: "Your dashboard data is being exported."
    });
  };

  // Format recent incidents as tickets for the TicketsList component
  const recentTickets = data?.recentIncidents?.map((incident: {
    id: number;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
  }) => ({
    id: incident.id,
    ticketNumber: `#INC-${incident.id}`,
    title: incident.title,
    priority: incident.severity,
    status: incident.status,
    createdAt: incident.createdAt,
    assigneeName: "Agent",
  })) || [];

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your IT service management metrics</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative inline-block">
            <select className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Custom range</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>
          
          <Button onClick={handleExport} className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-10 w-1/4 mb-4" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Open Incidents"
              value={data?.metrics?.openIncidents || 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              trend={{
                value: 12,
                label: "vs last week",
                isPositive: false
              }}
              accentColor="primary"
            />
            
            <MetricCard
              title="Service Requests"
              value={data?.metrics?.openServiceRequests || 0}
              icon={<HeadphonesIcon className="h-5 w-5" />}
              trend={{
                value: 3,
                label: "vs last week",
                isPositive: true
              }}
              accentColor="warning"
            />
            
            <MetricCard
              title="SLA Compliance"
              value={`${data?.metrics?.slaCompliance || 92}%`}
              icon={<Timer className="h-5 w-5" />}
              trend={{
                value: 5,
                label: "vs last week",
                isPositive: true
              }}
              accentColor="success"
            />
            
            <MetricCard
              title="System Health"
              value={`${data?.metrics?.systemHealth || 98}%`}
              icon={<Activity className="h-5 w-5" />}
              trend={{
                value: 1,
                label: "vs last week",
                isPositive: true
              }}
              accentColor="gray"
            />
          </>
        )}
      </div>
      
      {/* Alerts and Issues */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Alerts & Issues</h2>
          <Button
            variant="link"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 p-0"
            onClick={handleViewAllAlerts}
          >
            View all
          </Button>
        </div>
        
        {isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-64 w-full" />
          </Card>
        ) : (
          <AlertsTable 
            alerts={data?.recentAlerts || []} 
            onViewDetails={() => navigate("/monitoring")} 
          />
        )}
      </div>
      
      {/* Timeline View */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Activity Timeline</h2>
        </div>
        
        {isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-96 w-full" />
          </Card>
        ) : (
          <TimelineView 
            tickets={recentTickets} 
            serviceRequests={data?.recentServiceRequests?.map((request: {
              id: number;
              title: string;
              priority?: string;
              status: string;
              createdAt: string;
              assignedTo?: number;
            }) => ({
              id: request.id,
              ticketNumber: `#SRQ-${request.id}`,
              title: request.title,
              priority: request.priority || 'medium',
              status: request.status,
              createdAt: request.createdAt,
              assigneeName: request.assignedTo ? "Support Agent" : "Unassigned",
            })) || []}
            changeRequests={data?.recentChangeRequests?.map((change: {
              id: number;
              title: string;
              priority?: string;
              status: string;
              createdAt: string;
              assignedTo?: number;
            }) => ({
              id: change.id,
              ticketNumber: `#CHG-${change.id}`,
              title: change.title,
              priority: change.priority || 'medium',
              status: change.status,
              createdAt: change.createdAt,
              assigneeName: change.assignedTo ? "Change Manager" : "Unassigned",
            })) || []}
            onViewAll={handleViewAllTickets}
          />
        )}
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets Summary */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Tickets</h2>
            <Button
              variant="link"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 p-0"
              onClick={handleViewAllTickets}
            >
              View all
            </Button>
          </div>
          
          {isLoading ? (
            <Card className="p-5">
              <Skeleton className="h-64 w-full" />
            </Card>
          ) : (
            <TicketsList 
              tickets={recentTickets} 
              onViewAll={handleViewAllTickets} 
            />
          )}
        </div>
        
        {/* System Health */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">System Health</h2>
            <Button
              variant="link"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 p-0"
              onClick={() => navigate("/monitoring")}
            >
              Refresh
            </Button>
          </div>
          
          {isLoading ? (
            <Card className="p-5">
              <Skeleton className="h-64 w-full" />
            </Card>
          ) : (
            <SystemHealth 
              metrics={data?.systemHealth || {
                cpu: 0,
                memory: 0,
                disk: 0,
                network: 0,
                services: []
              }} 
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
