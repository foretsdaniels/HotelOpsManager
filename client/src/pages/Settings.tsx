import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Settings2, 
  Users, 
  Building2, 
  ListChecks, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X
} from "lucide-react";

// Room types as specified by user
const ROOM_TYPES = ["KING", "QQ", "KINGM", "QQM", "KKIT", "QQKIT", "GFK", "GFQ", "GFKK", "GFKQ", "SUITE"];

const USER_ROLES = [
  { value: "site_admin", label: "Site Administrator" },
  { value: "head_housekeeper", label: "Head Housekeeper" },
  { value: "room_attendant", label: "Room Attendant" },
  { value: "maintenance", label: "Maintenance" },
  { value: "front_desk_manager", label: "Front Desk Manager" },
];

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rooms");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [newRoom, setNewRoom] = useState({
    number: "",
    type: "",
    floor: 1,
    squareFootage: 320,
  });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
    password: "",
    canReceivePanicAlerts: false,
  });

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    type: "housekeeping",
    priority: "medium",
  });

  // Data queries
  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ["/api/rooms"],
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Mutations
  const createRoomMutation = useMutation({
    mutationFn: (roomData: any) => apiRequest("POST", "/api/rooms", roomData),
    onSuccess: () => {
      toast({ title: "Room created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setShowCreateRoom(false);
      setNewRoom({ number: "", type: "", floor: 1, squareFootage: 320 });
    },
    onError: () => {
      toast({ title: "Failed to create room", variant: "destructive" });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiRequest("PATCH", `/api/rooms/${id}`, updates),
    onSuccess: () => {
      toast({ title: "Room updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setEditingRoom(null);
    },
    onError: () => {
      toast({ title: "Failed to update room", variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest("POST", "/api/users", userData),
    onSuccess: () => {
      toast({ title: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreateUser(false);
      setNewUser({
        name: "",
        email: "",
        role: "",
        phone: "",
        password: "",
        canReceivePanicAlerts: false,
      });
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiRequest("PATCH", `/api/users/${id}`, updates),
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => apiRequest("POST", "/api/tasks", taskData),
    onSuccess: () => {
      toast({ title: "Task template created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowCreateTask(false);
      setNewTask({
        title: "",
        description: "",
        type: "housekeeping",
        priority: "medium",
      });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  // Only allow site_admin to access settings
  if (user?.role !== "site_admin") {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Access denied. This page is only available to Site Administrators.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          System Settings
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rooms">Rooms & Types</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="tasks">Task Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Room Management
                </span>
                <Button 
                  onClick={() => setShowCreateRoom(true)}
                  data-testid="create-room-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRooms ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room: any) => (
                    <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="font-semibold">Room {room.number}</div>
                        <Badge variant="outline">{room.type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Floor {room.floor} • {room.squareFootage} sq ft
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRoom(room)}
                        data-testid={`edit-room-${room.number}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Room Type Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {ROOM_TYPES.map((type) => (
                  <Badge key={type} variant="secondary" className="justify-center py-2">
                    {type}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                These are the available room types for assignment. Contact system administrator to modify.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </span>
                <Button 
                  onClick={() => setShowCreateUser(true)}
                  data-testid="create-user-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        <Badge variant="outline">
                          {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                        </Badge>
                        {user.canReceivePanicAlerts && (
                          <Badge variant="destructive" className="text-xs">Alert Recipient</Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        data-testid={`edit-user-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Task Templates
                </span>
                <Button 
                  onClick={() => setShowCreateTask(true)}
                  data-testid="create-task-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </CardTitle>
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
                  {tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold">{task.title}</div>
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{task.type}</Badge>
                          <Badge variant={
                            task.priority === 'urgent' ? 'destructive' :
                            task.priority === 'high' ? 'default' :
                            task.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Room Modal */}
      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="room-number">Room Number</Label>
              <Input
                id="room-number"
                value={newRoom.number}
                onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                placeholder="101"
                data-testid="room-number-input"
              />
            </div>
            <div>
              <Label htmlFor="room-type">Room Type</Label>
              <Select
                value={newRoom.type}
                onValueChange={(value) => setNewRoom({ ...newRoom, type: value })}
              >
                <SelectTrigger data-testid="room-type-select">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="room-floor">Floor</Label>
              <Input
                id="room-floor"
                type="number"
                value={newRoom.floor}
                onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })}
                min="1"
                data-testid="room-floor-input"
              />
            </div>
            <div>
              <Label htmlFor="room-sqft">Square Footage</Label>
              <Input
                id="room-sqft"
                type="number"
                value={newRoom.squareFootage}
                onChange={(e) => setNewRoom({ ...newRoom, squareFootage: parseInt(e.target.value) || 320 })}
                min="100"
                data-testid="room-sqft-input"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => createRoomMutation.mutate(newRoom)}
                disabled={!newRoom.number || !newRoom.type || createRoomMutation.isPending}
                data-testid="save-room-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {createRoomMutation.isPending ? "Creating..." : "Create Room"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateRoom(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Smith"
                data-testid="user-name-input"
              />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@hotel.com"
                data-testid="user-email-input"
              />
            </div>
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="user-phone">Phone (optional)</Label>
              <Input
                id="user-phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="+1-555-0123"
                data-testid="user-phone-input"
              />
            </div>
            <div>
              <Label htmlFor="user-password">Password</Label>
              <Input
                id="user-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter secure password"
                data-testid="user-password-input"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="user-panic"
                checked={newUser.canReceivePanicAlerts}
                onChange={(e) => setNewUser({ ...newUser, canReceivePanicAlerts: e.target.checked })}
                data-testid="user-panic-checkbox"
              />
              <Label htmlFor="user-panic">Can receive panic alerts</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => createUserMutation.mutate(newUser)}
                disabled={!newUser.name || !newUser.email || !newUser.role || !newUser.password || createUserMutation.isPending}
                data-testid="save-user-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateUser(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}