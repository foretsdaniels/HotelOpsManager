import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import StatusChip from "./StatusChip";
import { User, DoorOpen, Clock, Calendar, Play, Pause, Check, MessageCircle, Camera, Users, Trash2, Eye } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, invalidateQueries } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    type: string;
    priority?: string;
    assigneeId?: string;
    roomId?: string;
    startedAt?: string;
    finishedAt?: string;
    dueAt?: string;
    createdAt: string;
  };
  assigneeName?: string;
  roomNumber?: string;
}

export default function TaskCard({ task, assigneeName, roomNumber }: TaskCardProps) {
  const { toast } = useToast();
  const [showActions, setShowActions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tasks/${task.id}`, { isDeleted: true });
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/tasks"]);
      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/tasks"]);
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully.",
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

  const handleStatusUpdate = (newStatus: string, additionalData?: any) => {
    const updates: any = { status: newStatus };
    
    if (newStatus === "in_progress") {
      updates.startedAt = new Date().toISOString();
    } else if (newStatus === "completed") {
      updates.finishedAt = new Date().toISOString();
    } else if (newStatus === "paused") {
      updates.pausedAt = new Date().toISOString();
    }
    
    updateTaskMutation.mutate({ ...updates, ...additionalData });
  };

  const getDuration = () => {
    if (!task.startedAt) return null;
    
    const start = new Date(task.startedAt).getTime();
    const end = task.finishedAt ? new Date(task.finishedAt).getTime() : Date.now();
    const diff = end - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDueStatus = () => {
    if (!task.dueAt) return null;
    
    const due = new Date(task.dueAt).getTime();
    const now = Date.now();
    const diff = due - now;
    
    if (diff < 0) {
      const overdue = Math.abs(diff);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      return { isOverdue: true, text: `Overdue by ${hours}h` };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { isOverdue: false, text: `Due in ${hours}h ${minutes}m` };
    }
    return { isOverdue: false, text: `Due in ${minutes}m` };
  };

  const dueStatus = getDueStatus();
  const duration = getDuration();

  return (
    <>
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer" 
        data-testid={`task-card-${task.id}`}
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-foreground" data-testid="task-title">
                  {task.title}
                </h3>
                <StatusChip status={task.status} />
                {task.priority === "high" || task.priority === "urgent" && (
                  <span className="text-xs text-destructive font-medium">
                    {task.priority.toUpperCase()}
                  </span>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground" data-testid="task-description">
                  {task.description}
                </p>
              )}
            </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              className="touch-target w-8 h-8"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete this task?`)) {
                  deleteTaskMutation.mutate();
                }
              }}
              disabled={deleteTaskMutation.isPending}
              data-testid={`delete-task-${task.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            {task.status === "in_progress" && (
              <Button
                variant="ghost"
                size="icon"
                className="touch-target w-8 h-8"
                onClick={() => handleStatusUpdate("paused")}
                disabled={updateTaskMutation.isPending}
                data-testid="pause-task"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {task.status === "paused" && (
              <Button
                variant="ghost"
                size="icon"
                className="touch-target w-8 h-8"
                onClick={() => handleStatusUpdate("in_progress")}
                disabled={updateTaskMutation.isPending}
                data-testid="resume-task"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center space-x-4">
            {assigneeName && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span data-testid="task-assignee">{assigneeName}</span>
              </div>
            )}
            {roomNumber && (
              <div className="flex items-center space-x-1">
                <DoorOpen className="h-3 w-3" />
                <span data-testid="task-room">Room {roomNumber}</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span data-testid="task-duration">{duration}</span>
              </div>
            )}
          </div>
          
          {dueStatus && (
            <div className={`flex items-center space-x-1 ${dueStatus.isOverdue ? "text-destructive" : ""}`}>
              <Calendar className="h-3 w-3" />
              <span data-testid="task-due">{dueStatus.text}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {task.status === "pending" && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate("in_progress")}
                disabled={updateTaskMutation.isPending}
                data-testid="start-task"
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            
            {(task.status === "in_progress" || task.status === "paused") && (
              <Button
                size="sm"
                variant="default"
                className="bg-success text-white hover:bg-success/90"
                onClick={() => handleStatusUpdate("completed")}
                disabled={updateTaskMutation.isPending}
                data-testid="complete-task"
              >
                <Check className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              data-testid="add-note"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Note
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              data-testid="add-photo"
            >
              <Camera className="h-4 w-4 mr-1" />
              Photo
            </Button>
          </div>
          
          <Button 
            variant="outline"
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="reassign-task"
          >
            <Users className="h-4 w-4 mr-1" />
            Reassign
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Task Details Dialog */}
    <Dialog open={showDetails} onOpenChange={setShowDetails}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{task.title}</span>
            <StatusChip status={task.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">
              {task.description || "No description provided"}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Details</h4>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Type:</span> {task.type}</p>
                <p><span className="text-muted-foreground">Priority:</span> {task.priority}</p>
                <p><span className="text-muted-foreground">Status:</span> {task.status}</p>
                {assigneeName && <p><span className="text-muted-foreground">Assigned to:</span> {assigneeName}</p>}
                {roomNumber && <p><span className="text-muted-foreground">Room:</span> {roomNumber}</p>}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Timeline</h4>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Created:</span> {new Date(task.createdAt).toLocaleString()}</p>
                {task.startedAt && <p><span className="text-muted-foreground">Started:</span> {new Date(task.startedAt).toLocaleString()}</p>}
                {task.finishedAt && <p><span className="text-muted-foreground">Finished:</span> {new Date(task.finishedAt).toLocaleString()}</p>}
                {task.dueAt && <p><span className="text-muted-foreground">Due:</span> {new Date(task.dueAt).toLocaleString()}</p>}
                {duration && <p><span className="text-muted-foreground">Duration:</span> {duration}</p>}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
