import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Room, User, Task, RoomComment, RoomAssignment } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import RoomComments from "@/components/RoomComments";
import RoomStatusSelector from "@/components/RoomStatusSelector";
import { 
  Hotel, 
  Users, 
  Calendar,
  UserCheck,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building,
  Coffee
} from "lucide-react";
import { format } from "date-fns";

export default function FrontDesk() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected: wsConnected, subscribe } = useWebSocket();
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [showRoomAssignment, setShowRoomAssignment] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [assigneeId, setAssigneeId] = useState("");

  // Subscribe to WebSocket updates for real-time data
  useEffect(() => {
    const unsubscribeRoomStatus = subscribe('room_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    });
    
    const unsubscribeTaskAssigned = subscribe('task_assigned', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    });
    
    const unsubscribeTaskCompleted = subscribe('task_completed', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    });

    const unsubscribeComments = subscribe('user_notification', (message) => {
      if (message.data.comment || message.data.commentId) {
        queryClient.invalidateQueries({ queryKey: ["/api/room-comments"] });
      }
    });

    return () => {
      unsubscribeRoomStatus();
      unsubscribeTaskAssigned();
      unsubscribeTaskCompleted();
      unsubscribeComments();
    };
  }, [subscribe]);

  const { data: rooms = [], isLoading: loadingRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: roomComments = [] } = useQuery<RoomComment[]>({
    queryKey: ["/api/room-comments"],
  });

  const { data: roomAssignments = [] } = useQuery<RoomAssignment[]>({
    queryKey: ["/api/room-assignments"],
  });

  // Filter room attendants for assignment
  const roomAttendants = users.filter((u: User) => u.role === "room_attendant");

  // Create room lookup with current assignments and status
  const roomsWithStatus = rooms.map((room: Room) => {
    const comments = roomComments.filter((comment: RoomComment) => 
      comment.roomId === room.id && !comment.isResolved
    );
    const assignment = roomAssignments.find((a: RoomAssignment) => a.roomId === room.id);
    const assignedUser = assignment ? users.find((u: User) => u.id === assignment.userId) : null;

    return {
      ...room,
      assignedUser,
      assignment,
      openComments: comments.length,
      urgentComments: comments.filter((c: any) => c.priority === "urgent").length,
    };
  });

  // Room status counts
  const statusCounts = {
    dirty: roomsWithStatus.filter((r: any) => r.status === "dirty").length,
    ready: roomsWithStatus.filter((r: any) => r.status === "ready").length,
    roll: roomsWithStatus.filter((r: any) => r.status === "roll").length,
    out: roomsWithStatus.filter((r: any) => r.status === "out").length,
    cleanInspected: roomsWithStatus.filter((r: any) => r.status === "clean_inspected").length,
    clean: roomsWithStatus.filter((r: any) => r.status === "clean").length,
    outOfOrder: roomsWithStatus.filter((r: any) => r.status === "out_of_order").length,
    maintenance: roomsWithStatus.filter((r: any) => r.status === "maintenance").length,
  };

  // Assignment counts
  const assignmentCounts = {
    assigned: roomsWithStatus.filter((r: any) => r.assignedUser).length,
    unassigned: roomsWithStatus.filter((r: any) => !r.assignedUser && r.status === "dirty").length,
  };

  const createRoomAssignmentsMutation = useMutation({
    mutationFn: async (data: { roomIds: string[]; assigneeId: string }) => {
      const results = [];
      for (const roomId of data.roomIds) {
        const result = await apiRequest("POST", "/api/room-assignments", {
          roomId,
          userId: data.assigneeId,
        });
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      toast({ title: "Room assignments created successfully" });
      // Invalidate all related queries to ensure data sync
      queryClient.invalidateQueries({ queryKey: ["/api/room-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-comments"] });
      setShowRoomAssignment(false);
      setSelectedRooms([]);
      setAssigneeId("");
    },
    onError: () => {
      toast({ title: "Failed to create assignments", variant: "destructive" });
    },
  });

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case "clean": return "bg-green-100 text-green-800 border-green-200";
      case "clean_inspected": return "bg-green-100 text-green-800 border-green-200";
      case "ready": return "bg-blue-100 text-blue-800 border-blue-200";
      case "roll": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "out": return "bg-gray-100 text-gray-800 border-gray-200";
      case "dirty": return "bg-red-100 text-red-800 border-red-200";
      case "out_of_order": return "bg-gray-100 text-gray-800 border-gray-200";
      case "maintenance": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoomStatusIcon = (status: string) => {
    switch (status) {
      case "clean": return <CheckCircle className="h-4 w-4" />;
      case "clean_inspected": return <CheckCircle className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      case "roll": return <Clock className="h-4 w-4" />;
      case "out": return <Building className="h-4 w-4" />;
      case "dirty": return <AlertTriangle className="h-4 w-4" />;
      case "out_of_order": return <Building className="h-4 w-4" />;
      case "maintenance": return <Clock className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  // Only allow front_desk_manager and site_admin to access this page
  if (user?.role !== "front_desk_manager" && user?.role !== "site_admin") {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Access denied. This page is only available to Front Desk Managers and Site Administrators.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="front-desk-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hotel className="h-6 w-6" />
            Front Desk Operations
          </h1>
          <p className="text-muted-foreground">
            Manage room assignments and daily operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowRoomAssignment(true)}
            disabled={loadingRooms || loadingUsers}
            data-testid="bulk-assign-button"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Bulk Assign Rooms
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">READY</p>
                <p className="text-2xl font-bold">{statusCounts.ready}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROLL</p>
                <p className="text-2xl font-bold">{statusCounts.roll}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OUT</p>
                <p className="text-2xl font-bold">{statusCounts.out}</p>
              </div>
              <Building className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clean & Inspected</p>
                <p className="text-2xl font-bold">{statusCounts.cleanInspected}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dirty</p>
                <p className="text-2xl font-bold">{statusCounts.dirty}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold">{assignmentCounts.assigned}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Management Tabs */}
      <Tabs defaultValue="all-rooms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all-rooms">All Rooms</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="dirty-rooms">Dirty Rooms</TabsTrigger>
          <TabsTrigger value="comments">Room Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="all-rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRooms ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3">
                  {roomsWithStatus
                    .sort((a: any, b: any) => parseInt(a.number) - parseInt(b.number))
                    .map((room: any) => (
                      <div 
                        key={room.id} 
                        className={`flex items-center justify-between p-4 rounded-lg border ${getRoomStatusColor(room.status)}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {getRoomStatusIcon(room.status)}
                            <span className="font-semibold">Room {room.number}</span>
                          </div>
                          <Badge variant="outline">{room.type}</Badge>
                          <RoomStatusSelector room={room} showButton={false} compact={true} />
                          {room.assignedUser && (
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-3 w-3" />
                              {room.assignedUser.name}
                            </div>
                          )}
                          {room.openComments > 0 && (
                            <Badge 
                              variant={room.urgentComments > 0 ? "destructive" : "outline"}
                              className="flex items-center gap-1"
                            >
                              <Coffee className="h-3 w-3" />
                              {room.openComments} notes
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRoom(room)}
                          data-testid={`view-room-${room.number}`}
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Room Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTasks ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {roomAttendants.map((attendant: User) => {
                    const assignedRooms = roomsWithStatus.filter((r: any) => 
                      r.assignedUser?.id === attendant.id
                    );
                    
                    return (
                      <Card key={attendant.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{attendant.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {assignedRooms.length} rooms assigned
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {assignedRooms.map((room: any) => (
                                <Badge key={room.id} variant="outline">
                                  {room.number}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dirty-rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dirty Rooms Requiring Assignment</span>
                {statusCounts.dirty > 0 && (
                  <Badge variant="destructive">{statusCounts.dirty} rooms</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusCounts.dirty === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All rooms are assigned or clean!</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {roomsWithStatus
                    .filter((room: any) => room.status === "dirty" && !room.assignedUser)
                    .map((room: any) => (
                      <div 
                        key={room.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-semibold">Room {room.number}</span>
                          </div>
                          <Badge variant="outline">{room.type}</Badge>
                          <span className="text-sm text-muted-foreground">Floor {room.floor}</span>
                          {room.openComments > 0 && (
                            <Badge variant="destructive">
                              {room.openComments} urgent notes
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRooms([room.id]);
                            setShowRoomAssignment(true);
                          }}
                          data-testid={`assign-room-${room.number}`}
                        >
                          Assign Now
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rooms with Open Comments</CardTitle>
            </CardHeader>
            <CardContent>
              {roomsWithStatus.filter(r => r.openComments > 0).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No open room comments at this time.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {roomsWithStatus
                    .filter((room: any) => room.openComments > 0)
                    .sort((a: any, b: any) => b.urgentComments - a.urgentComments)
                    .map((room: any) => (
                      <div 
                        key={room.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Coffee className="h-4 w-4" />
                            <span className="font-semibold">Room {room.number}</span>
                          </div>
                          <Badge variant="outline">{room.type}</Badge>
                          <Badge 
                            variant={room.urgentComments > 0 ? "destructive" : "secondary"}
                          >
                            {room.openComments} open comments
                          </Badge>
                          {room.urgentComments > 0 && (
                            <Badge variant="destructive">
                              {room.urgentComments} urgent
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRoom(room)}
                          data-testid={`view-comments-${room.number}`}
                        >
                          View Comments
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Room Assignment Modal */}
      <Dialog open={showRoomAssignment} onOpenChange={setShowRoomAssignment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Rooms to Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Room Attendant</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger data-testid="assignee-select">
                  <SelectValue placeholder="Choose staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {roomAttendants.map((attendant: User) => (
                    <SelectItem key={attendant.id} value={attendant.id}>
                      {attendant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Select Rooms to Assign</label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {roomsWithStatus
                  .filter((room: any) => room.status === "dirty" && !room.assignedUser)
                  .map((room: any) => (
                    <div key={room.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`room-${room.id}`}
                        checked={selectedRooms.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRooms([...selectedRooms, room.id]);
                          } else {
                            setSelectedRooms(selectedRooms.filter(id => id !== room.id));
                          }
                        }}
                        data-testid={`select-room-${room.number}`}
                      />
                      <label htmlFor={`room-${room.id}`} className="text-sm flex items-center gap-2">
                        <span>Room {room.number}</span>
                        <Badge variant="outline">{room.type}</Badge>
                        {room.openComments > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {room.openComments} notes
                          </Badge>
                        )}
                      </label>
                    </div>
                  ))}
              </div>
            </div>

            {selectedRooms.length > 0 && assigneeId && (
              <Alert>
                <ClipboardList className="h-4 w-4" />
                <AlertDescription>
                  Assigning {selectedRooms.length} room(s) to{' '}
                  {roomAttendants.find(a => a.id === assigneeId)?.name}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRoomAssignment(false);
                  setSelectedRooms([]);
                  setAssigneeId("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createRoomAssignmentsMutation.mutate({
                  roomIds: selectedRooms,
                  assigneeId
                })}
                disabled={!assigneeId || selectedRooms.length === 0 || createRoomAssignmentsMutation.isPending}
                data-testid="confirm-assignment-button"
              >
                {createRoomAssignmentsMutation.isPending ? "Assigning..." : "Create Assignments"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Details Modal */}
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Room {selectedRoom?.number} - {selectedRoom?.type}
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Room Information</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Floor: {selectedRoom.floor}</p>
                    <p>Square Footage: {selectedRoom.squareFootage} sq ft</p>
                    <p>Status: {selectedRoom.status ? selectedRoom.status.replace('_', ' ') : 'Not set'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Assignment</h4>
                  <div className="text-sm text-muted-foreground">
                    {selectedRoom.assignedUser ? (
                      <p>Assigned to: {selectedRoom.assignedUser.name}</p>
                    ) : (
                      <p>Not currently assigned</p>
                    )}
                  </div>
                </div>
              </div>
              
              <RoomComments 
                roomId={selectedRoom.id} 
                roomNumber={selectedRoom.number} 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}