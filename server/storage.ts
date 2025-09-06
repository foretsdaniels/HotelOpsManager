import { 
  type User, type InsertUser, type Room, type InsertRoom, 
  type Task, type InsertTask, type TaskPhoto, type Inspection, type InsertInspection,
  type WorkOrder, type InsertWorkOrder, type PMTemplate, type InsertPMTemplate,
  type PMInstance, type InsertPMInstance, type PanicEvent, type InsertPanicEvent,
  type LostFoundItem, type InsertLostFoundItem, type ReportRun, type InsertReportRun
} from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILES = {
  users: path.join(DATA_DIR, "users.json"),
  rooms: path.join(DATA_DIR, "rooms.json"),
  tasks: path.join(DATA_DIR, "tasks.json"),
  taskPhotos: path.join(DATA_DIR, "task-photos.json"),
  inspections: path.join(DATA_DIR, "inspections.json"),
  workOrders: path.join(DATA_DIR, "work-orders.json"),
  pmTemplates: path.join(DATA_DIR, "pm-templates.json"),
  pmInstances: path.join(DATA_DIR, "pm-instances.json"),
  panicEvents: path.join(DATA_DIR, "panic-events.json"),
  lostFoundItems: path.join(DATA_DIR, "lost-found-items.json"),
  reportRuns: path.join(DATA_DIR, "report-runs.json"),
};

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  
  // Rooms
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByNumber(number: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  listRooms(): Promise<Room[]>;
  
  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  listTasks(filters?: { status?: string; type?: string; assigneeId?: string; includeDeleted?: boolean }): Promise<Task[]>;
  softDeleteTask(id: string): Promise<Task | undefined>;
  restoreTask(id: string): Promise<Task | undefined>;
  
  // Task Photos
  createTaskPhoto(photo: { taskId: string; url: string }): Promise<TaskPhoto>;
  getTaskPhotos(taskId: string): Promise<TaskPhoto[]>;
  
  // Inspections
  getInspection(id: string): Promise<Inspection | undefined>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  listInspections(filters?: { kind?: string; roomId?: string }): Promise<Inspection[]>;
  
  // Work Orders
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | undefined>;
  listWorkOrders(filters?: { status?: string; priority?: string; assigneeId?: string }): Promise<WorkOrder[]>;
  
  // PM Templates
  getPMTemplate(id: string): Promise<PMTemplate | undefined>;
  createPMTemplate(template: InsertPMTemplate): Promise<PMTemplate>;
  listPMTemplates(): Promise<PMTemplate[]>;
  
  // PM Instances
  getPMInstance(id: string): Promise<PMInstance | undefined>;
  createPMInstance(instance: InsertPMInstance): Promise<PMInstance>;
  updatePMInstance(id: string, updates: Partial<PMInstance>): Promise<PMInstance | undefined>;
  listPMInstances(filters?: { status?: string; dueAfter?: Date; dueBefore?: Date }): Promise<PMInstance[]>;
  
  // Panic Events
  createPanicEvent(event: InsertPanicEvent): Promise<PanicEvent>;
  listPanicEvents(): Promise<PanicEvent[]>;
  
  // Lost & Found
  getLostFoundItem(id: string): Promise<LostFoundItem | undefined>;
  createLostFoundItem(item: InsertLostFoundItem): Promise<LostFoundItem>;
  updateLostFoundItem(id: string, updates: Partial<LostFoundItem>): Promise<LostFoundItem | undefined>;
  listLostFoundItems(filters?: { status?: string }): Promise<LostFoundItem[]>;
  bulkClearExpired(): Promise<number>;
  
  // Reports
  createReportRun(report: InsertReportRun): Promise<ReportRun>;
  getReportRun(id: string): Promise<ReportRun | undefined>;
  listReportRuns(): Promise<ReportRun[]>;
  
  // Analytics
  getRAAvgTimes(filters?: { userId?: string; taskType?: string; dateFrom?: Date; dateTo?: Date }): Promise<any[]>;
  getInspectionReports(filters?: { dateFrom?: Date; dateTo?: Date }): Promise<any>;
  getSquareFootMetrics(filters?: { userId?: string; dateFrom?: Date; dateTo?: Date }): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private data: {
    users: Map<string, User>;
    rooms: Map<string, Room>;
    tasks: Map<string, Task>;
    taskPhotos: Map<string, TaskPhoto>;
    inspections: Map<string, Inspection>;
    workOrders: Map<string, WorkOrder>;
    pmTemplates: Map<string, PMTemplate>;
    pmInstances: Map<string, PMInstance>;
    panicEvents: Map<string, PanicEvent>;
    lostFoundItems: Map<string, LostFoundItem>;
    reportRuns: Map<string, ReportRun>;
  };

  constructor() {
    this.data = {
      users: new Map(),
      rooms: new Map(),
      tasks: new Map(),
      taskPhotos: new Map(),
      inspections: new Map(),
      workOrders: new Map(),
      pmTemplates: new Map(),
      pmInstances: new Map(),
      panicEvents: new Map(),
      lostFoundItems: new Map(),
      reportRuns: new Map(),
    };
    this.loadData().then(() => this.seedDemoData());
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async loadData() {
    await this.ensureDataDir();
    
    for (const [key, filePath] of Object.entries(DATA_FILES)) {
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const items = JSON.parse(data);
        const map = this.data[key as keyof typeof this.data] as Map<string, any>;
        for (const item of items) {
          map.set(item.id, item);
        }
      } catch (error) {
        // File doesn't exist yet, start with empty map
      }
    }
  }

  private async saveData(type: keyof typeof this.data) {
    await this.ensureDataDir();
    const filePath = DATA_FILES[type];
    const map = this.data[type];
    const items = Array.from(map.values());
    await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  }

  private async seedDemoData() {
    // Only seed if no users exist
    if (this.data.users.size === 0) {
      const bcrypt = await import('bcryptjs');
      
      // Create demo users
      const demoUsers = [
        {
          name: "Site Administrator",
          email: "admin@hotel.com",
          role: "site_admin" as const,
          passwordHash: await bcrypt.hash("password", 12),
          phone: "+1-555-0101",
          canReceivePanicAlerts: true,
        },
        {
          name: "Sarah Johnson",
          email: "sarah@hotel.com", 
          role: "head_housekeeper" as const,
          passwordHash: await bcrypt.hash("password", 12),
          phone: "+1-555-0102",
          canReceivePanicAlerts: true,
        },
        {
          name: "Mike Wilson",
          email: "mike@hotel.com",
          role: "maintenance" as const,
          passwordHash: await bcrypt.hash("password", 12),
          phone: "+1-555-0103",
          canReceivePanicAlerts: false,
        },
        {
          name: "Lisa Chen",
          email: "lisa@hotel.com",
          role: "room_attendant" as const,
          passwordHash: await bcrypt.hash("password", 12),
          phone: "+1-555-0104",
          canReceivePanicAlerts: false,
        },
        {
          name: "David Rodriguez",
          email: "david@hotel.com",
          role: "front_desk_manager" as const,
          passwordHash: await bcrypt.hash("password", 12),
          phone: "+1-555-0105",
          canReceivePanicAlerts: true,
        }
      ];

      for (const userData of demoUsers) {
        const id = randomUUID();
        const user: User = {
          ...userData,
          id,
          phone: userData.phone,
          canReceivePanicAlerts: userData.canReceivePanicAlerts,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.data.users.set(id, user);
      }
      
      await this.saveData('users');
      console.log('Demo users seeded successfully');
      
      // Create some demo rooms
      const demoRooms = [
        { number: "101", type: "Standard", floor: 1, status: "dirty" as const, squareFootage: 320 },
        { number: "102", type: "Standard", floor: 1, status: "clean" as const, squareFootage: 320 },
        { number: "201", type: "Deluxe", floor: 2, status: "dirty" as const, squareFootage: 450 },
        { number: "202", type: "Deluxe", floor: 2, status: "maintenance" as const, squareFootage: 450 },
        { number: "301", type: "Suite", floor: 3, status: "clean" as const, squareFootage: 650 },
      ];

      for (const roomData of demoRooms) {
        const id = randomUUID();
        const room: Room = {
          ...roomData,
          id,
          floor: roomData.floor,
          status: roomData.status,
          squareFootage: roomData.squareFootage,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.data.rooms.set(id, room);
      }
      
      await this.saveData('rooms');
      console.log('Demo rooms seeded successfully');
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.data.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.data.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      phone: insertUser.phone ?? null,
      canReceivePanicAlerts: insertUser.canReceivePanicAlerts ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.users.set(id, user);
    await this.saveData('users');
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.data.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.data.users.set(id, updatedUser);
    await this.saveData('users');
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.data.users.values());
  }

  // Rooms
  async getRoom(id: string): Promise<Room | undefined> {
    return this.data.rooms.get(id);
  }

  async getRoomByNumber(number: string): Promise<Room | undefined> {
    return Array.from(this.data.rooms.values()).find(room => room.number === number);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const room: Room = {
      ...insertRoom,
      id,
      status: insertRoom.status ?? null,
      floor: insertRoom.floor ?? null,
      squareFootage: insertRoom.squareFootage ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.rooms.set(id, room);
    await this.saveData('rooms');
    return room;
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.data.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates, updatedAt: new Date() };
    this.data.rooms.set(id, updatedRoom);
    await this.saveData('rooms');
    return updatedRoom;
  }

  async listRooms(): Promise<Room[]> {
    return Array.from(this.data.rooms.values());
  }

  // Tasks
  async getTask(id: string): Promise<Task | undefined> {
    return this.data.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      description: insertTask.description ?? null,
      status: insertTask.status ?? null,
      priority: insertTask.priority ?? null,
      roomId: insertTask.roomId ?? null,
      assigneeId: insertTask.assigneeId ?? null,
      dueAt: insertTask.dueAt ?? null,
      startedAt: insertTask.startedAt ?? null,
      pausedAt: insertTask.pausedAt ?? null,
      finishedAt: insertTask.finishedAt ?? null,
      verifiedById: insertTask.verifiedById ?? null,
      notes: insertTask.notes ?? null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.tasks.set(id, task);
    await this.saveData('tasks');
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.data.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates, updatedAt: new Date() };
    this.data.tasks.set(id, updatedTask);
    await this.saveData('tasks');
    return updatedTask;
  }

  async listTasks(filters?: { status?: string; type?: string; assigneeId?: string; includeDeleted?: boolean }): Promise<Task[]> {
    let tasks = Array.from(this.data.tasks.values());
    
    if (!filters?.includeDeleted) {
      tasks = tasks.filter(task => !task.isDeleted);
    }
    
    if (filters?.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    
    if (filters?.type) {
      tasks = tasks.filter(task => task.type === filters.type);
    }
    
    if (filters?.assigneeId) {
      tasks = tasks.filter(task => task.assigneeId === filters.assigneeId);
    }
    
    return tasks;
  }

  async softDeleteTask(id: string): Promise<Task | undefined> {
    return this.updateTask(id, { isDeleted: true });
  }

  async restoreTask(id: string): Promise<Task | undefined> {
    return this.updateTask(id, { isDeleted: false });
  }

  // Task Photos
  async createTaskPhoto(photo: { taskId: string; url: string }): Promise<TaskPhoto> {
    const id = randomUUID();
    const taskPhoto: TaskPhoto = {
      ...photo,
      id,
      createdAt: new Date(),
    };
    this.data.taskPhotos.set(id, taskPhoto);
    await this.saveData('taskPhotos');
    return taskPhoto;
  }

  async getTaskPhotos(taskId: string): Promise<TaskPhoto[]> {
    return Array.from(this.data.taskPhotos.values()).filter(photo => photo.taskId === taskId);
  }

  // Inspections
  async getInspection(id: string): Promise<Inspection | undefined> {
    return this.data.inspections.get(id);
  }

  async createInspection(insertInspection: InsertInspection): Promise<Inspection> {
    const id = randomUUID();
    const inspection: Inspection = {
      ...insertInspection,
      id,
      roomId: insertInspection.roomId ?? null,
      score: insertInspection.score ?? null,
      passFail: insertInspection.passFail ?? null,
      signedAt: insertInspection.signedAt ?? null,
      createdAt: new Date(),
    };
    this.data.inspections.set(id, inspection);
    await this.saveData('inspections');
    return inspection;
  }

  async listInspections(filters?: { kind?: string; roomId?: string }): Promise<Inspection[]> {
    let inspections = Array.from(this.data.inspections.values());
    
    if (filters?.kind) {
      inspections = inspections.filter(inspection => inspection.kind === filters.kind);
    }
    
    if (filters?.roomId) {
      inspections = inspections.filter(inspection => inspection.roomId === filters.roomId);
    }
    
    return inspections;
  }

  // Work Orders
  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    return this.data.workOrders.get(id);
  }

  async createWorkOrder(insertWorkOrder: InsertWorkOrder): Promise<WorkOrder> {
    const id = randomUUID();
    const workOrder: WorkOrder = {
      ...insertWorkOrder,
      id,
      status: insertWorkOrder.status ?? null,
      priority: insertWorkOrder.priority ?? null,
      assigneeId: insertWorkOrder.assigneeId ?? null,
      roomId: insertWorkOrder.roomId ?? null,
      dueAt: insertWorkOrder.dueAt ?? null,
      startedAt: insertWorkOrder.startedAt ?? null,
      completedAt: insertWorkOrder.completedAt ?? null,
      closedAt: insertWorkOrder.closedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.workOrders.set(id, workOrder);
    await this.saveData('workOrders');
    return workOrder;
  }

  async updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | undefined> {
    const workOrder = this.data.workOrders.get(id);
    if (!workOrder) return undefined;
    
    const updatedWorkOrder = { ...workOrder, ...updates, updatedAt: new Date() };
    this.data.workOrders.set(id, updatedWorkOrder);
    await this.saveData('workOrders');
    return updatedWorkOrder;
  }

  async listWorkOrders(filters?: { status?: string; priority?: string; assigneeId?: string }): Promise<WorkOrder[]> {
    let workOrders = Array.from(this.data.workOrders.values());
    
    if (filters?.status) {
      workOrders = workOrders.filter(wo => wo.status === filters.status);
    }
    
    if (filters?.priority) {
      workOrders = workOrders.filter(wo => wo.priority === filters.priority);
    }
    
    if (filters?.assigneeId) {
      workOrders = workOrders.filter(wo => wo.assigneeId === filters.assigneeId);
    }
    
    return workOrders;
  }

  // PM Templates
  async getPMTemplate(id: string): Promise<PMTemplate | undefined> {
    return this.data.pmTemplates.get(id);
  }

  async createPMTemplate(insertTemplate: InsertPMTemplate): Promise<PMTemplate> {
    const id = randomUUID();
    const template: PMTemplate = {
      ...insertTemplate,
      id,
      createdAt: new Date(),
    };
    this.data.pmTemplates.set(id, template);
    await this.saveData('pmTemplates');
    return template;
  }

  async listPMTemplates(): Promise<PMTemplate[]> {
    return Array.from(this.data.pmTemplates.values());
  }

  // PM Instances
  async getPMInstance(id: string): Promise<PMInstance | undefined> {
    return this.data.pmInstances.get(id);
  }

  async createPMInstance(insertInstance: InsertPMInstance): Promise<PMInstance> {
    const id = randomUUID();
    const instance: PMInstance = {
      ...insertInstance,
      id,
      status: insertInstance.status ?? null,
      assigneeId: insertInstance.assigneeId ?? null,
      completedAt: insertInstance.completedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.pmInstances.set(id, instance);
    await this.saveData('pmInstances');
    return instance;
  }

  async updatePMInstance(id: string, updates: Partial<PMInstance>): Promise<PMInstance | undefined> {
    const instance = this.data.pmInstances.get(id);
    if (!instance) return undefined;
    
    const updatedInstance = { ...instance, ...updates, updatedAt: new Date() };
    this.data.pmInstances.set(id, updatedInstance);
    await this.saveData('pmInstances');
    return updatedInstance;
  }

  async listPMInstances(filters?: { status?: string; dueAfter?: Date; dueBefore?: Date }): Promise<PMInstance[]> {
    let instances = Array.from(this.data.pmInstances.values());
    
    if (filters?.status) {
      instances = instances.filter(instance => instance.status === filters.status);
    }
    
    if (filters?.dueAfter) {
      instances = instances.filter(instance => new Date(instance.dueAt) > filters.dueAfter!);
    }
    
    if (filters?.dueBefore) {
      instances = instances.filter(instance => new Date(instance.dueAt) < filters.dueBefore!);
    }
    
    return instances;
  }

  // Panic Events
  async createPanicEvent(insertEvent: InsertPanicEvent): Promise<PanicEvent> {
    const id = randomUUID();
    const event: PanicEvent = {
      ...insertEvent,
      id,
      timestamp: insertEvent.timestamp ?? null,
      mediaUrl: insertEvent.mediaUrl ?? null,
      createdAt: new Date(),
    };
    this.data.panicEvents.set(id, event);
    await this.saveData('panicEvents');
    return event;
  }

  async listPanicEvents(): Promise<PanicEvent[]> {
    return Array.from(this.data.panicEvents.values());
  }

  // Lost & Found
  async getLostFoundItem(id: string): Promise<LostFoundItem | undefined> {
    return this.data.lostFoundItems.get(id);
  }

  async createLostFoundItem(insertItem: InsertLostFoundItem): Promise<LostFoundItem> {
    const id = randomUUID();
    const item: LostFoundItem = {
      ...insertItem,
      id,
      status: insertItem.status ?? null,
      storageArea: insertItem.storageArea ?? null,
      expireAt: insertItem.expireAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.lostFoundItems.set(id, item);
    await this.saveData('lostFoundItems');
    return item;
  }

  async updateLostFoundItem(id: string, updates: Partial<LostFoundItem>): Promise<LostFoundItem | undefined> {
    const item = this.data.lostFoundItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...updates, updatedAt: new Date() };
    this.data.lostFoundItems.set(id, updatedItem);
    await this.saveData('lostFoundItems');
    return updatedItem;
  }

  async listLostFoundItems(filters?: { status?: string }): Promise<LostFoundItem[]> {
    let items = Array.from(this.data.lostFoundItems.values());
    
    if (filters?.status) {
      items = items.filter(item => item.status === filters.status);
    }
    
    return items;
  }

  async bulkClearExpired(): Promise<number> {
    const now = new Date();
    let clearedCount = 0;
    
    for (const [id, item] of this.data.lostFoundItems.entries()) {
      if (item.expireAt && new Date(item.expireAt) < now && item.status !== 'expired_cleared') {
        await this.updateLostFoundItem(id, { status: 'expired_cleared' });
        clearedCount++;
      }
    }
    
    return clearedCount;
  }

  // Reports
  async createReportRun(insertReport: InsertReportRun): Promise<ReportRun> {
    const id = randomUUID();
    const report: ReportRun = {
      ...insertReport,
      id,
      results: insertReport.results ?? null,
      createdAt: new Date(),
    };
    this.data.reportRuns.set(id, report);
    await this.saveData('reportRuns');
    return report;
  }

  async getReportRun(id: string): Promise<ReportRun | undefined> {
    return this.data.reportRuns.get(id);
  }

  async listReportRuns(): Promise<ReportRun[]> {
    return Array.from(this.data.reportRuns.values());
  }

  // Analytics
  async getRAAvgTimes(filters?: { userId?: string; taskType?: string; dateFrom?: Date; dateTo?: Date }): Promise<any[]> {
    let tasks = Array.from(this.data.tasks.values()).filter(task => 
      task.finishedAt && task.startedAt && !task.isDeleted
    );
    
    if (filters?.userId) {
      tasks = tasks.filter(task => task.assigneeId === filters.userId);
    }
    
    if (filters?.taskType) {
      tasks = tasks.filter(task => task.type === filters.taskType);
    }
    
    if (filters?.dateFrom) {
      tasks = tasks.filter(task => new Date(task.createdAt!) >= filters.dateFrom!);
    }
    
    if (filters?.dateTo) {
      tasks = tasks.filter(task => new Date(task.createdAt!) <= filters.dateTo!);
    }
    
    const grouped = tasks.reduce((acc, task) => {
      const key = `${task.assigneeId}-${task.type}`;
      if (!acc[key]) {
        acc[key] = {
          userId: task.assigneeId,
          taskType: task.type,
          tasks: [],
          totalTime: 0,
          count: 0,
        };
      }
      
      const duration = new Date(task.finishedAt!).getTime() - new Date(task.startedAt!).getTime();
      acc[key].tasks.push(task);
      acc[key].totalTime += duration;
      acc[key].count++;
      
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped).map((group: any) => ({
      ...group,
      avgTime: group.totalTime / group.count,
    }));
  }

  async getInspectionReports(filters?: { dateFrom?: Date; dateTo?: Date }): Promise<any> {
    let inspections = Array.from(this.data.inspections.values());
    
    if (filters?.dateFrom) {
      inspections = inspections.filter(inspection => new Date(inspection.createdAt!) >= filters.dateFrom!);
    }
    
    if (filters?.dateTo) {
      inspections = inspections.filter(inspection => new Date(inspection.createdAt!) <= filters.dateTo!);
    }
    
    const total = inspections.length;
    const passed = inspections.filter(inspection => inspection.passFail === true).length;
    const failed = inspections.filter(inspection => inspection.passFail === false).length;
    const pending = inspections.filter(inspection => inspection.passFail === null).length;
    
    return {
      total,
      passed,
      failed,
      pending,
      passRate: total > 0 ? (passed / total) * 100 : 0,
    };
  }

  async getSquareFootMetrics(filters?: { userId?: string; dateFrom?: Date; dateTo?: Date }): Promise<any[]> {
    let tasks = Array.from(this.data.tasks.values()).filter(task => 
      task.finishedAt && task.roomId && !task.isDeleted
    );
    
    if (filters?.userId) {
      tasks = tasks.filter(task => task.assigneeId === filters.userId);
    }
    
    if (filters?.dateFrom) {
      tasks = tasks.filter(task => new Date(task.createdAt!) >= filters.dateFrom!);
    }
    
    if (filters?.dateTo) {
      tasks = tasks.filter(task => new Date(task.createdAt!) <= filters.dateTo!);
    }
    
    const grouped = tasks.reduce((acc, task) => {
      const key = task.assigneeId || 'unassigned';
      if (!acc[key]) {
        acc[key] = {
          userId: task.assigneeId,
          totalSquareFeet: 0,
          taskCount: 0,
        };
      }
      
      const room = this.data.rooms.get(task.roomId!);
      if (room && room.squareFootage) {
        acc[key].totalSquareFeet += room.squareFootage;
      }
      acc[key].taskCount++;
      
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped);
  }
}

export const storage = new MemStorage();
