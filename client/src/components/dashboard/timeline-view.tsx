import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Filter, 
  HelpCircle, 
  List, 
  Settings, 
  Wrench
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Type for a unified ticket model
interface GenericTicket {
  id: number;
  ticketNumber: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  assigneeName?: string;
}

interface TimelineViewProps {
  tickets: GenericTicket[];
  serviceRequests: GenericTicket[];
  changeRequests: GenericTicket[];
  onViewAll: () => void;
}

export default function TimelineView({ 
  tickets, 
  serviceRequests, 
  changeRequests,
  onViewAll
}: TimelineViewProps) {
  const [, navigate] = useLocation();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [view, setView] = useState<"timeline" | "list">("timeline");

  // Combine all items for the unified timeline
  const allItems = useMemo(() => {
    // Add type information to each item for filtering
    const incidentTickets = tickets.map(ticket => ({ ...ticket, type: 'incident' }));
    const serviceReqTickets = serviceRequests.map(req => ({ ...req, type: 'service-request' }));
    const changeReqTickets = changeRequests.map(change => ({ ...change, type: 'change-request' }));
    
    // Combine and sort by creation date (newest first)
    return [...incidentTickets, ...serviceReqTickets, ...changeReqTickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tickets, serviceRequests, changeRequests]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      return (
        (typeFilter === null || item.type === typeFilter) &&
        (statusFilter === null || item.status.toLowerCase() === statusFilter) &&
        (priorityFilter === null || item.priority.toLowerCase() === priorityFilter)
      );
    });
  }, [allItems, typeFilter, statusFilter, priorityFilter]);

  // Get unique statuses and priorities for filter options
  const uniqueStatuses = useMemo(() => {
    // Create an object to track unique values instead of using Set
    const statusMap: Record<string, boolean> = {};
    allItems.forEach(item => {
      const status = item.status.toLowerCase();
      statusMap[status] = true;
    });
    return Object.keys(statusMap);
  }, [allItems]);

  const uniquePriorities = useMemo(() => {
    // Create an object to track unique values instead of using Set
    const priorityMap: Record<string, boolean> = {};
    allItems.forEach(item => {
      const priority = item.priority.toLowerCase();
      priorityMap[priority] = true;
    });
    return Object.keys(priorityMap);
  }, [allItems]);

  // Function to get appropriate icon based on item type
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'incident':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'service-request':
        return <Settings className="h-4 w-4 text-blue-500" />;
      case 'change-request':
        return <Wrench className="h-4 w-4 text-green-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Function to format date in a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle clicking on an item
  const handleItemClick = (item: any) => {
    switch (item.type) {
      case 'incident':
        navigate(`/incidents/${item.id}`);
        break;
      case 'service-request':
        navigate(`/service-requests/${item.id}`);
        break;
      case 'change-request':
        navigate(`/changes/${item.id}`);
        break;
    }
  };

  // Reset all filters
  const clearFilters = () => {
    setTypeFilter(null);
    setStatusFilter(null);
    setPriorityFilter(null);
  };

  // Function to get badge color based on priority
  const getPriorityBadgeVariant = (priority: string): "destructive" | "secondary" | "outline" | "default" => {
    switch (priority.toLowerCase()) {
      case 'high':
        return "destructive";
      case 'medium':
        return "default"; // Using default instead of warning to match available variants
      case 'low':
        return "secondary";
      default:
        return "outline";
    }
  };

  // Function to get badge color based on status
  const getStatusBadgeVariant = (status: string): "destructive" | "secondary" | "outline" | "default" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('new') || lowerStatus.includes('open')) return "default";
    if (lowerStatus.includes('progress') || lowerStatus.includes('assigned')) return "default"; // Using default instead of warning
    if (lowerStatus.includes('closed') || lowerStatus.includes('complete') || lowerStatus.includes('resolved')) return "secondary"; // Using secondary instead of success
    if (lowerStatus.includes('pending')) return "secondary";
    return "outline";
  };

  // Timeline view rendering
  const renderTimelineView = () => {
    return (
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        <div className="space-y-6">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <div key={`${item.type}-${item.id}`} className="flex gap-4">
                <div className="flex-shrink-0 w-16 text-xs text-gray-500 mt-0.5 text-right">
                  {formatDate(item.createdAt)}
                </div>
                <div className="relative flex items-center justify-center w-4">
                  <div className="absolute w-3 h-3 bg-white border-2 border-primary-500 rounded-full"></div>
                </div>
                <div className="flex-grow bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getItemIcon(item.type)} 
                      <span className="text-sm font-semibold text-gray-700">{item.ticketNumber}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">{item.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        variant={getStatusBadgeVariant(item.status)}
                        className="text-xs font-normal"
                      >
                        {item.status}
                      </Badge>
                      <Badge 
                        variant={getPriorityBadgeVariant(item.priority)}
                        className="text-xs font-normal"
                      >
                        {item.priority}
                      </Badge>
                      {item.assigneeName && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.assigneeName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex justify-center items-center p-8">
              <p className="text-gray-500">No items match the current filters</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // List view rendering
  const renderListView = () => {
    return (
      <div className="space-y-2">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div 
              key={`${item.type}-${item.id}`}
              className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleItemClick(item)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getItemIcon(item.type)}
                  <span className="text-sm font-semibold text-gray-700">{item.ticketNumber}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(item.createdAt)}
                </div>
              </div>
              
              <h3 className="font-medium text-gray-900 mt-1 mb-2">{item.title}</h3>
              
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={getStatusBadgeVariant(item.status)}
                  className="text-xs font-normal"
                >
                  {item.status}
                </Badge>
                <Badge 
                  variant={getPriorityBadgeVariant(item.priority)}
                  className="text-xs font-normal"
                >
                  {item.priority}
                </Badge>
                {item.assigneeName && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {item.assigneeName}
                  </Badge>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-center items-center p-8">
            <p className="text-gray-500">No items match the current filters</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <CardTitle className="text-lg font-bold">Activity Timeline</CardTitle>
          
          <div className="flex flex-wrap gap-2">
            {/* View switcher */}
            <div className="border rounded-md p-1">
              <Button
                variant={view === "timeline" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setView("timeline")}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Timeline
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
            
            {/* Filters dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-4 w-4 mr-1" />
                  {typeFilter || statusFilter || priorityFilter ? 'Filters Applied' : 'Filter'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter Items</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Type</DropdownMenuLabel>
                  <DropdownMenuItem 
                    onClick={() => setTypeFilter(null)}
                    className={typeFilter === null ? "bg-gray-100" : ""}
                  >
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTypeFilter('incident')}
                    className={typeFilter === 'incident' ? "bg-gray-100" : ""}
                  >
                    Incidents
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTypeFilter('service-request')}
                    className={typeFilter === 'service-request' ? "bg-gray-100" : ""}
                  >
                    Service Requests
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTypeFilter('change-request')}
                    className={typeFilter === 'change-request' ? "bg-gray-100" : ""}
                  >
                    Change Requests
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                  <DropdownMenuItem 
                    onClick={() => setStatusFilter(null)}
                    className={statusFilter === null ? "bg-gray-100" : ""}
                  >
                    All Statuses
                  </DropdownMenuItem>
                  {uniqueStatuses.map(status => (
                    <DropdownMenuItem 
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={statusFilter === status ? "bg-gray-100" : ""}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
                  <DropdownMenuItem 
                    onClick={() => setPriorityFilter(null)}
                    className={priorityFilter === null ? "bg-gray-100" : ""}
                  >
                    All Priorities
                  </DropdownMenuItem>
                  {uniquePriorities.map(priority => (
                    <DropdownMenuItem 
                      key={priority}
                      onClick={() => setPriorityFilter(priority)}
                      className={priorityFilter === priority ? "bg-gray-100" : ""}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={clearFilters} className="text-primary-600">
                  Clear all filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="link"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 p-0"
              onClick={onViewAll}
            >
              View all
            </Button>
          </div>
        </div>
        
        {/* Active filters display */}
        {(typeFilter || statusFilter || priorityFilter) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 border-t pt-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {typeFilter && (
              <Badge variant="outline" className="flex items-center gap-1">
                {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1).replace('-', ' ')}
                <button 
                  className="ml-1 hover:bg-gray-200 rounded-full"
                  onClick={() => setTypeFilter(null)}
                >
                  <span className="sr-only">Remove</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </Badge>
            )}
            {statusFilter && (
              <Badge variant="outline" className="flex items-center gap-1">
                Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ')}
                <button 
                  className="ml-1 hover:bg-gray-200 rounded-full"
                  onClick={() => setStatusFilter(null)}
                >
                  <span className="sr-only">Remove</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </Badge>
            )}
            {priorityFilter && (
              <Badge variant="outline" className="flex items-center gap-1">
                Priority: {priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                <button 
                  className="ml-1 hover:bg-gray-200 rounded-full"
                  onClick={() => setPriorityFilter(null)}
                >
                  <span className="sr-only">Remove</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs px-2 ml-auto"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredItems.length === 0 && !typeFilter && !statusFilter && !priorityFilter ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No recent activity</h3>
            <p className="text-gray-500 mt-1">When new items are added, they will appear here</p>
          </div>
        ) : (
          <div className="pt-1">
            {view === "timeline" ? renderTimelineView() : renderListView()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}