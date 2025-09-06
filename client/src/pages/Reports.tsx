import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  Users, 
  Home,
  ClipboardCheck,
  Clock,
  Activity
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("7");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Fetch reporting data
  const { data: reportData, isLoading } = useQuery({
    queryKey: [`/api/reports/overview?days=${dateRange}&department=${selectedDepartment}`],
  });

  const { data: roomStatusData } = useQuery({
    queryKey: [`/api/reports/room-status`],
  });

  const { data: productivityData } = useQuery({
    queryKey: [`/api/reports/productivity?days=${dateRange}`],
  });

  const { data: inspectionData } = useQuery({
    queryKey: [`/api/reports/inspections?days=${dateRange}`],
  });

  const { data: taskTrendsData } = useQuery({
    queryKey: [`/api/reports/task-trends?days=${dateRange}`],
  });

  if (!user || !["site_admin", "head_housekeeper", "front_desk_manager"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">You don't have permission to view reports.</p>
        </div>
      </div>
    );
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">Operational insights and performance metrics</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40" data-testid="date-range-select">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics Cards */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rooms</p>
                    <p className="text-2xl font-bold">{reportData.totalRooms || 0}</p>
                  </div>
                  <Home className="h-8 w-8 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks Completed</p>
                    <p className="text-2xl font-bold">{reportData.tasksCompleted || 0}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {reportData.completionRate || 0}% completion rate
                    </p>
                  </div>
                  <ClipboardCheck className="h-8 w-8 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Cleaning Time</p>
                    <p className="text-2xl font-bold">{reportData.avgCleaningTime || 0}m</p>
                    <p className="text-xs text-muted-foreground mt-1">per room</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Staff</p>
                    <p className="text-2xl font-bold">{reportData.activeStaff || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">room attendants</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Room Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Room Status Distribution
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(roomStatusData || [], 'room_status')}
                      data-testid="export-room-status"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {roomStatusData && roomStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={roomStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({name, value, percent}) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {roomStatusData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No room status data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Daily Task Completion */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Task Completion Rate
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(taskTrendsData || [], 'task_completion')}
                      data-testid="export-task-completion"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {taskTrendsData && taskTrendsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={taskTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="completed" 
                          stackId="1"
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.6}
                          name="Completed"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="pending" 
                          stackId="1"
                          stroke="#f59e0b" 
                          fill="#f59e0b" 
                          fillOpacity={0.6}
                          name="Pending"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No task data available for selected period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="productivity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Room Attendant Productivity
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => exportToCSV(productivityData || [], 'productivity')}
                    data-testid="export-productivity"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productivityData && productivityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={productivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="roomsCleaned" fill="#3b82f6" name="Rooms Cleaned" />
                      <Bar dataKey="avgTime" fill="#10b981" name="Avg Time (min)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No productivity data available for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Inspection Results
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => exportToCSV(inspectionData || [], 'inspections')}
                    data-testid="export-inspections"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inspectionData && inspectionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={inspectionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="passed" fill="#10b981" name="Passed" />
                      <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No inspection data available for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Operational Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {taskTrendsData && taskTrendsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={taskTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#3b82f6" 
                        name="Total Tasks"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="#10b981" 
                        name="Completed"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgTime" 
                        stroke="#f59e0b" 
                        name="Avg Time (min)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No trend data available for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}