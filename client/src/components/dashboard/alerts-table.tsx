import { Alert } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AlertsTableProps {
  alerts: Alert[];
  onViewDetails: (alert: Alert) => void;
}

export default function AlertsTable({ alerts, onViewDetails }: AlertsTableProps) {
  const getSeverityIcon = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-danger-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      default:
        return <Info className="h-5 w-5 text-primary-500" />;
    }
  };

  const getSeverityBadge = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return (
          <Badge variant="outline" className="bg-danger-100 text-danger-800 border-danger-200">
            Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-warning-100 text-warning-800 border-warning-200">
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-primary-100 text-primary-800 border-primary-200">
            Info
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: Alert["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-warning-100 text-warning-800 border-warning-200">
            Investigating
          </Badge>
        );
      case "acknowledged":
        return (
          <Badge variant="outline" className="bg-primary-100 text-primary-800 border-primary-200">
            In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="bg-success-100 text-success-800 border-success-200">
            Resolved
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hours ago`;
    } else {
      return `${Math.floor(diffMins / 1440)} days ago`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-1/4">Alert</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
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
                  <Button 
                    variant="ghost" 
                    className="text-primary-600 hover:text-primary-900"
                    onClick={() => onViewDetails(alert)}
                  >
                    <span className="mr-1">View Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
