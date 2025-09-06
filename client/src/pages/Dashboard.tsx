import { useQuery } from "@tanstack/react-query";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusChip from "@/components/StatusChip";
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
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: inspections = [] } = useQuery<any[]>({
    queryKey: ["/api/inspections"],
  });

  // Calculate KPI metrics
  const myTasks = tasks.filter((task: any) => task.status !== "completed").length;
  const inspectionsPending = inspections.filter((inspection: any) => !inspection.signedAt).length;

  // Mock recent activity data
  const recentActivity: ActivityItem[] = [
    {
      id: "1",
      description: "Room 201 cleaning completed by Sarah M.",
      timestamp: "2 minutes ago",
      status: "completed",
      type: "task",
    },
    {
      id: "2", 
      description: "New special task created for banquet hall setup",
      timestamp: "15 minutes ago",
      status: "pending",
      type: "task",
    },
    {
      id: "3",
      description: "Room inspection started for Room 412",
      timestamp: "32 minutes ago", 
      status: "in_progress",
      type: "inspection",
    },
  ];

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
    { icon: Plus, label: "New Task", action: "createTask" },
    { icon: ClipboardList, label: "Inspection", action: "createInspection" },
    { icon: Search, label: "Lost Item", action: "reportLostItem" },
    { icon: BarChart3, label: "Reports", action: "viewReports" },
    { icon: UserPlus, label: "RA Monitor", action: "raMonitor" },
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
                >
                  <Icon className="h-5 w-5 text-primary mb-2" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
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
