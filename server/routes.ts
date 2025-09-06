import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, insertUserSchema, insertTaskSchema, insertRoomSchema,
  insertInspectionSchema, insertWorkOrderSchema, insertPMTemplateSchema,
  insertPMInstanceSchema, insertPanicEventSchema, insertRoomCommentSchema
} from "@shared/schema";
import { generateToken, hashPassword, comparePassword, canReceivePanicAlerts } from "./auth";
import { authenticateToken, requireRole, requireAuth, type AuthenticatedRequest } from "./middleware";
import { ObjectStorageService } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // CORS middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Auth routes
  app.post("/api/auth/register", requireAuth, requireRole(["site_admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      // Hash password and create user
      const passwordHash = await hashPassword(userData.password);
      const { password, ...userDataWithoutPassword } = userData;
      const user = await storage.createUser({
        ...userDataWithoutPassword,
        passwordHash,
      });
      
      const { passwordHash: _, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const token = generateToken(user);
      const { passwordHash: _, ...userResponse } = user;
      
      res.json({ token, user: userResponse });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { passwordHash: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Task routes
  app.post("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdById: req.user!.userId,
      });
      
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, type, assigneeId, includeDeleted } = req.query;
      
      const tasks = await storage.listTasks({
        status: status as string,
        type: type as string,
        assigneeId: assigneeId as string,
        includeDeleted: includeDeleted === 'true',
      });
      
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const updates = req.body;
      const task = await storage.updateTask(req.params.id, updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/tasks/:id/restore", authenticateToken, requireRole(["site_admin", "head_housekeeper"]), async (req, res) => {
    try {
      const task = await storage.restoreTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/tasks/:id/reassign", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req, res) => {
    try {
      const { assigneeId } = req.body;
      const task = await storage.updateTask(req.params.id, { assigneeId });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, requireRole(["site_admin", "head_housekeeper"]), async (req, res) => {
    try {
      const task = await storage.softDeleteTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ message: "Task deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Task photos
  app.post("/api/tasks/:id/photos", authenticateToken, async (req, res) => {
    try {
      const { url } = req.body;
      const photo = await storage.createTaskPhoto({
        taskId: req.params.id,
        url,
      });
      res.status(201).json(photo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/tasks/:id/photos", authenticateToken, async (req, res) => {
    try {
      const photos = await storage.getTaskPhotos(req.params.id);
      res.json(photos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Inspection routes
  app.post("/api/inspections", authenticateToken, requireRole(["site_admin", "head_housekeeper"]), async (req: AuthenticatedRequest, res) => {
    try {
      const inspectionData = insertInspectionSchema.parse({
        ...req.body,
        inspectorId: req.user!.userId,
      });
      
      const inspection = await storage.createInspection(inspectionData);
      res.status(201).json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/inspections", authenticateToken, async (req, res) => {
    try {
      const { kind, roomId } = req.query;
      const inspections = await storage.listInspections({
        kind: kind as string,
        roomId: roomId as string,
      });
      res.json(inspections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Work order routes
  app.post("/api/workorders", authenticateToken, requireRole(["site_admin", "head_housekeeper", "maintenance", "front_desk_manager"]), async (req, res) => {
    try {
      const workOrderData = insertWorkOrderSchema.parse(req.body);
      const workOrder = await storage.createWorkOrder(workOrderData);
      res.status(201).json(workOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/workorders", authenticateToken, async (req, res) => {
    try {
      const { status, priority, assigneeId } = req.query;
      const workOrders = await storage.listWorkOrders({
        status: status as string,
        priority: priority as string,
        assigneeId: assigneeId as string,
      });
      res.json(workOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/workorders/:id", authenticateToken, async (req, res) => {
    try {
      const updates = req.body;
      const workOrder = await storage.updateWorkOrder(req.params.id, updates);
      if (!workOrder) {
        return res.status(404).json({ error: "Work order not found" });
      }
      res.json(workOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // PM routes
  app.post("/api/pm/templates", authenticateToken, requireRole(["site_admin", "head_housekeeper", "maintenance"]), async (req, res) => {
    try {
      const templateData = insertPMTemplateSchema.parse(req.body);
      const template = await storage.createPMTemplate(templateData);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pm/templates", authenticateToken, async (req, res) => {
    try {
      const templates = await storage.listPMTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pm/upcoming", authenticateToken, async (req, res) => {
    try {
      const { dueBefore } = req.query;
      const instances = await storage.listPMInstances({
        status: "pending",
        dueBefore: dueBefore ? new Date(dueBefore as string) : undefined,
      });
      res.json(instances);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/pm/instances/:id", authenticateToken, async (req, res) => {
    try {
      const updates = req.body;
      const instance = await storage.updatePMInstance(req.params.id, updates);
      if (!instance) {
        return res.status(404).json({ error: "PM instance not found" });
      }
      res.json(instance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Panic routes
  app.post("/api/panic/trigger", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get all users who can receive panic alerts
      const allUsers = await storage.listUsers();
      const recipients = allUsers.filter(user => 
        canReceivePanicAlerts(user.role) && user.canReceivePanicAlerts
      );
      
      const panicEvent = await storage.createPanicEvent({
        userId: req.user!.userId,
        recipients: recipients.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
        })),
        mediaUrl: req.body.mediaUrl,
      });
      
      // Here you would typically send notifications to recipients
      // For now, we'll just log the event
      console.log(`Panic alert triggered by ${req.user!.name} at ${new Date().toISOString()}`);
      
      res.status(201).json(panicEvent);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/panic/log", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req, res) => {
    try {
      const events = await storage.listPanicEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Room Comments Routes
  app.get("/api/room-comments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.query;
      const comments = await storage.listRoomComments(roomId as string);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/room-comments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const commentData = insertRoomCommentSchema.parse({
        ...req.body,
        userId: req.user!.userId,
      });
      
      const comment = await storage.createRoomComment(commentData);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/room-comments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const updates = req.body;
      const comment = await storage.updateRoomComment(req.params.id, updates);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/room-comments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const deleted = await storage.deleteRoomComment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Report routes
  app.get("/api/reports/ra-average-times", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req, res) => {
    try {
      const { userId, taskType, dateFrom, dateTo } = req.query;
      const results = await storage.getRAAvgTimes({
        userId: userId as string,
        taskType: taskType as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/inspections", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const results = await storage.getInspectionReports({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/square-foot", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req, res) => {
    try {
      const { userId, dateFrom, dateTo } = req.query;
      const results = await storage.getSquareFootMetrics({
        userId: userId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Room routes
  app.get("/api/rooms", authenticateToken, async (req, res) => {
    try {
      const rooms = await storage.listRooms();
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rooms", authenticateToken, requireRole(["site_admin"]), async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      res.status(201).json(room);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User routes
  app.get("/api/users", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req, res) => {
    try {
      const users = await storage.listUsers();
      const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Object storage routes for file uploads
  app.post("/api/objects/upload", authenticateToken, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve uploaded objects
  app.get("/objects/:objectPath(*)", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: req.user!.userId,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error accessing object:", error);
      res.status(404).json({ error: "Object not found" });
    }
  });

  // OpenAPI documentation
  app.get("/docs/openapi.json", (req, res) => {
    const openApiDoc = {
      openapi: "3.0.0",
      info: {
        title: "Hotel Operations API",
        version: "1.0.0",
        description: "Hotel operations management system API",
      },
      servers: [
        {
          url: "/api",
          description: "API server",
        },
      ],
      paths: {
        "/auth/login": {
          post: {
            summary: "User login",
            tags: ["Authentication"],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string", format: "email" },
                      password: { type: "string" },
                    },
                    required: ["email", "password"],
                  },
                },
              },
            },
            responses: {
              200: { description: "Login successful" },
              401: { description: "Invalid credentials" },
            },
          },
        },
        "/tasks": {
          get: {
            summary: "List tasks",
            tags: ["Tasks"],
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: "status", in: "query", schema: { type: "string" } },
              { name: "type", in: "query", schema: { type: "string" } },
              { name: "assigneeId", in: "query", schema: { type: "string" } },
            ],
            responses: {
              200: { description: "Tasks retrieved successfully" },
            },
          },
          post: {
            summary: "Create task",
            tags: ["Tasks"],
            security: [{ bearerAuth: [] }],
            responses: {
              201: { description: "Task created successfully" },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    };
    
    res.json(openApiDoc);
  });

  const httpServer = createServer(app);
  return httpServer;
}
