import { SystemMetrics } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SystemHealthProps {
  metrics: SystemMetrics;
}

export default function SystemHealth({ metrics }: SystemHealthProps) {
  const getProgressColor = (value: number) => {
    if (value < 40) return "bg-success-500";
    if (value < 70) return "bg-warning-500";
    return "bg-danger-500";
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-success-500";
      case "degraded":
        return "bg-warning-500";
      case "outage":
        return "bg-danger-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-success-100 text-success-800";
      case "degraded":
        return "bg-warning-100 text-warning-800";
      case "outage":
        return "bg-danger-100 text-danger-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusLabels: Record<string, string> = {
    "operational": "Operational",
    "degraded": "Degraded",
    "outage": "Outage"
  };

  return (
    <Card className="bg-white rounded-lg shadow p-5 space-y-5">
      {/* CPU Usage */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">CPU Usage</span>
          <span className="text-sm font-medium text-gray-700">{metrics.cpu}%</span>
        </div>
        <Progress 
          value={metrics.cpu} 
          className="h-2.5 bg-gray-200" 
          indicatorClassName={getProgressColor(metrics.cpu)} 
        />
      </div>
      
      {/* Memory Usage */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Memory Usage</span>
          <span className="text-sm font-medium text-gray-700">{metrics.memory}%</span>
        </div>
        <Progress 
          value={metrics.memory} 
          className="h-2.5 bg-gray-200" 
          indicatorClassName={getProgressColor(metrics.memory)} 
        />
      </div>
      
      {/* Disk Storage */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Disk Storage</span>
          <span className="text-sm font-medium text-gray-700">{metrics.disk}%</span>
        </div>
        <Progress 
          value={metrics.disk} 
          className="h-2.5 bg-gray-200" 
          indicatorClassName={getProgressColor(metrics.disk)} 
        />
      </div>
      
      {/* Network Bandwidth */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Network Bandwidth</span>
          <span className="text-sm font-medium text-gray-700">{metrics.network}%</span>
        </div>
        <Progress 
          value={metrics.network} 
          className="h-2.5 bg-gray-200" 
          indicatorClassName={getProgressColor(metrics.network)} 
        />
      </div>
      
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Service Status</h3>
        
        <div className="space-y-3">
          {metrics.services?.map((service, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center">
                <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${getStatusDot(service.status)} mr-2`}></div>
                <span className="text-sm text-gray-700">{service.name}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(service.status)}`}>
                {statusLabels[service.status] || service.status}
              </span>
            </div>
          ))}
          
          {(!metrics.services || metrics.services.length === 0) && (
            <div className="text-sm text-gray-500 italic">No service status information available</div>
          )}
        </div>
      </div>
    </Card>
  );
}
