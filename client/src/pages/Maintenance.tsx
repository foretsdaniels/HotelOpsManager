import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StatusChip from "@/components/StatusChip";
import { apiRequest, invalidateQueries } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, 
  Wrench, 
  Clock, 
  User, 
  Play, 
  Check, 
  Pause, 
  Calendar,
  AlertTriangle,
  Settings
} from "lucide-react";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "on_hold" | "completed" | "cancelled";
  assigneeId?: string;
  roomId?: string;
  parts?: any;
  laborMins?: number;
  slaDueAt?: string;
  createdAt: string;
}

export default function Maintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateWOModal, setShowCreateWOModal] = useState(false);
  const [showCreatePMModal, setShowCreatePMModal] = useState(false);
  const [pmFrequencyMode, setPmFrequencyMode] = useState<"days_counter" | "days_rented">("days_counter");
  const [newWorkOrder, setNewWorkOrder] = useState({
    title: "",
    description: "",
    priority: "medium",
    roomId: "",
    assigneeId: "",
  });
  const [newPMTemplate, setNewPMTemplate] = useState({
    title: "",
    frequency: "days_counter",
    interval: 30,
    checklist: {},
  });

  const { data: workOrders = [], isLoading: loadingWO } = useQuery({
    queryKey: ["/api/workorders"],
  });

  const { data: pmTemplates = [], isLoading: loadingPM } = useQuery({
    queryKey: ["/api/pm/templates"],
  });

  const { data: pmInstances = [] } = useQuery({
    queryKey: ["/api/pm/upcoming"],
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["/api/rooms"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/workorders", data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/workorders"]);
      setShowCreateWOModal(false);
      setNewWorkOrder({ title: "", description: "", priority: "medium", roomId: "", assigneeId: "" });
      toast({
        title: "Work Order Created",
        description: "New work order has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Work Order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateWorkOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/workorders/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/workorders"]);
      toast({
        title: "Work Order Updated",
        description: "Work order has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPMTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/pm/templates", data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/pm/templates"]);
      setShowCreatePMModal(false);
      setNewPMTemplate({ title: "", frequency: "days_counter", interval: 30, checklist: {} });
      toast({
        title: "PM Template Created", 
        description: "New preventive maintenance template has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create PM Template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group work orders by status
  const workOrdersByStatus = {
    pending: workOrders.filter((wo: WorkOrder) => wo.status === "pending"),
    in_progress: workOrders.filter((wo: WorkOrder) => wo.status === "in_progress"),
    completed: workOrders.filter((wo: WorkOrder) => wo.status === "completed"),
    on_hold: workOrders.filter((wo: WorkOrder) => wo.status === "on_hold"),
  };

  const handleStatusUpdate = (workOrderId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    
    if (newStatus === "completed") {
      updates.closedAt = new Date().toISOString();
    }
    
    updateWorkOrderMutation.mutate({ id: workOrderId, updates });
  };

  const handleCreateWorkOrder = () => {
    if (!newWorkOrder.title || !newWorkOrder.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    createWorkOrderMutation.mutate(newWorkOrder);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 font-medium";
      case "high": return "text-orange-600 font-medium";
      case "medium": return "text-yellow-600 font-medium";
      default: return "text-gray-500";
    }
  };

  const getDueStatus = (slaDueAt?: string) => {
    if (!slaDueAt) return null;
    
    const due = new Date(slaDueAt).getTime();
    const now = Date.now();
    const diff = due - now;
    
    if (diff < 0) {
      const overdue = Math.abs(diff);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      return { isOverdue: true, text: `${hours}h left` };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return { isOverdue: false, text: `${hours}h left` };
  };

  const canCreateWO = user?.role && ["site_admin", "head_housekeeper", "maintenance", "front_desk_manager"].includes(user.role);
  const canCreatePM = user?.role && ["site_admin", "head_housekeeper", "maintenance"].includes(user.role);

  if (loadingWO || loadingPM) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="maintenance-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <div className="flex space-x-2">
          {canCreatePM && (
            <Button variant="outline" onClick={() => setShowCreatePMModal(true)} data-testid="create-pm-template">
              <Settings className="h-4 w-4 mr-2" />
              PM Template
            </Button>
          )}
          {canCreateWO && (
            <Button onClick={() => setShowCreateWOModal(true)} data-testid="create-work-order">
              <Plus className="h-4 w-4 mr-2" />
              New Work Order
            </Button>
          )}
        </div>
      </div>

      {/* Work Orders Kanban */}
      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Pending Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-muted-foreground">PENDING</h3>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {workOrdersByStatus.pending.length}
                </Badge>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {workOrdersByStatus.pending.map((wo: WorkOrder) => {
                  const dueStatus = getDueStatus(wo.slaDueAt);
                  const assignee = users.find((u: any) => u.id === wo.assigneeId);
                  const room = rooms.find((r: any) => r.id === wo.roomId);
                  
                  return (
                    <Card key={wo.id} className="cursor-move hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm line-clamp-2">{wo.title}</h4>
                          <span className={`text-xs ${getPriorityColor(wo.priority)}`}>
                            {wo.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {wo.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{assignee?.name || "Unassigned"}</span>
                          </div>
                          {dueStatus && (
                            <div className={`flex items-center space-x-1 ${dueStatus.isOverdue ? "text-destructive" : ""}`}>
                              <Clock className="h-3 w-3" />
                              <span>{dueStatus.text}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            WO #{wo.id.slice(-4)}
                            {room && <span className="ml-1">- Room {room.number}</span>}
                          </div>
                          <Button
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleStatusUpdate(wo.id, "in_progress")}
                            data-testid={`start-wo-${wo.id}`}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-muted-foreground">IN PROGRESS</h3>
                <Badge className="bg-blue-100 text-blue-800">
                  {workOrdersByStatus.in_progress.length}
                </Badge>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {workOrdersByStatus.in_progress.map((wo: WorkOrder) => {
                  const assignee = users.find((u: any) => u.id === wo.assigneeId);
                  
                  return (
                    <Card key={wo.id} className="cursor-move hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{wo.title}</h4>
                          <span className={`text-xs ${getPriorityColor(wo.priority)}`}>
                            {wo.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-3">
                          {wo.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{assignee?.name || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>In progress</span>
                          </div>
                        </div>
                        
                        {wo.parts && (
                          <div className="bg-blue-50 p-2 rounded text-xs mb-3">
                            <div className="flex items-center space-x-1 text-blue-700">
                              <Wrench className="h-3 w-3" />
                              <span>Parts required</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            WO #{wo.id.slice(-4)}
                          </div>
                          <Button
                            size="sm"
                            className="h-6 w-6 p-0 bg-success hover:bg-success/90"
                            onClick={() => handleStatusUpdate(wo.id, "completed")}
                            data-testid={`complete-wo-${wo.id}`}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Completed Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-muted-foreground">COMPLETED</h3>
                <Badge className="bg-green-100 text-green-800">
                  {workOrdersByStatus.completed.length}
                </Badge>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {workOrdersByStatus.completed.slice(0, 5).map((wo: WorkOrder) => {
                  const assignee = users.find((u: any) => u.id === wo.assigneeId);
                  
                  return (
                    <Card key={wo.id} className="opacity-75 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{wo.title}</h4>
                          <span className="text-xs text-gray-500">
                            {wo.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-3">
                          {wo.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{assignee?.name || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-success">
                            <Check className="h-3 w-3" />
                            <span>Completed</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* On Hold Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-muted-foreground">ON HOLD</h3>
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  {workOrdersByStatus.on_hold.length}
                </Badge>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {workOrdersByStatus.on_hold.map((wo: WorkOrder) => {
                  const assignee = users.find((u: any) => u.id === wo.assigneeId);
                  
                  return (
                    <Card key={wo.id} className="cursor-move hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{wo.title}</h4>
                          <span className={`text-xs ${getPriorityColor(wo.priority)}`}>
                            {wo.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-3">
                          {wo.description}
                        </p>
                        
                        <div className="bg-yellow-50 p-2 rounded text-xs mb-3">
                          <div className="flex items-center space-x-1 text-yellow-700">
                            <Pause className="h-3 w-3" />
                            <span>Waiting for parts/approval</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{assignee?.name || "Unassigned"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            WO #{wo.id.slice(-4)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preventive Maintenance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Preventive Maintenance</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={pmFrequencyMode} onValueChange={(value: "days_counter" | "days_rented") => setPmFrequencyMode(value)}>
              <SelectTrigger className="w-40" data-testid="pm-frequency-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days_counter">Days Counter</SelectItem>
                <SelectItem value="days_rented">Days Rented</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pmInstances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No preventive maintenance tasks scheduled.
            </div>
          ) : (
            pmInstances.map((pm: any) => {
              const template = pmTemplates.find((t: any) => t.id === pm.templateId);
              const assignee = users.find((u: any) => u.id === pm.assigneeId);
              const isOverdue = pm.dueAt && new Date(pm.dueAt) < new Date();
              
              return (
                <Card key={pm.id} className={`border ${isOverdue ? "border-yellow-200 bg-yellow-50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium">{template?.title || "PM Task"}</h3>
                          <StatusChip status={pm.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template?.frequency === "days_counter" ? "Days-based" : "Rental-based"} maintenance
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">Frequency</div>
                          <div className="font-medium">Every {template?.interval} days</div>
                        </div>
                        {pm.status === "pending" && (
                          <Button size="sm" data-testid={`start-pm-${pm.id}`}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {new Date(pm.dueAt).toLocaleDateString()}</span>
                        </div>
                        {assignee && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{assignee.name}</span>
                          </div>
                        )}
                      </div>
                      
                      {isOverdue && (
                        <div className="flex items-center space-x-1 text-warning">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Overdue</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Create Work Order Modal */}
      <Dialog open={showCreateWOModal} onOpenChange={setShowCreateWOModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wo-title">Title *</Label>
              <Input
                id="wo-title"
                value={newWorkOrder.title}
                onChange={(e) => setNewWorkOrder(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter work order title"
                data-testid="wo-title-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="wo-description">Description *</Label>
              <Textarea
                id="wo-description"
                value={newWorkOrder.description}
                onChange={(e) => setNewWorkOrder(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the work required"
                rows={3}
                data-testid="wo-description-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={newWorkOrder.priority} 
                  onValueChange={(value) => setNewWorkOrder(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger data-testid="wo-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Room</Label>
                <Select 
                  value={newWorkOrder.roomId} 
                  onValueChange={(value) => setNewWorkOrder(prev => ({ ...prev, roomId: value }))}
                >
                  <SelectTrigger data-testid="wo-room-select">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room: any) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select 
                value={newWorkOrder.assigneeId} 
                onValueChange={(value) => setNewWorkOrder(prev => ({ ...prev, assigneeId: value }))}
              >
                <SelectTrigger data-testid="wo-assignee-select">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u: any) => ["maintenance", "site_admin"].includes(u.role)).map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateWOModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateWorkOrder}
                disabled={createWorkOrderMutation.isPending}
                data-testid="create-wo-confirm"
              >
                {createWorkOrderMutation.isPending ? "Creating..." : "Create Work Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create PM Template Modal */}
      <Dialog open={showCreatePMModal} onOpenChange={setShowCreatePMModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create PM Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pm-title">Template Name *</Label>
              <Input
                id="pm-title"
                value={newPMTemplate.title}
                onChange={(e) => setNewPMTemplate(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter template name"
                data-testid="pm-title-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency Type</Label>
                <Select 
                  value={newPMTemplate.frequency} 
                  onValueChange={(value) => setNewPMTemplate(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger data-testid="pm-frequency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days_counter">Days Counter</SelectItem>
                    <SelectItem value="days_rented">Days Rented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Interval (Days)</Label>
                <Input
                  type="number"
                  value={newPMTemplate.interval}
                  onChange={(e) => setNewPMTemplate(prev => ({ ...prev, interval: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                  data-testid="pm-interval-input"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreatePMModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createPMTemplateMutation.mutate(newPMTemplate)}
                disabled={createPMTemplateMutation.isPending}
                data-testid="create-pm-confirm"
              >
                {createPMTemplateMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
