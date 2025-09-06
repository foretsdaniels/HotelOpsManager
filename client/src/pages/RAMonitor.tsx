import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import StatusChip from "@/components/StatusChip";
import { apiRequest, invalidateQueries } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Users, Clock, TrendingUp, UserCheck, ExternalLink } from "lucide-react";

interface TaskForAssignment {
  id: string;
  title: string;
  type: string;
  priority: string;
  roomId?: string;
  estimatedTime?: number;
  selected: boolean;
}

export default function RAMonitor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [targetAssigneeId, setTargetAssigneeId] = useState<string>("");

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["/api/tasks", { status: "pending" }],
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["/api/rooms"],
  });

  // Get room attendants and their current workload
  const roomAttendants = users.filter((u: any) => 
    ["room_attendant", "head_housekeeper"].includes(u.role)
  );

  // Calculate workload for each RA
  const raWorkload = roomAttendants.map((ra: any) => {
    const activeTasks = tasks.filter((task: any) => 
      task.assigneeId === ra.id && 
      ["pending", "in_progress", "paused"].includes(task.status)
    );
    
    const completedToday = tasks.filter((task: any) => 
      task.assigneeId === ra.id && 
      task.status === "completed" &&
      task.finishedAt &&
      new Date(task.finishedAt).toDateString() === new Date().toDateString()
    ).length;

    // Calculate average time (mock calculation)
    const avgTimeMinutes = 45; // This would be calculated from actual completion times
    const efficiency = Math.round(Math.random() * 20 + 80); // Mock efficiency 80-100%

    return {
      ...ra,
      activeTaskCount: activeTasks.length,
      completedToday,
      avgTime: `${avgTimeMinutes}m`,
      efficiency,
      activeTasks,
    };
  });

  // Available tasks for assignment (unassigned or can be reassigned)
  const availableTasks: TaskForAssignment[] = tasks
    .filter((task: any) => task.status === "pending")
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      type: task.type,
      priority: task.priority,
      roomId: task.roomId,
      estimatedTime: 45, // Mock estimated time
      selected: selectedTasks.includes(task.id),
    }));

  const bulkReassignMutation = useMutation({
    mutationFn: async (data: { taskIds: string[]; assigneeId: string }) => {
      const promises = data.taskIds.map(taskId =>
        apiRequest("POST", `/api/tasks/${taskId}/reassign`, { assigneeId: data.assigneeId })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      invalidateQueries(["/api/tasks"]);
      setSelectedTasks([]);
      setTargetAssigneeId("");
      toast({
        title: "Tasks Reassigned",
        description: `${selectedTasks.length} tasks have been reassigned successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reassignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    setSelectedTasks(prev => 
      checked 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const handleBulkReassign = () => {
    if (selectedTasks.length === 0 || !targetAssigneeId) {
      toast({
        title: "Invalid Selection",
        description: "Please select tasks and an assignee.",
        variant: "destructive",
      });
      return;
    }

    bulkReassignMutation.mutate({
      taskIds: selectedTasks,
      assigneeId: targetAssigneeId,
    });
  };

  const getSelectedTasksEstimate = () => {
    const selectedTaskObjects = availableTasks.filter(task => selectedTasks.includes(task.id));
    const totalTime = selectedTaskObjects.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
    const hours = Math.floor(totalTime / 60);
    const minutes = totalTime % 60;
    return { count: selectedTaskObjects.length, hours, minutes, totalMinutes: totalTime };
  };

  const getTargetAssigneeWorkload = () => {
    if (!targetAssigneeId) return null;
    const ra = raWorkload.find(ra => ra.id === targetAssigneeId);
    return ra;
  };

  // Mock recent activity data
  const liveUpdates = [
    {
      id: "1",
      message: "Sarah started Room 203 cleaning",
      timestamp: "2 minutes ago",
      status: "in_progress",
      type: "start",
    },
    {
      id: "2",
      message: "Maria completed Room 105 maintenance check",
      timestamp: "5 minutes ago",
      status: "completed", 
      type: "complete",
    },
    {
      id: "3",
      message: "Jennifer was assigned Room 301 cleaning",
      timestamp: "8 minutes ago",
      status: "pending",
      type: "assign",
    },
  ];

  const canManageRA = user?.role && ["site_admin", "head_housekeeper", "front_desk_manager"].includes(user.role);

  if (!canManageRA) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              You don't have permission to access the RA Monitor.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingTasks || loadingUsers) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="ra-monitor-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">RA Monitor</h1>
        <Button 
          onClick={handleBulkReassign}
          disabled={selectedTasks.length === 0 || !targetAssigneeId || bulkReassignMutation.isPending}
          data-testid="bulk-reassign-button"
        >
          <Users className="h-4 w-4 mr-2" />
          {bulkReassignMutation.isPending ? "Reassigning..." : "Bulk Reassign"}
        </Button>
      </div>

      {/* Room Attendant Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {raWorkload.map((ra) => (
          <Card key={ra.id} data-testid={`ra-card-${ra.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-medium">
                      {ra.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium" data-testid="ra-name">{ra.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ra.role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground" data-testid="active-task-count">
                    {ra.activeTaskCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Active Tasks</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="font-medium text-success" data-testid="completed-today">
                    {ra.completedToday}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="font-medium text-warning" data-testid="avg-time">
                    {ra.avgTime}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Time</div>
                </div>
                <div>
                  <div className="font-medium text-primary" data-testid="efficiency">
                    {ra.efficiency}%
                  </div>
                  <div className="text-xs text-muted-foreground">Efficiency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Reassignment Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Task Reassignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Tasks */}
            <div>
              <h3 className="font-medium mb-3">Available Tasks</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTasks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No tasks available for assignment.
                  </div>
                ) : (
                  availableTasks.map((task) => {
                    const room = rooms.find((r: any) => r.id === task.roomId);
                    
                    return (
                      <div 
                        key={task.id} 
                        className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`assignable-task-${task.id}`}
                      >
                        <Checkbox
                          checked={task.selected}
                          onCheckedChange={(checked) => handleTaskSelection(task.id, !!checked)}
                          data-testid={`task-checkbox-${task.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-sm truncate" data-testid="task-title">
                              {task.title}
                            </h4>
                            <StatusChip status="pending" />
                            {task.priority === "high" || task.priority === "urgent" && (
                              <Badge variant="destructive" className="text-xs">
                                {task.priority.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            {room && <span>Room {room.number}</span>}
                            <span>{task.type.replace(/_/g, " ")}</span>
                            <span>~{task.estimatedTime}m</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Assignment Target */}
            <div>
              <h3 className="font-medium mb-3">Assign To</h3>
              <div className="space-y-4">
                <Select value={targetAssigneeId} onValueChange={setTargetAssigneeId}>
                  <SelectTrigger data-testid="target-assignee-select">
                    <SelectValue placeholder="Select Room Attendant" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomAttendants.map((ra: any) => {
                      const workload = raWorkload.find(w => w.id === ra.id);
                      return (
                        <SelectItem key={ra.id} value={ra.id}>
                          {ra.name} ({workload?.activeTaskCount || 0} active)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {selectedTasks.length > 0 && targetAssigneeId && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm mb-2">Assignment Preview</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Selected tasks: {getSelectedTasksEstimate().count} tasks</div>
                        <div>
                          Estimated time: {getSelectedTasksEstimate().hours}h {getSelectedTasksEstimate().minutes}m
                        </div>
                        {getTargetAssigneeWorkload() && (
                          <>
                            <div>Current workload: {getTargetAssigneeWorkload()!.activeTaskCount} tasks</div>
                            <div className="font-medium text-warning">
                              New total: {getTargetAssigneeWorkload()!.activeTaskCount + getSelectedTasksEstimate().count} tasks
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Task Status */}
      <Card>
        <CardHeader>
          <CardTitle>Live Task Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {liveUpdates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No recent activity.
              </div>
            ) : (
              liveUpdates.map((update) => {
                const getIcon = () => {
                  switch (update.type) {
                    case "start":
                      return <Clock className="h-4 w-4 text-blue-500" />;
                    case "complete":
                      return <UserCheck className="h-4 w-4 text-success" />;
                    case "assign":
                      return <Users className="h-4 w-4 text-primary" />;
                    default:
                      return <Clock className="h-4 w-4 text-muted-foreground" />;
                  }
                };

                return (
                  <div 
                    key={update.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`live-update-${update.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center">
                        {getIcon()}
                      </div>
                      <div>
                        <p className="font-medium text-sm" data-testid="update-message">
                          {update.message}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid="update-timestamp">
                          {update.timestamp}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <StatusChip status={update.status} />
                      <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="view-details">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {raWorkload.reduce((sum, ra) => sum + ra.activeTaskCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Active Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">
                {raWorkload.reduce((sum, ra) => sum + ra.completedToday, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Completed Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">
                {Math.round(raWorkload.reduce((sum, ra) => sum + ra.efficiency, 0) / raWorkload.length)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Efficiency</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">
                {roomAttendants.length}
              </div>
              <div className="text-sm text-muted-foreground">Team Members</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
