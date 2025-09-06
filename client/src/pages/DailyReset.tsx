import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Clock, 
  RefreshCw, 
  Calendar,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Home,
  Users,
  ClipboardList,
  TrendingUp,
  Settings
} from "lucide-react";
import { format } from "date-fns";

export default function DailyReset() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const { data: lastReport, isLoading: loadingReport, refetch } = useQuery({
    queryKey: ["/api/daily-reset/last-report"],
    refetchOnWindowFocus: false,
  });

  const manualResetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/daily-reset/manual"),
    onSuccess: () => {
      toast({ title: "Daily reset completed successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reset/last-report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      refetch();
      setShowConfirmReset(false);
    },
    onError: () => {
      toast({ title: "Failed to perform daily reset", variant: "destructive" });
    },
  });

  // Only allow site_admin to access this page
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
    <div className="p-4 space-y-6" data-testid="daily-reset-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Daily Reset Management
          </h1>
          <p className="text-muted-foreground">
            Automated daily operations reset and reporting system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={loadingReport}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingReport ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowConfirmReset(true)}
            disabled={manualResetMutation.isPending}
            data-testid="manual-reset-button"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manual Reset
          </Button>
        </div>
      </div>

      {/* Reset Status */}
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              Daily reset runs automatically at midnight each night. 
              {lastReport && (
                <span className="ml-2">
                  Last reset: {format(new Date(lastReport.resetTime), "MMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Manual Reset Confirmation */}
      {showConfirmReset && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p>
                <strong>Warning:</strong> Manual reset will immediately:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Save the current daily report</li>
                <li>Reset room statuses for a new day</li>
                <li>Archive completed tasks</li>
                <li>Clear daily operational data</li>
              </ul>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => manualResetMutation.mutate()}
                  disabled={manualResetMutation.isPending}
                  data-testid="confirm-manual-reset"
                >
                  {manualResetMutation.isPending ? "Processing..." : "Confirm Reset"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmReset(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Last Report */}
      {loadingReport ? (
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !lastReport ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No daily reset reports available yet.</p>
              <p className="text-sm">The first report will be generated after the next reset.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rooms">Room Status</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Report - {format(new Date(lastReport.date), "MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Rooms</p>
                          <p className="text-2xl font-bold">{lastReport.roomMetrics.totalRooms}</p>
                        </div>
                        <Home className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Clean & Inspected</p>
                          <p className="text-2xl font-bold">{lastReport.roomMetrics.cleanInspectedRooms}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Ready Rooms</p>
                          <p className="text-2xl font-bold">{lastReport.roomMetrics.readyRooms}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Tasks Completed</p>
                          <p className="text-2xl font-bold">{lastReport.tasksSummary.completedTasks}</p>
                        </div>
                        <ClipboardList className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Task Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Tasks:</span>
                          <Badge variant="outline">{lastReport.tasksSummary.totalTasks}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {lastReport.tasksSummary.completedTasks}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Pending:</span>
                          <Badge variant="outline" className="bg-amber-100 text-amber-800">
                            {lastReport.tasksSummary.pendingTasks}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Work Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Work Orders:</span>
                          <Badge variant="outline">{lastReport.workOrdersSummary.totalWorkOrders}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {lastReport.workOrdersSummary.completedWorkOrders}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Pending:</span>
                          <Badge variant="outline" className="bg-amber-100 text-amber-800">
                            {lastReport.workOrdersSummary.pendingWorkOrders}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Room Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{lastReport.roomMetrics.readyRooms}</div>
                    <div className="text-sm text-muted-foreground">READY</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-500">{lastReport.roomMetrics.rollRooms}</div>
                    <div className="text-sm text-muted-foreground">ROLL</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-500">{lastReport.roomMetrics.outRooms}</div>
                    <div className="text-sm text-muted-foreground">OUT</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{lastReport.roomMetrics.cleanInspectedRooms}</div>
                    <div className="text-sm text-muted-foreground">Clean & Inspected</div>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lastReport.roomStatuses.map((roomStatus: any) => (
                    <div key={roomStatus.roomId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Room {roomStatus.roomNumber}</span>
                        <Badge variant="outline">{roomStatus.finalStatus.replace('_', ' ').toUpperCase()}</Badge>
                        {roomStatus.assignedUser && (
                          <span className="text-sm text-muted-foreground">
                            Assigned to {roomStatus.assignedUser}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 text-sm">
                        {roomStatus.completedTasks > 0 && (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {roomStatus.completedTasks} tasks
                          </Badge>
                        )}
                        {roomStatus.openComments > 0 && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800">
                            {roomStatus.openComments} comments
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Operational Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Task Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate:</span>
                        <span className="font-medium">
                          {lastReport.tasksSummary.totalTasks > 0 
                            ? Math.round((lastReport.tasksSummary.completedTasks / lastReport.tasksSummary.totalTasks) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${lastReport.tasksSummary.totalTasks > 0 
                              ? (lastReport.tasksSummary.completedTasks / lastReport.tasksSummary.totalTasks) * 100
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Room Efficiency</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Ready + Clean:</span>
                        <span className="font-medium">
                          {lastReport.roomMetrics.readyRooms + lastReport.roomMetrics.cleanInspectedRooms} / {lastReport.roomMetrics.totalRooms}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${((lastReport.roomMetrics.readyRooms + lastReport.roomMetrics.cleanInspectedRooms) / lastReport.roomMetrics.totalRooms) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Work Order Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate:</span>
                        <span className="font-medium">
                          {lastReport.workOrdersSummary.totalWorkOrders > 0 
                            ? Math.round((lastReport.workOrdersSummary.completedWorkOrders / lastReport.workOrdersSummary.totalWorkOrders) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ 
                            width: `${lastReport.workOrdersSummary.totalWorkOrders > 0 
                              ? (lastReport.workOrdersSummary.completedWorkOrders / lastReport.workOrdersSummary.totalWorkOrders) * 100
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}