import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import RoomStatusSelector from "@/components/RoomStatusSelector";
import RoomComments from "@/components/RoomComments";
import RoomAssignmentManager from "@/components/RoomAssignmentManager";
import { 
  Hotel, 
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building,
  DoorOpen,
  Sparkles
} from "lucide-react";
import type { Room, User, RoomAssignment } from "@shared/schema";

const STATUS_FILTERS = [
  { value: "all", label: "All Rooms", icon: Hotel },
  { value: "dirty", label: "Dirty", icon: AlertTriangle, color: "text-red-500" },
  { value: "ready", label: "READY", icon: CheckCircle, color: "text-blue-500" },
  { value: "roll", label: "ROLL", icon: Clock, color: "text-yellow-500" },
  { value: "out", label: "OUT", icon: DoorOpen, color: "text-gray-500" },
  { value: "clean_inspected", label: "Clean & Inspected", icon: Sparkles, color: "text-green-500" },
  { value: "clean", label: "Clean", icon: CheckCircle, color: "text-green-500" },
  { value: "out_of_order", label: "Out of Order", icon: Building, color: "text-gray-500" },
  { value: "maintenance", label: "Maintenance", icon: Building, color: "text-amber-500" },
];

export default function RoomStatus() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: roomAssignments = [] } = useQuery<RoomAssignment[]>({
    queryKey: ["/api/room-assignments"],
  });

  // Filter rooms based on user role and assignment
  const userRooms = rooms.filter((room: Room) => {
    // Admin, head housekeeper, and front desk manager see all rooms
    if (user?.role === "site_admin" || user?.role === "head_housekeeper" || user?.role === "front_desk_manager") {
      return true;
    }
    
    // Room attendants only see their assigned rooms
    const assignment = roomAssignments.find((a: RoomAssignment) => a.roomId === room.id && a.userId === user?.id);
    return !!assignment;
  });

  // Filter and search logic
  const filteredRooms = userRooms.filter((room: Room) => {
    const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || room.status === statusFilter;
    const matchesFloor = floorFilter === "all" || room.floor?.toString() === floorFilter;
    
    return matchesSearch && matchesStatus && matchesFloor;
  });

  // Get unique floors for filter dropdown (based on visible rooms)
  const floors = Array.from(new Set(userRooms.map((room: Room) => room.floor))).sort((a: any, b: any) => a - b);

  // Room status counts for dashboard (based on visible rooms)
  const statusCounts = STATUS_FILTERS.reduce((acc, status) => {
    if (status.value === "all") {
      acc[status.value] = userRooms.length;
    } else {
      acc[status.value] = userRooms.filter((room: Room) => room.status === status.value).length;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get room assignments
  const roomsWithAssignments = filteredRooms.map((room: Room) => {
    const assignment = roomAssignments.find((a: RoomAssignment) => a.roomId === room.id);
    const assignedUser = assignment ? users.find((user: User) => user.id === assignment.userId) : null;
    
    return {
      ...room,
      assignedUser,
      assignment,
    };
  });

  // Check if user can access this page
  if (!user?.role || !["site_admin", "head_housekeeper", "room_attendant", "front_desk_manager"].includes(user.role)) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Access denied. This page is only available to hotel operations staff.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="room-status-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hotel className="h-6 w-6" />
            Room Status Management
          </h1>
          <p className="text-muted-foreground">
            Monitor and update room statuses throughout the hotel
          </p>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {STATUS_FILTERS.filter(status => status.value !== "all").map((status) => {
          const Icon = status.icon;
          const count = statusCounts[status.value] || 0;
          
          return (
            <Card 
              key={status.value}
              className={`cursor-pointer transition-all ${
                statusFilter === status.value ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setStatusFilter(status.value)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{status.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${status.color || "text-gray-500"}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by room number or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-rooms"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((status) => {
                    const Icon = status.icon;
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${status.color || ""}`} />
                          {status.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger className="w-[120px]" data-testid="floor-filter">
                  <SelectValue placeholder="All Floors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {floors.map((floor: any) => (
                    <SelectItem key={floor} value={floor.toString()}>
                      Floor {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Room Status ({filteredRooms.length} rooms)</span>
            {statusFilter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")}>
                Clear Filter
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hotel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rooms found matching your criteria.</p>
              <p className="text-sm">Try adjusting your search or filter settings.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {roomsWithAssignments
                .sort((a: any, b: any) => parseInt(a.number) - parseInt(b.number))
                .map((room: any) => (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Room {room.number}</span>
                        <Badge variant="outline">{room.type}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Floor {room.floor}</span>
                        {room.assignedUser && (
                          <Badge variant="secondary" className="text-xs">
                            Assigned to {room.assignedUser.name}
                          </Badge>
                        )}
                      </div>

                      <RoomStatusSelector room={room} showButton={false} compact={true} />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRoom(room)}
                        data-testid={`view-room-details-${room.number}`}
                      >
                        View Details
                      </Button>
                      
                      <RoomStatusSelector room={room} showButton={true} compact={false} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Room {selectedRoom.number} - {selectedRoom.type}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRoom(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Room Information</h3>
                  <div className="text-sm space-y-2">
                    <p>Floor: {selectedRoom.floor}</p>
                    <p>Square Footage: {selectedRoom.squareFootage} sq ft</p>
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      <RoomStatusSelector room={selectedRoom} showButton={false} compact={true} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Status Management</h3>
                  <div className="space-y-2">
                    <RoomStatusSelector room={selectedRoom} showButton={true} compact={false} />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <RoomAssignmentManager 
                  roomId={selectedRoom.id} 
                  roomNumber={selectedRoom.number} 
                />
              </div>
              
              <RoomComments 
                roomId={selectedRoom.id} 
                roomNumber={selectedRoom.number} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}