import { Ticket } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TicketsListProps {
  tickets: Ticket[];
  onViewAll: () => void;
}

export default function TicketsList({ tickets, onViewAll }: TicketsListProps) {
  const getPriorityBadge = (priority: Ticket["priority"]) => {
    switch (priority) {
      case "critical":
        return (
          <Badge variant="outline" className="bg-danger-100 text-danger-800 border-danger-200">
            Critical
          </Badge>
        );
      case "high":
        return (
          <Badge variant="outline" className="bg-danger-100 text-danger-800 border-danger-200">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-warning-100 text-warning-800 border-warning-200">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="bg-primary-100 text-primary-800 border-primary-200">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
      case "open":
        return (
          <Badge variant="outline" className="bg-danger-100 text-danger-800 border-danger-200">
            Open
          </Badge>
        );
      case "in progress":
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-warning-100 text-warning-800 border-warning-200">
            In Progress
          </Badge>
        );
      case "pending":
      case "pending_approval":
        return (
          <Badge variant="outline" className="bg-primary-100 text-primary-800 border-primary-200">
            Pending Approval
          </Badge>
        );
      case "resolved":
      case "closed":
      case "completed":
        return (
          <Badge variant="outline" className="bg-success-100 text-success-800 border-success-200">
            Resolved
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
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
    <Card className="bg-white rounded-lg shadow">
      {tickets.map((ticket, index) => (
        <div 
          key={ticket.id} 
          className={`border-b border-gray-200 last:border-b-0 ${index === tickets.length - 1 ? '' : ''}`}
        >
          <div className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {getPriorityBadge(ticket.priority)}
                <span className="ml-2 text-sm font-medium text-gray-900">{ticket.ticketNumber}</span>
              </div>
              <span className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</span>
            </div>
            <h3 className="text-base font-medium text-gray-900">{ticket.title}</h3>
            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={ticket.assigneeAvatar} alt="Assignee avatar" />
                  <AvatarFallback>{ticket.assigneeName?.slice(0, 2) || "UN"}</AvatarFallback>
                </Avatar>
                <span className="ml-2 text-sm text-gray-500">
                  Assigned to: <span className="font-medium text-gray-700">{ticket.assigneeName || "Unassigned"}</span>
                </span>
              </div>
              <div>
                {getStatusBadge(ticket.status)}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button 
          onClick={onViewAll}
          className="text-sm text-center w-full inline-block font-medium text-primary-600 hover:text-primary-700"
        >
          View all tickets
        </button>
      </div>
    </Card>
  );
}
