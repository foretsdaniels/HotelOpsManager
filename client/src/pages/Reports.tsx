import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Clock, 
  ClipboardCheck, 
  BarChart3, 
  Download, 
  Calendar,
  User,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface ReportData {
  userId?: string;
  name: string;
  initials: string;
  taskType: string;
  avgTime: number;
  tasksCompleted: number;
  efficiency: number;
  trend: number;
}

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("7");
  const [selectedReport, setSelectedReport] = useState("ra-times");
  const [filterBy, setFilterBy] = useState("date");
  const [filterValue, setFilterValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: raTimeData = [], isLoading: loadingRATime } = useQuery({
    queryKey: ["/api/reports/ra-average-times", { 
      dateFrom: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
      dateTo: new Date().toISOString()
    }],
    enabled: selectedReport === "ra-times",
  });

  const { data: inspectionData, isLoading: loadingInspections } = useQuery({
    queryKey: ["/api/reports/inspections", {
      dateFrom: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
      dateTo: new Date().toISOString()
    }],
    enabled: selectedReport === "inspections",
  });

  const { data: productivityData = [], isLoading: loadingProductivity } = useQuery({
    queryKey: ["/api/reports/square-foot", {
      dateFrom: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
      dateTo: new Date().toISOString()
    }],
    enabled: selectedReport === "productivity",
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      let data: any[] = [];
      let filename = "report";
      
      switch (selectedReport) {
        case "ra-times":
          data = raTimeData;
          filename = "ra-average-times";
          break;
        case "inspections":
          data = inspectionData ? [inspectionData] : [];
          filename = "inspection-summary";
          break;
        case "productivity":
          data = productivityData;
          filename = "productivity-metrics";
          break;
      }
      
      return { data, filename };
    },
    onSuccess: ({ data, filename }) => {
      // Convert to CSV
      if (data.length === 0) {
        toast({
          title: "No Data",
          description: "No data available to export.",
          variant: "destructive",
        });
        return;
      }
      
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map(row => Object.values(row).join(","));
      const csv = [headers, ...rows].join("\n");
      
      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `${filename} report has been downloaded.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Transform RA time data for display
  const raTimeReportData: ReportData[] = raTimeData.map((item: any) => {
    const userData = users.find((u: any) => u.id === item.userId);
    return {
      userId: item.userId,
      name: userData?.name || "Unknown User",
      initials: userData?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "??",
      taskType: item.taskType || "Unknown",
      avgTime: item.avgTime || 0,
      tasksCompleted: item.count || 0,
      efficiency: Math.round(Math.random() * 20 + 80), // Mock efficiency calculation
      trend: Math.round((Math.random() - 0.5) * 20), // Mock trend data
    };
  });

  // Filter and paginate data
  const filteredData = raTimeReportData.filter((item) => {
    if (!filterValue) return true;
    
    switch (filterBy) {
      case "user":
        return item.name.toLowerCase().includes(filterValue.toLowerCase());
      case "taskType":
        return item.taskType.toLowerCase().includes(filterValue.toLowerCase());
      default:
        return true;
    }
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-success" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-success";
    if (trend < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const canAccessReports = user?.role && ["site_admin", "head_housekeeper", "front_desk_manager"].includes(user.role);

  if (!canAccessReports) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              You don't have permission to access reports.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40" data-testid="date-range-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            data-testid="export-report"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className={`cursor-pointer transition-shadow hover:shadow-md ${
            selectedReport === "ra-times" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setSelectedReport("ra-times")}
          data-testid="ra-times-card"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">RA Average Times</h3>
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cleaning Tasks</span>
                <span className="font-medium">42 min avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Maintenance</span>
                <span className="font-medium">1h 15m avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Inspections</span>
                <span className="font-medium">28 min avg</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center text-sm text-success">
                <ArrowUp className="h-3 w-3 mr-1" />
                <span>8% improvement</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-shadow hover:shadow-md ${
            selectedReport === "inspections" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setSelectedReport("inspections")}
          data-testid="inspections-card"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Inspection Summary</h3>
              <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4 text-success" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Inspections</span>
                <span className="font-medium">{inspectionData?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pass Rate</span>
                <span className="font-medium text-success">
                  {inspectionData?.passRate ? `${inspectionData.passRate.toFixed(1)}%` : "0%"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="font-medium text-destructive">{inspectionData?.failed || 0}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center text-sm text-success">
                <ArrowUp className="h-3 w-3 mr-1" />
                <span>2.1% improvement</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-shadow hover:shadow-md ${
            selectedReport === "productivity" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setSelectedReport("productivity")}
          data-testid="productivity-card"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Square-Foot Productivity</h3>
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Sq Ft</span>
                <span className="font-medium">
                  {productivityData.reduce((sum: number, item: any) => sum + (item.totalSquareFeet || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Average</span>
                <span className="font-medium">
                  {Math.round(productivityData.reduce((sum: number, item: any) => sum + (item.totalSquareFeet || 0), 0) / parseInt(dateRange)).toLocaleString()} sq ft
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Per Staff</span>
                <span className="font-medium">
                  {productivityData.length > 0 
                    ? Math.round(productivityData.reduce((sum: number, item: any) => sum + (item.totalSquareFeet || 0), 0) / productivityData.length).toLocaleString()
                    : 0} sq ft
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center text-sm text-warning">
                <ArrowDown className="h-3 w-3 mr-1" />
                <span>3% decrease</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report View */}
      {selectedReport === "ra-times" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>RA Average Times - Detailed View</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant={filterBy === "user" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBy("user")}
                  data-testid="filter-by-user"
                >
                  <User className="h-4 w-4 mr-1" />
                  By User
                </Button>
                <Button
                  variant={filterBy === "taskType" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBy("taskType")}
                  data-testid="filter-by-task-type"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  By Type
                </Button>
                <Button
                  variant={filterBy === "date" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBy("date")}
                  data-testid="filter-by-date"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  By Date
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Input */}
            {filterBy !== "date" && (
              <div className="mb-6">
                <Label htmlFor="filter">Filter {filterBy === "user" ? "Users" : "Task Types"}</Label>
                <Input
                  id="filter"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={`Filter by ${filterBy === "user" ? "user name" : "task type"}...`}
                  className="max-w-xs"
                  data-testid="filter-input"
                />
              </div>
            )}

            {/* Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="report-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Staff Member</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Task Type</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Avg Time</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tasks Completed</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Efficiency</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRATime ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Loading report data...
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No data available for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, index) => (
                      <tr key={`${row.userId}-${row.taskType}`} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">{row.initials}</span>
                            </div>
                            <span data-testid={`user-name-${index}`}>{row.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2" data-testid={`task-type-${index}`}>
                          {row.taskType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="py-3 px-2" data-testid={`avg-time-${index}`}>
                          {formatTime(row.avgTime)}
                        </td>
                        <td className="py-3 px-2" data-testid={`tasks-completed-${index}`}>
                          {row.tasksCompleted}
                        </td>
                        <td className="py-3 px-2">
                          <Badge 
                            variant={row.efficiency >= 90 ? "default" : row.efficiency >= 70 ? "secondary" : "destructive"}
                            data-testid={`efficiency-${index}`}
                          >
                            {row.efficiency}%
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className={`flex items-center ${getTrendColor(row.trend)}`}>
                            {getTrendIcon(row.trend)}
                            <span className="text-sm ml-1" data-testid={`trend-${index}`}>
                              {row.trend > 0 ? "+" : ""}{row.trend}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    data-testid="previous-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => setCurrentPage(page)}
                          data-testid={`page-${page}`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inspection Report */}
      {selectedReport === "inspections" && inspectionData && (
        <Card>
          <CardHeader>
            <CardTitle>Inspection Summary Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{inspectionData.total}</div>
                <div className="text-sm text-muted-foreground">Total Inspections</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">{inspectionData.passed}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive">{inspectionData.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning">{inspectionData.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl font-bold text-success">
                  {inspectionData.passRate ? inspectionData.passRate.toFixed(1) : 0}%
                </div>
                <div className="text-lg text-muted-foreground">Overall Pass Rate</div>
                <div className="text-sm text-muted-foreground mt-2">
                  For the selected {dateRange}-day period
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productivity Report */}
      {selectedReport === "productivity" && (
        <Card>
          <CardHeader>
            <CardTitle>Productivity Metrics Report</CardTitle>
          </CardHeader>
          <CardContent>
            {productivityData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No productivity data available for the selected period.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {productivityData.reduce((sum: number, item: any) => sum + (item.totalSquareFeet || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Square Feet</div>
                  </div>
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-success">
                      {productivityData.reduce((sum: number, item: any) => sum + (item.taskCount || 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Tasks</div>
                  </div>
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-accent">
                      {productivityData.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Staff</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Staff Member</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Square Feet</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tasks</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Avg per Task</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productivityData.map((item: any, index: number) => {
                        const userData = users.find((u: any) => u.id === item.userId);
                        const avgPerTask = item.taskCount > 0 ? Math.round(item.totalSquareFeet / item.taskCount) : 0;
                        
                        return (
                          <tr key={item.userId || index} className="border-b border-border hover:bg-muted/50">
                            <td className="py-3 px-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-primary">
                                    {userData?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "??"}
                                  </span>
                                </div>
                                <span>{userData?.name || "Unknown User"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2">{(item.totalSquareFeet || 0).toLocaleString()} sq ft</td>
                            <td className="py-3 px-2">{item.taskCount || 0}</td>
                            <td className="py-3 px-2">{avgPerTask.toLocaleString()} sq ft</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
