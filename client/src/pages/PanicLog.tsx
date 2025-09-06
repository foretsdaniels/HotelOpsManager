import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertTriangle, 
  Search, 
  Calendar, 
  User, 
  Clock, 
  MapPin,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Download
} from "lucide-react";

interface PanicEvent {
  id: string;
  userId: string;
  timestamp: string;
  recipients: Array<{
    id: string;
    email: string;
    name: string;
  }>;
  mediaUrl?: string;
  createdAt: string;
}

export default function PanicLog() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<PanicEvent | null>(null);

  const { data: panicEvents = [], isLoading } = useQuery({
    queryKey: ["/api/panic/log"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Filter events based on search and date
  const filteredEvents = panicEvents.filter((event: PanicEvent) => {
    // Date filter
    if (dateFilter !== "all") {
      const eventDate = new Date(event.timestamp);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case "today":
          if (daysDiff !== 0) return false;
          break;
        case "week":
          if (daysDiff > 7) return false;
          break;
        case "month":
          if (daysDiff > 30) return false;
          break;
      }
    }

    // Search filter
    if (searchQuery) {
      const userData = users.find((u: any) => u.id === event.userId);
      const searchLower = searchQuery.toLowerCase();
      
      if (
        !userData?.name?.toLowerCase().includes(searchLower) &&
        !userData?.email?.toLowerCase().includes(searchLower) &&
        !event.id.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    return true;
  });

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return eventTime.toLocaleDateString();
  };

  const getSeverityLevel = (timestamp: string) => {
    const eventTime = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 2) return "critical";
    if (diffInHours < 24) return "high";
    return "resolved";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "resolved": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const exportEvents = () => {
    const headers = "Event ID,User,Email,Timestamp,Recipients Count,Media,Status";
    const rows = filteredEvents.map((event: PanicEvent) => {
      const userData = users.find((u: any) => u.id === event.userId);
      return [
        event.id,
        userData?.name || "Unknown",
        userData?.email || "Unknown",
        new Date(event.timestamp).toLocaleString(),
        event.recipients.length,
        event.mediaUrl ? "Yes" : "No",
        getSeverityLevel(event.timestamp)
      ].join(",");
    });
    
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `panic-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const canAccessPanicLog = user?.role && ["site_admin", "head_housekeeper", "front_desk_manager"].includes(user.role);

  if (!canAccessPanicLog) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              You don't have permission to access the panic log.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-16 bg-muted rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="panic-log-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center">
          <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
          Panic Alert Log
        </h1>
        <Button 
          variant="outline" 
          onClick={exportEvents}
          disabled={filteredEvents.length === 0}
          data-testid="export-panic-log"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name, email, or event ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-panic-events"
                />
              </div>
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48" data-testid="date-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">
              {filteredEvents.filter((e: PanicEvent) => getSeverityLevel(e.timestamp) === "critical").length}
            </div>
            <div className="text-sm text-muted-foreground">Critical (&lt; 2h)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredEvents.filter((e: PanicEvent) => getSeverityLevel(e.timestamp) === "high").length}
            </div>
            <div className="text-sm text-muted-foreground">Recent (&lt; 24h)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {filteredEvents.filter((e: PanicEvent) => getSeverityLevel(e.timestamp) === "resolved").length}
            </div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {filteredEvents.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Events</div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Alert Events ({filteredEvents.length})</span>
            {filteredEvents.length > 0 && (
              <Badge variant="secondary">
                <Filter className="h-3 w-3 mr-1" />
                {searchQuery || dateFilter !== "all" ? "Filtered" : "All"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="text-lg font-medium text-muted-foreground mb-2">
                {searchQuery || dateFilter !== "all" 
                  ? "No panic alerts match your filters" 
                  : "No panic alerts have been triggered"}
              </div>
              <div className="text-sm text-muted-foreground">
                {searchQuery || dateFilter !== "all" 
                  ? "Try adjusting your search criteria or date range"
                  : "This is a good sign - no emergency situations have been reported"}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event: PanicEvent) => {
                const userData = users.find((u: any) => u.id === event.userId);
                const severity = getSeverityLevel(event.timestamp);
                
                return (
                  <Card 
                    key={event.id} 
                    className={`cursor-pointer transition-shadow hover:shadow-md border-l-4 ${
                      severity === "critical" ? "border-l-red-500" :
                      severity === "high" ? "border-l-orange-500" :
                      "border-l-gray-400"
                    }`}
                    onClick={() => setSelectedEvent(event)}
                    data-testid={`panic-event-${event.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-destructive" data-testid="event-title">
                                Emergency Alert Triggered
                              </h3>
                              <Badge className={getSeverityColor(severity)}>
                                {severity.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span data-testid="event-user">
                                  {userData?.name || "Unknown User"}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span data-testid="event-time">
                                  {getTimeAgo(event.timestamp)}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(event.timestamp).toLocaleDateString()} at{" "}
                                  {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <span className="text-xs bg-muted px-2 py-1 rounded">
                                  {event.recipients.length} recipients notified
                                </span>
                                {event.mediaUrl && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
                                    <ImageIcon className="h-3 w-3 mr-1" />
                                    Media
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-muted-foreground ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Panic Alert Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-6">
              {/* Event Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Event Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Event ID:</span>
                      <div className="font-mono text-xs">{selectedEvent.id}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div>
                        <Badge className={getSeverityColor(getSeverityLevel(selectedEvent.timestamp))}>
                          {getSeverityLevel(selectedEvent.timestamp).toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date & Time:</span>
                      <div>{new Date(selectedEvent.timestamp).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Ago:</span>
                      <div>{getTimeAgo(selectedEvent.timestamp)}</div>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div>
                  <h4 className="font-medium mb-2">Triggered By</h4>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    {(() => {
                      const userData = users.find((u: any) => u.id === selectedEvent.userId);
                      return (
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-medium text-sm">
                              {userData?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "??"}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{userData?.name || "Unknown User"}</div>
                            <div className="text-sm text-muted-foreground">{userData?.email || "No email"}</div>
                            <div className="text-xs text-muted-foreground">
                              {userData?.role?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Unknown Role"}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <h4 className="font-medium mb-2">
                    Recipients Notified ({selectedEvent.recipients.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="space-y-2">
                      {selectedEvent.recipients.map((recipient) => (
                        <div key={recipient.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                          <div>
                            <div className="font-medium">{recipient.name}</div>
                            <div className="text-muted-foreground text-xs">{recipient.email}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Notified
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Media */}
                {selectedEvent.mediaUrl && (
                  <div>
                    <h4 className="font-medium mb-2">Attached Media</h4>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Media file attached</span>
                        <Button variant="outline" size="sm">
                          View Media
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Required */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800">Follow-up Required</div>
                    <div className="text-yellow-700 mt-1">
                      Ensure appropriate response has been provided and document the incident resolution.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
