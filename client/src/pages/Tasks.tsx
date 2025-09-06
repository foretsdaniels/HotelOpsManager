import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TaskCard from "@/components/TaskCard";
import { Search, Filter, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, User, Room } from "@shared/schema";

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateTask, setShowCreateTask] = useState(false);
  const { toast } = useToast();
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    type: "other" as const,
    priority: "medium" as const,
    assigneeIds: [] as string[],
    roomId: "",
  });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { 
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      includeDeleted: false 
    }],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  // Create lookup maps for performance
  const userMap = users.reduce((acc: any, user: any) => {
    acc[user.id] = user.name;
    return acc;
  }, {});

  const roomMap = rooms.reduce((acc: any, room: any) => {
    acc[room.id] = room.number;
    return acc;
  }, {});

  // Filter tasks based on search query
  const filteredTasks = tasks.filter((task: any) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      userMap[task.assigneeId]?.toLowerCase().includes(searchLower) ||
      roomMap[task.roomId]?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-16 bg-muted rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="tasks-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Special Tasks</h1>
          <p className="text-muted-foreground">
            Manage one-time, non-recurring special tasks outside normal room operations
          </p>
        </div>
        <Button 
          data-testid="create-task-button"
          onClick={() => setShowCreateTask(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Special Task
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 lg:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-tasks"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cleaning">Special Cleaning</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="setup">Setup/Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                data-testid="apply-filters"
                onClick={() => {
                  // Filters are already applied via state changes
                  toast({
                    title: "Filters Applied",
                    description: "Tasks have been filtered based on your selection.",
                  });
                }}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all" 
                  ? "No tasks match your current filters." 
                  : "No tasks available."}
              </div>
              <Button 
                className="mt-4" 
                data-testid="create-first-task"
                onClick={() => setShowCreateTask(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Special Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              assigneeName={userMap[task.assigneeId]}
              roomNumber={roomMap[task.roomId]}
            />
          ))
        )}
      </div>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {tasks.filter((t: any) => t.status === "pending").length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter((t: any) => t.status === "in_progress").length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter((t: any) => t.status === "completed").length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {tasks.filter((t: any) => t.status === "paused").length}
              </div>
              <div className="text-sm text-muted-foreground">Paused</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Special Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="task-type">Type</Label>
              <Select value={newTask.type} onValueChange={(value: any) => setNewTask({ ...newTask, type: value })}>
                <SelectTrigger id="task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">Special Cleaning</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="setup">Setup/Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                <SelectTrigger id="task-priority">
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
            <div>
              <Label htmlFor="task-assignees">Assign To (Multiple Selection)</Label>
              <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                {users.map((user: User) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`assignee-${user.id}`}
                      checked={newTask.assigneeIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewTask({ ...newTask, assigneeIds: [...newTask.assigneeIds, user.id] });
                        } else {
                          setNewTask({ ...newTask, assigneeIds: newTask.assigneeIds.filter(id => id !== user.id) });
                        }
                      }}
                      className="h-4 w-4"
                      data-testid={`assignee-checkbox-${user.id}`}
                    />
                    <Label htmlFor={`assignee-${user.id}`} className="text-sm cursor-pointer">
                      {user.name} - {user.role}
                    </Label>
                  </div>
                ))}
              </div>
              {newTask.assigneeIds.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {newTask.assigneeIds.length} user(s) selected
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="task-room">Room (Optional)</Label>
              <Select value={newTask.roomId} onValueChange={(value) => setNewTask({ ...newTask, roomId: value })}>
                <SelectTrigger id="task-room">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Room</SelectItem>
                  {rooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateTask(false)}>
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (!newTask.title) {
                    toast({
                      title: "Title Required",
                      description: "Please enter a task title.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  try {
                    // Create a task for each assignee (or one unassigned task if no assignees)
                    if (newTask.assigneeIds.length === 0) {
                      await apiRequest("POST", "/api/tasks", {
                        title: newTask.title,
                        description: newTask.description,
                        type: newTask.type,
                        priority: newTask.priority,
                        assigneeId: undefined,
                        roomId: newTask.roomId || undefined,
                      });
                    } else {
                      // Create multiple tasks, one for each assignee
                      await Promise.all(
                        newTask.assigneeIds.map((assigneeId) =>
                          apiRequest("POST", "/api/tasks", {
                            title: newTask.title,
                            description: newTask.description,
                            type: newTask.type,
                            priority: newTask.priority,
                            assigneeId,
                            roomId: newTask.roomId || undefined,
                          })
                        )
                      );
                    }
                    
                    toast({
                      title: "Task Created",
                      description: "The special task has been created successfully.",
                    });
                    
                    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                    setShowCreateTask(false);
                    setNewTask({
                      title: "",
                      description: "",
                      type: "other" as const,
                      priority: "medium" as const,
                      assigneeIds: [],
                      roomId: "",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to create task. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
