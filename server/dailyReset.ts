import { storage } from "./storage";
import type { Room } from "@shared/schema";

interface DailyResetReport {
  date: string;
  roomStatuses: Array<{
    roomId: string;
    roomNumber: string;
    finalStatus: string;
    assignedUser?: string;
    completedTasks: number;
    openComments: number;
  }>;
  tasksSummary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  };
  workOrdersSummary: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    pendingWorkOrders: number;
  };
  roomMetrics: {
    totalRooms: number;
    readyRooms: number;
    rollRooms: number;
    outRooms: number;
    cleanInspectedRooms: number;
    dirtyRooms: number;
    maintenanceRooms: number;
    outOfOrderRooms: number;
  };
  resetTime: Date;
}

export class DailyResetService {
  private static instance: DailyResetService;
  private resetTimer: NodeJS.Timeout | null = null;
  private lastResetDate: string | null = null;

  private constructor() {
    this.scheduleNextReset();
  }

  public static getInstance(): DailyResetService {
    if (!DailyResetService.instance) {
      DailyResetService.instance = new DailyResetService();
    }
    return DailyResetService.instance;
  }

  private scheduleNextReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Midnight

    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    console.log(`[DailyReset] Next reset scheduled for: ${tomorrow.toISOString()}`);

    this.resetTimer = setTimeout(() => {
      this.performDailyReset();
    }, timeUntilMidnight);
  }

  public async performDailyReset(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if reset was already performed today
      if (this.lastResetDate === today) {
        console.log(`[DailyReset] Reset already performed today (${today})`);
        return;
      }

      console.log(`[DailyReset] Starting daily reset for ${today}`);

      // Generate and save daily report
      const report = await this.generateDailyReport(today);
      await this.saveDailyReport(report);

      // Perform room status reset
      await this.resetRoomStatuses();

      // Clean up old completed tasks
      await this.cleanupCompletedTasks();

      // Update last reset date
      this.lastResetDate = today;

      console.log(`[DailyReset] Daily reset completed successfully for ${today}`);

    } catch (error) {
      console.error(`[DailyReset] Error during daily reset:`, error);
    } finally {
      // Schedule the next reset
      this.scheduleNextReset();
    }
  }

  private async generateDailyReport(date: string): Promise<DailyResetReport> {
    console.log(`[DailyReset] Generating daily report for ${date}`);

    // Get all current data
    const rooms = await storage.listRooms();
    const tasks = await storage.listTasks();
    const workOrders = await storage.listWorkOrders();
    const users = await storage.listUsers();
    const roomComments = await storage.listRoomComments();

    // Create user lookup
    const userMap = users.reduce((acc: any, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    // Generate room status summary
    const roomStatuses = rooms.map((room: Room) => {
      const roomTasks = tasks.filter(task => 
        task.roomId === room.id && !task.isDeleted
      );
      
      const activeTask = roomTasks.find(task => 
        task.status === "in_progress" || task.status === "pending"
      );
      
      const completedTasks = roomTasks.filter(task => 
        task.status === "completed"
      ).length;

      const openComments = roomComments.filter(comment => 
        comment.roomId === room.id && !comment.isResolved
      ).length;

      const assignedUser = activeTask && userMap[activeTask.assigneeId || ''];

      return {
        roomId: room.id,
        roomNumber: room.number,
        finalStatus: room.status || 'dirty',
        assignedUser: assignedUser?.name,
        completedTasks,
        openComments,
      };
    });

    // Generate task summary
    const tasksSummary = {
      totalTasks: tasks.filter(task => !task.isDeleted).length,
      completedTasks: tasks.filter(task => task.status === "completed" && !task.isDeleted).length,
      pendingTasks: tasks.filter(task => 
        (task.status === "pending" || task.status === "in_progress") && !task.isDeleted
      ).length,
    };

    // Generate work order summary
    const workOrdersSummary = {
      totalWorkOrders: workOrders.length,
      completedWorkOrders: workOrders.filter(wo => wo.status === "completed").length,
      pendingWorkOrders: workOrders.filter(wo => 
        wo.status === "pending" || wo.status === "in_progress"
      ).length,
    };

    // Generate room metrics
    const roomMetrics = {
      totalRooms: rooms.length,
      readyRooms: rooms.filter(r => r.status === "ready").length,
      rollRooms: rooms.filter(r => r.status === "roll").length,
      outRooms: rooms.filter(r => r.status === "out").length,
      cleanInspectedRooms: rooms.filter(r => r.status === "clean_inspected").length,
      dirtyRooms: rooms.filter(r => r.status === "dirty").length,
      maintenanceRooms: rooms.filter(r => r.status === "maintenance").length,
      outOfOrderRooms: rooms.filter(r => r.status === "out_of_order").length,
    };

    return {
      date,
      roomStatuses,
      tasksSummary,
      workOrdersSummary,
      roomMetrics,
      resetTime: new Date(),
    };
  }

  private async saveDailyReport(report: DailyResetReport): Promise<void> {
    console.log(`[DailyReset] Saving daily report for ${report.date}`);

    try {
      await storage.createReportRun({
        type: "daily_reset",
        params: { date: report.date },
        results: report,
      });

      console.log(`[DailyReset] Daily report saved successfully`);
    } catch (error) {
      console.error(`[DailyReset] Error saving daily report:`, error);
      throw error;
    }
  }

  private async resetRoomStatuses(): Promise<void> {
    console.log(`[DailyReset] Resetting room statuses`);

    try {
      const rooms = await storage.listRooms();
      
      for (const room of rooms) {
        // Reset room status based on previous day's final status
        let newStatus = "dirty"; // Default status for new day
        
        // Logic for status reset:
        // - Clean & Inspected -> Dirty (guests will check in)
        // - READY -> Dirty (guests will check in) 
        // - ROLL -> ROLL (rollover rooms stay rolled)
        // - OUT -> OUT (out of order rooms stay out)
        // - Maintenance -> Maintenance (maintenance rooms stay in maintenance)
        // - Out of Order -> Out of Order (stay out of order)
        
        switch (room.status) {
          case "roll":
            newStatus = "roll";
            break;
          case "out":
            newStatus = "out"; 
            break;
          case "maintenance":
            newStatus = "maintenance";
            break;
          case "out_of_order":
            newStatus = "out_of_order";
            break;
          default:
            newStatus = "dirty"; // Reset all others to dirty for new day
        }

        if (room.status !== newStatus) {
          await storage.updateRoom(room.id, { 
            status: newStatus as "dirty" | "clean" | "out_of_order" | "maintenance" | "ready" | "roll" | "out" | "clean_inspected",
            updatedAt: new Date()
          });

          // Create a system comment for the reset
          await storage.createRoomComment({
            roomId: room.id,
            userId: "system", // System user for automated actions
            comment: `Daily reset: Status changed from ${room.status?.toUpperCase()} to ${newStatus.toUpperCase()}`,
            priority: "low",
            isResolved: false,
          });
        }
      }

      console.log(`[DailyReset] Room statuses reset completed`);
    } catch (error) {
      console.error(`[DailyReset] Error resetting room statuses:`, error);
      throw error;
    }
  }

  private async cleanupCompletedTasks(): Promise<void> {
    console.log(`[DailyReset] Cleaning up completed tasks`);

    try {
      const tasks = await storage.listTasks();
      const completedTasks = tasks.filter(task => 
        task.status === "completed" && !task.isDeleted
      );

      // Mark completed tasks as deleted (soft delete for historical data)
      for (const task of completedTasks) {
        await storage.updateTask(task.id, {
          isDeleted: true,
          updatedAt: new Date(),
        });
      }

      console.log(`[DailyReset] Cleaned up ${completedTasks.length} completed tasks`);
    } catch (error) {
      console.error(`[DailyReset] Error cleaning up tasks:`, error);
      throw error;
    }
  }

  // Manual reset trigger (for testing or manual operations)
  public async triggerManualReset(): Promise<DailyResetReport> {
    const today = new Date().toISOString().split('T')[0];
    const report = await this.generateDailyReport(today);
    await this.saveDailyReport(report);
    await this.resetRoomStatuses();
    await this.cleanupCompletedTasks();
    
    console.log(`[DailyReset] Manual reset completed for ${today}`);
    return report;
  }

  // Get the last reset report
  public async getLastResetReport(): Promise<DailyResetReport | null> {
    try {
      const reports = await storage.listReportRuns();
      const resetReports = reports.filter(report => report.type === "daily_reset");
      
      if (resetReports.length === 0) return null;
      
      // Sort by creation date and get the most recent
      const lastReport = resetReports.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];
      
      return lastReport.results as DailyResetReport;
    } catch (error) {
      console.error(`[DailyReset] Error retrieving last reset report:`, error);
      return null;
    }
  }

  public cleanup(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}

// Export singleton instance
export const dailyResetService = DailyResetService.getInstance();