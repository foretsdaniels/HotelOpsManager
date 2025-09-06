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
  const [inspectionItems, setInspectionItems] = useState<any[]>([
    { id: "1", title: "Bed linens clean and properly arranged", description: "Check for stains, wrinkles, and proper hospital corners", type: "room" },
    { id: "2", title: "Bathroom cleanliness", description: "Toilet, shower, sink, mirror, and floor must be spotless", type: "room" },
    { id: "3", title: "Amenities properly stocked", description: "Towels, toiletries, coffee, water bottles, etc.", type: "room" },
    { id: "4", title: "Room temperature and HVAC", description: "Proper temperature control and air circulation", type: "room" },
    { id: "5", title: "Electronics and lighting", description: "TV, lights, alarm clock, phone all functional", type: "room" },
    { id: "6", title: "Safety and security", description: "Door locks, safe, fire safety equipment", type: "room" },
    { id: "7", title: "Staff adherence to cleaning procedures", description: "Proper sequence and technique followed", type: "process" },
    { id: "8", title: "Equipment and supplies availability", description: "All necessary tools and cleaning supplies present", type: "process" },
    { id: "9", title: "Time management and efficiency", description: "Tasks completed within expected timeframe", type: "process" },
    { id: "10", title: "Safety protocol compliance", description: "PPE usage and safety procedures followed", type: "process" }
  ]);
  const [editingInspectionItem, setEditingInspectionItem] = useState<any>(null);
  const [newInspectionItem, setNewInspectionItem] = useState({ title: "", description: "", type: "room" });

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rooms">Rooms & Types</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="tasks">Task Templates</TabsTrigger>
          <TabsTrigger value="inspections">Inspection Items</TabsTrigger>
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingRoom(room)}
                          data-testid={`edit-room-${room.number}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete Room ${room.number}?`)) {
                              try {
                                await apiRequest("DELETE", `/api/rooms/${room.id}`);
                                toast({ title: "Room deleted successfully" });
                                queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
                              } catch (error) {
                                toast({ title: "Failed to delete room", variant: "destructive" });
                              }
                            }
                          }}
                          data-testid={`delete-room-${room.number}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                          data-testid={`edit-user-${user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                              try {
                                await apiRequest("DELETE", `/api/users/${user.id}`);
                                toast({ title: "User deleted successfully" });
                                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                              } catch (error) {
                                toast({ title: "Failed to delete user", variant: "destructive" });
                              }
                            }
                          }}
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Room Inspection Items
                </span>
                <Button 
                  onClick={() => setEditingInspectionItem({ title: "", description: "", type: "room", isNew: true })}
                  data-testid="add-inspection-item-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspectionItems.filter(item => item.type === "room").map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingInspectionItem(item)}
                        data-testid={`edit-inspection-${item.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                            setInspectionItems(inspectionItems.filter(i => i.id !== item.id));
                            toast({ title: "Inspection item deleted" });
                          }
                        }}
                        data-testid={`delete-inspection-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Process Inspection Items
                </span>
                <Button 
                  onClick={() => setEditingInspectionItem({ title: "", description: "", type: "process", isNew: true })}
                  data-testid="add-process-item-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspectionItems.filter(item => item.type === "process").map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingInspectionItem(item)}
                        data-testid={`edit-process-${item.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                            setInspectionItems(inspectionItems.filter(i => i.id !== item.id));
                            toast({ title: "Inspection item deleted" });
                          }
                        }}
                        data-testid={`delete-process-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* Edit Room Modal */}
      {editingRoom && (
        <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-room-number">Room Number</Label>
                <Input
                  id="edit-room-number"
                  value={editingRoom.number}
                  onChange={(e) => setEditingRoom({ ...editingRoom, number: e.target.value })}
                  data-testid="edit-room-number-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-room-type">Room Type</Label>
                <Select
                  value={editingRoom.type}
                  onValueChange={(value) => setEditingRoom({ ...editingRoom, type: value })}
                >
                  <SelectTrigger data-testid="edit-room-type-select">
                    <SelectValue />
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
                <Label htmlFor="edit-room-floor">Floor</Label>
                <Input
                  id="edit-room-floor"
                  type="number"
                  value={editingRoom.floor}
                  onChange={(e) => setEditingRoom({ ...editingRoom, floor: parseInt(e.target.value) || 1 })}
                  min="1"
                  data-testid="edit-room-floor-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-room-sqft">Square Footage</Label>
                <Input
                  id="edit-room-sqft"
                  type="number"
                  value={editingRoom.squareFootage}
                  onChange={(e) => setEditingRoom({ ...editingRoom, squareFootage: parseInt(e.target.value) || 320 })}
                  min="100"
                  data-testid="edit-room-sqft-input"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => updateRoomMutation.mutate({ id: editingRoom.id, updates: editingRoom })}
                  disabled={!editingRoom.number || !editingRoom.type || updateRoomMutation.isPending}
                  data-testid="update-room-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateRoomMutation.isPending ? "Updating..." : "Update Room"}
                </Button>
                <Button variant="outline" onClick={() => setEditingRoom(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-user-name">Full Name</Label>
                <Input
                  id="edit-user-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  data-testid="edit-user-name-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-user-email">Email</Label>
                <Input
                  id="edit-user-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  data-testid="edit-user-email-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-user-role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger data-testid="edit-user-role-select">
                    <SelectValue />
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
                <Label htmlFor="edit-user-phone">Phone Number</Label>
                <Input
                  id="edit-user-phone"
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  data-testid="edit-user-phone-input"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-user-panic"
                  checked={editingUser.canReceivePanicAlerts || false}
                  onChange={(e) => setEditingUser({ ...editingUser, canReceivePanicAlerts: e.target.checked })}
                  data-testid="edit-user-panic-checkbox"
                />
                <Label htmlFor="edit-user-panic">Can receive panic alerts</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => updateUserMutation.mutate({ id: editingUser.id, updates: editingUser })}
                  disabled={!editingUser.name || !editingUser.email || !editingUser.role || updateUserMutation.isPending}
                  data-testid="update-user-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit/Create Inspection Item Modal */}
      {editingInspectionItem && (
        <Dialog open={!!editingInspectionItem} onOpenChange={() => setEditingInspectionItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingInspectionItem.isNew ? "Add Inspection Item" : "Edit Inspection Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inspection-title">Title</Label>
                <Input
                  id="inspection-title"
                  value={editingInspectionItem.title}
                  onChange={(e) => setEditingInspectionItem({ ...editingInspectionItem, title: e.target.value })}
                  placeholder="Enter inspection item title"
                  data-testid="inspection-title-input"
                />
              </div>
              <div>
                <Label htmlFor="inspection-description">Description</Label>
                <Textarea
                  id="inspection-description"
                  value={editingInspectionItem.description}
                  onChange={(e) => setEditingInspectionItem({ ...editingInspectionItem, description: e.target.value })}
                  placeholder="Enter detailed description"
                  rows={3}
                  data-testid="inspection-description-input"
                />
              </div>
              <div>
                <Label htmlFor="inspection-type">Type</Label>
                <Select
                  value={editingInspectionItem.type}
                  onValueChange={(value) => setEditingInspectionItem({ ...editingInspectionItem, type: value })}
                >
                  <SelectTrigger data-testid="inspection-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">Room Inspection</SelectItem>
                    <SelectItem value="process">Process Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    if (editingInspectionItem.isNew) {
                      const newItem = {
                        ...editingInspectionItem,
                        id: Date.now().toString(),
                      };
                      setInspectionItems([...inspectionItems, newItem]);
                      toast({ title: "Inspection item added successfully" });
                    } else {
                      setInspectionItems(inspectionItems.map(item => 
                        item.id === editingInspectionItem.id ? editingInspectionItem : item
                      ));
                      toast({ title: "Inspection item updated successfully" });
                    }
                    setEditingInspectionItem(null);
                  }}
                  disabled={!editingInspectionItem.title || !editingInspectionItem.description}
                  data-testid="save-inspection-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingInspectionItem.isNew ? "Add Item" : "Update Item"}
                </Button>
                <Button variant="outline" onClick={() => setEditingInspectionItem(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}