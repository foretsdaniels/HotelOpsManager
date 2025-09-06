export interface KPIMetrics {
  myTasks: number;
  openWOs: number;
  upcomingPMs: number;
  inspectionsPending: number;
}

export interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'in_progress' | 'failed';
  type: 'task' | 'inspection' | 'workorder' | 'maintenance';
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  passed?: boolean;
  notes?: string;
  photos?: string[];
}

export interface WorkOrderCard {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assignee?: string;
  dueDate?: string;
  room?: string;
}

export interface RAData {
  id: string;
  name: string;
  initials: string;
  shift: string;
  activeTaskCount: number;
  completedToday: number;
  avgTime: string;
  efficiency: number;
}

export interface TaskUpdate {
  id: string;
  message: string;
  timestamp: string;
  status: string;
  type: 'start' | 'complete' | 'pause' | 'assign';
}

export interface ReportData {
  name: string;
  initials: string;
  taskType: string;
  avgTime: string;
  tasksCompleted: number;
  efficiency: string;
  trend: number;
}
