import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, insertUserSchema, insertTaskSchema, insertRoomSchema,
  insertInspectionSchema, insertWorkOrderSchema, insertPMTemplateSchema,
  insertPMInstanceSchema, insertPanicEventSchema, insertRoomAssignmentSchema, insertRoomCommentSchema
} from "@shared/schema";
import { generateToken, hashPassword, comparePassword, canReceivePanicAlerts } from "./auth";
import { authenticateToken, requireRole, requireAuth, type AuthenticatedRequest } from "./middleware";
import { ObjectStorageService } from "./objectStorage";
import { emailService } from "./emailService";
import { websocketService } from "./websocketService";

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
        password: userData.password,  // Pass the plain password; storage will handle hashing
        passwordHash,
      } as any);
      
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
      
      // Send email notification and WebSocket broadcast for task assignment
      if (task.assigneeId) {
        try {
          const assignee = await storage.getUser(task.assigneeId);
          const room = task.roomId ? await storage.getRoom(task.roomId) : undefined;
          
          if (assignee) {
            await emailService.sendTaskAssignedNotification(task, assignee, room);
            websocketService.broadcastTaskAssigned(task, assignee, room);
          }
        } catch (emailError) {
          console.error('Failed to send task assignment email:', emailError);
        }
      }
      
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

  app.patch("/api/tasks/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const updates = req.body;
      const originalTask = await storage.getTask(req.params.id);
      const task = await storage.updateTask(req.params.id, updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Send email notification and WebSocket broadcast for task completion
      if (updates.status === 'completed' && originalTask?.status !== 'completed') {
        try {
          const completedBy = await storage.getUser(req.user!.userId);
          const supervisors = await storage.listUsers();
          const supervisorUsers = supervisors.filter(user => 
            user.role === 'site_admin' || user.role === 'head_housekeeper'
          );
          const room = task.roomId ? await storage.getRoom(task.roomId) : undefined;
          
          if (completedBy) {
            await emailService.sendTaskCompletedNotification(task, completedBy, supervisorUsers, room);
            websocketService.broadcastTaskCompleted(task, completedBy, room);
          }
        } catch (emailError) {
          console.error('Failed to send task completion email:', emailError);
        }
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
      
      // Send email notification and WebSocket broadcast for task reassignment
      if (assigneeId) {
        try {
          const assignee = await storage.getUser(assigneeId);
          const room = task.roomId ? await storage.getRoom(task.roomId) : undefined;
          
          if (assignee) {
            await emailService.sendTaskAssignedNotification(task, assignee, room);
            websocketService.broadcastTaskAssigned(task, assignee, room);
          }
        } catch (emailError) {
          console.error('Failed to send task reassignment email:', emailError);
        }
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

  app.patch("/api/inspections/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const originalInspection = await storage.getInspection(id);
      
      const inspection = await storage.updateInspection(id, updateData);
      
      // Send email notification and WebSocket broadcast for inspection completion
      if (updateData.signedAt && originalInspection && !originalInspection.signedAt) {
        try {
          const inspector = await storage.getUser(req.user!.userId);
          const relevantUsers = await storage.listUsers();
          const recipients = relevantUsers.filter(user => 
            user.role === 'site_admin' || 
            user.role === 'head_housekeeper'
          );
          const room = inspection.roomId ? await storage.getRoom(inspection.roomId) : undefined;
          
          if (inspector) {
            await emailService.sendInspectionCompletedNotification(inspection, inspector, recipients, room);
            websocketService.broadcastInspectionCompleted(inspection, inspector, room);
          }
        } catch (emailError) {
          console.error('Failed to send inspection completion email:', emailError);
        }
      }
      
      res.json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/inspections/:id", authenticateToken, requireRole(["site_admin", "head_housekeeper"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInspection(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
      
      // Send panic alert emails and WebSocket broadcast
      try {
        const triggeredBy = await storage.getUser(req.user!.userId);
        if (triggeredBy) {
          await emailService.sendPanicAlertNotification(
            triggeredBy, 
            req.body.location || 'Unknown location', 
            recipients
          );
          websocketService.broadcastPanicAlert(triggeredBy, req.body.location || 'Unknown location');
        }
      } catch (emailError) {
        console.error('Failed to send panic alert emails:', emailError);
      }
      
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

  // Room Status Update Route
  app.patch("/api/rooms/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, notes } = req.body;
      const originalRoom = await storage.getRoom(req.params.id);
      const room = await storage.updateRoom(req.params.id, { 
        status, 
        updatedAt: new Date() 
      });
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Optionally log status change or create task/comment
      if (notes) {
        await storage.createRoomComment({
          roomId: req.params.id,
          userId: req.user!.userId,
          comment: `Status changed to ${status.toUpperCase()}: ${notes}`,
          priority: "low",
          isResolved: false,
        });
      }

      // Send email notification and WebSocket broadcast for room status change
      if (originalRoom && originalRoom.status !== status) {
        try {
          const updatedBy = await storage.getUser(req.user!.userId);
          const relevantUsers = await storage.listUsers();
          const recipients = relevantUsers.filter(user => 
            user.role === 'site_admin' || 
            user.role === 'head_housekeeper' || 
            user.role === 'front_desk_manager'
          );
          
          if (updatedBy) {
            await emailService.sendRoomStatusNotification(room, originalRoom.status || 'unknown', updatedBy, recipients);
            websocketService.broadcastRoomStatusChange(room, originalRoom.status || 'unknown', updatedBy);
          }
        } catch (emailError) {
          console.error('Failed to send room status change email:', emailError);
        }
      }

      res.json(room);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
      
      // Send WebSocket notification for new room comment
      try {
        const commenter = await storage.getUser(req.user!.userId);
        const room = await storage.getRoom(commentData.roomId);
        
        if (commenter) {
          websocketService.broadcast({
            type: 'user_notification',
            data: {
              message: `New comment added to Room ${room?.number || commentData.roomId}`,
              comment,
              commenter: {
                name: commenter.name,
                role: commenter.role
              },
              room
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (notificationError) {
        console.error('Failed to send room comment notification:', notificationError);
      }
      
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
      
      // Send WebSocket notification for updated room comment
      try {
        const updater = await storage.getUser(req.user!.userId);
        const room = await storage.getRoom(comment.roomId);
        
        if (updater) {
          websocketService.broadcast({
            type: 'user_notification',
            data: {
              message: `Comment updated for Room ${room?.number || comment.roomId}`,
              comment,
              updater: {
                name: updater.name,
                role: updater.role
              },
              room
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (notificationError) {
        console.error('Failed to send room comment update notification:', notificationError);
      }
      
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/room-comments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get comment details before deletion for WebSocket notification
      const originalComment = await storage.getRoomComment ? await storage.getRoomComment(req.params.id) : null;
      
      const deleted = await storage.deleteRoomComment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      // Send WebSocket notification for deleted room comment
      if (originalComment) {
        try {
          const deleter = await storage.getUser(req.user!.userId);
          const room = await storage.getRoom(originalComment.roomId);
          
          if (deleter) {
            websocketService.broadcast({
              type: 'user_notification',
              data: {
                message: `Comment deleted from Room ${room?.number || originalComment.roomId}`,
                commentId: req.params.id,
                deleter: {
                  name: deleter.name,
                  role: deleter.role
                },
                room
              },
              timestamp: new Date().toISOString()
            });
          }
        } catch (notificationError) {
          console.error('Failed to send room comment deletion notification:', notificationError);
        }
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Daily Reset Routes
  app.post("/api/daily-reset/manual", authenticateToken, requireRole(["site_admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { dailyResetService } = await import("./dailyReset");
      const report = await dailyResetService.triggerManualReset();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/daily-reset/last-report", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req, res) => {
    try {
      const { dailyResetService } = await import("./dailyReset");
      const report = await dailyResetService.getLastResetReport();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  app.patch("/api/rooms/:id", authenticateToken, requireRole(["site_admin"]), async (req, res) => {
    try {
      const room = await storage.updateRoom(req.params.id, req.body);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json(room);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/rooms/:id", authenticateToken, requireRole(["site_admin"]), async (req, res) => {
    try {
      const deleted = await storage.deleteRoom(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.status(200).json({ message: "Room deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Room assignment routes
  app.post("/api/room-assignments", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req: AuthenticatedRequest, res) => {
    try {
      const assignmentData = insertRoomAssignmentSchema.parse({
        ...req.body,
        assignedById: req.user!.userId,
      });
      const assignment = await storage.createRoomAssignment(assignmentData);
      
      // Send WebSocket notification for new room assignment
      try {
        const assignedBy = await storage.getUser(req.user!.userId);
        const assignedTo = await storage.getUser(assignmentData.userId);
        const room = await storage.getRoom(assignmentData.roomId);
        
        if (assignedBy && assignedTo && room) {
          websocketService.broadcast({
            type: 'room_assignment_created',
            data: {
              assignment,
              assignedBy: {
                name: assignedBy.name,
                role: assignedBy.role
              },
              assignedTo: {
                name: assignedTo.name,
                role: assignedTo.role
              },
              room: {
                id: room.id,
                number: room.number,
                type: room.type
              }
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (notificationError) {
        console.error('Failed to send room assignment notification:', notificationError);
      }
      
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/room-assignments", authenticateToken, async (req, res) => {
    try {
      const { roomId, userId } = req.query;
      const assignments = await storage.listRoomAssignments(
        roomId as string,
        userId as string
      );
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/room-assignments/:roomId/:userId", authenticateToken, requireRole(["site_admin", "head_housekeeper", "front_desk_manager"]), async (req: AuthenticatedRequest, res) => {
    try {
      // Get assignment details before deletion for WebSocket notification
      const assignments = await storage.listRoomAssignments();
      const originalAssignment = assignments.find(
        a => a.roomId === req.params.roomId && a.userId === req.params.userId
      );
      
      const deleted = await storage.deleteRoomAssignment(req.params.roomId, req.params.userId);
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Send WebSocket notification for deleted room assignment
      if (originalAssignment) {
        try {
          const deletedBy = await storage.getUser(req.user!.userId);
          const assignedUser = await storage.getUser(originalAssignment.userId);
          const room = await storage.getRoom(originalAssignment.roomId);
          
          if (deletedBy && assignedUser && room) {
            websocketService.broadcast({
              type: 'room_assignment_deleted',
              data: {
                roomId: originalAssignment.roomId,
                userId: originalAssignment.userId,
                deletedBy: {
                  name: deletedBy.name,
                  role: deletedBy.role
                },
                assignedUser: {
                  name: assignedUser.name,
                  role: assignedUser.role
                },
                room: {
                  id: room.id,
                  number: room.number,
                  type: room.type
                }
              },
              timestamp: new Date().toISOString()
            });
          }
        } catch (notificationError) {
          console.error('Failed to send room assignment deletion notification:', notificationError);
        }
      }
      
      res.status(200).json({ message: "Assignment deleted successfully" });
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

  app.post("/api/users", authenticateToken, requireRole(["site_admin"]), async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const passwordHash = await hashPassword(password);
      const userWithHash = { ...userData, passwordHash };
      
      const user = await storage.createUser(userWithHash);
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", authenticateToken, requireRole(["site_admin"]), async (req, res) => {
    try {
      const { password, ...updates } = req.body;
      let userUpdates = { ...updates };
      
      // If password is provided, hash it
      if (password) {
        const passwordHash = await hashPassword(password);
        userUpdates.passwordHash = passwordHash;
      }
      
      const user = await storage.updateUser(req.params.id, userUpdates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireRole(["site_admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      // Prevent self-deletion
      if (req.params.id === req.user?.userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Delete user from storage (will need to implement this method)
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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

  // Email management routes
  app.post("/api/admin/test-email", authenticateToken, requireRole(["site_admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { email, templateType } = req.body;
      
      if (!email || !templateType) {
        return res.status(400).json({ error: "Email and template type are required" });
      }

      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      // Test email with sample data
      await emailService.sendEmail(email, templateType, {
        user: {
          ...user,
          name: "Test User",
          email: email
        },
        task: {
          title: "Test Task",
          description: "This is a test task for email notification",
          priority: "medium",
          dueAt: "2024-01-15",
          roomNumber: "101"
        }
      });

      res.json({ success: true, message: "Test email sent successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/email-status", authenticateToken, requireRole(["site_admin"]), async (req, res) => {
    try {
      const isConnected = await emailService.testConnection();
      res.json({ 
        connected: isConnected,
        config: {
          host: process.env.SMTP_HOST || 'Not configured',
          port: process.env.SMTP_PORT || 'Not configured',
          from: process.env.SMTP_FROM || 'Not configured'
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/email-preferences", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const preferences = req.body;
      
      // Users can only update their own preferences unless they're admin
      if (id !== req.user!.userId && !["site_admin"].includes(req.user!.role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const user = await storage.updateUser(id, preferences);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/websocket-status", authenticateToken, requireRole(["site_admin"]), async (req, res) => {
    try {
      const stats = websocketService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  websocketService.initialize(httpServer);
  
  return httpServer;
}
