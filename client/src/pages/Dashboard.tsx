import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusChip from "@/components/StatusChip";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import { QuickStatusButtons } from "@/components/QuickStatusButtons";
import { apiRequest } from "@/services/api";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckSquare, 
  Wrench, 
  CalendarCheck, 
  ClipboardCheck,
  Plus,
  ClipboardList,
  Settings,
  Search,
  BarChart3,
  UserPlus,
  Check,
  AlertTriangle,
  Clock
} from "lucide-react";
import { ActivityItem } from "@/types";

export default function Dashboard() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { isConnected: wsConnected, subscribe } = useWebSocket();
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: inspections = [] } = useQuery<any[]>({
    queryKey: ["/api/inspections"],
  });

  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ["/api/rooms"],
  });

  // Subscribe to WebSocket updates for real-time dashboard updates
  useEffect(() => {
    const unsubscribeTask = subscribe('task_assigned', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    });
    
    const unsubscribeTaskCompleted = subscribe('task_completed', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    });
    
    const unsubscribeInspection = subscribe('inspection_completed', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
    });
    
    const unsubscribeRoomStatus = subscribe('room_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
    });

    return () => {
      unsubscribeTask();
      unsubscribeTaskCompleted();
      unsubscribeInspection();
      unsubscribeRoomStatus();
    };
  }, [subscribe]);

  // Calculate KPI metrics - count special tasks only (not cleaning assignments)
  const myTasks = tasks.filter((task: any) => 
    task.status !== "completed" && 
    !task.isDeleted && 
    task.type !== "cleaning"
  ).length;
  const inspectionsPending = inspections.filter((inspection: any) => !inspection.signedAt).length;

  // Get recent activity from tasks and inspections
  const recentActivity: ActivityItem[] = [];
  
  // Add recent tasks to activity
  tasks.slice(0, 5).forEach((task: any) => {
    if (!task || !task.id) return;
    
    const taskDate = new Date(task.updatedAt || task.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - taskDate.getTime()) / 60000);
    let timestamp = "just now";
    if (diffMinutes > 0) {
      if (diffMinutes < 60) {
        timestamp = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        timestamp = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffMinutes / 1440);
        timestamp = `${days} day${days > 1 ? 's' : ''} ago`;
      }
    }
    
    const taskStatus = task.status || 'pending';
    recentActivity.push({
      id: task.id,
      description: taskStatus === 'completed' 
        ? `${task.title} completed`
        : taskStatus === 'in_progress'
        ? `${task.title} in progress`
        : `${task.title} created`,
      timestamp,
      status: taskStatus,
      type: "task",
    });
  });
  
  // Add recent inspections to activity
  inspections.slice(0, 3).forEach((inspection: any) => {
    if (!inspection || !inspection.id) return;
    
    const inspectionDate = new Date(inspection.updatedAt || inspection.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - inspectionDate.getTime()) / 60000);
    let timestamp = "just now";
    if (diffMinutes > 0) {
      if (diffMinutes < 60) {
        timestamp = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        timestamp = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffMinutes / 1440);
        timestamp = `${days} day${days > 1 ? 's' : ''} ago`;
      }
    }
    
    recentActivity.push({
      id: inspection.id,
      description: inspection.signedAt
        ? `${inspection.kind} inspection completed`
        : `${inspection.kind} inspection pending`,
      timestamp,
      status: inspection.signedAt ? "completed" : "pending",
      type: "inspection",
    });
  });
  
  // Sort by most recent and take top 5
  recentActivity.sort((a, b) => {
    const aMinutes = parseInt(a.timestamp) || 0;
    const bMinutes = parseInt(b.timestamp) || 0;
    return aMinutes - bMinutes;
  });

  const getActivityIcon = (type: string, status: string) => {
    if (status === "completed") {
      return <Check className="h-4 w-4 text-success" />;
    }
    
    switch (type) {
      case "inspection":
        return <ClipboardCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckSquare className="h-4 w-4 text-primary" />;
    }
  };

  const quickActions = [
    { icon: Plus, label: "New Task", action: "/tasks", href: "/tasks" },
    { icon: ClipboardList, label: "Inspection", action: "/inspections", href: "/inspections" },
    { icon: Search, label: "Room Status", action: "/room-status", href: "/room-status" },
    { icon: BarChart3, label: "Reports", action: "/reports", href: "/reports" },
    { icon: UserPlus, label: "RA Monitor", action: "/ra-monitor", href: "/ra-monitor" },
  ];

  return (
    <div className="p-4 space-y-6" data-testid="dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <KPICard
          title="My Tasks"
          value={myTasks}
          icon={CheckSquare}
          trend={{ value: "2", direction: "up", label: "since yesterday" }}
        />
        <KPICard
          title="Inspections"
          value={inspectionsPending}
          icon={ClipboardCheck}
          trend={{ value: "", direction: "neutral", label: "Pending review" }}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.action}
                  variant="outline"
                  className="touch-target flex flex-col items-center justify-center p-4 h-auto hover:bg-muted/80"
                  data-testid={`quick-action-${action.action}`}
                  onClick={() => navigate(action.href)}
                >
                  <Icon className="h-5 w-5 text-primary mb-2" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Room Status Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Room Status Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rooms.slice(0, 3).map((room: any) => (
              <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Room {room.number}</span>
                  <StatusChip status={room.status} />
                </div>
                <QuickStatusButtons
                  currentStatus={room.status}
                  onStatusChange={async (status) => {
                    try {
                      await apiRequest("PATCH", `/api/rooms/${room.id}/status`, { status });
                      toast({ 
                        title: "Room status updated!", 
                        description: `Room ${room.number} is now ${status}.`,
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
                    } catch (error: any) {
                      toast({ 
                        title: "Failed to update status", 
                        description: error.message,
                        variant: "destructive" 
                      });
                    }
                  }}
                  size="sm"
                  showLabels={false}
                />
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/room-status")}
            >
              View All Rooms →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activity Log</CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg"
                data-testid={`activity-${activity.id}`}
              >
                <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="activity-description">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="activity-timestamp">
                    {activity.timestamp}
                  </p>
                </div>
                <StatusChip status={activity.status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
