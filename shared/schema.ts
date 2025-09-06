import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["site_admin", "head_housekeeper", "room_attendant", "front_desk_manager"]);
export const taskTypeEnum = pgEnum("task_type", ["cleaning", "maintenance", "alert"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "paused", "completed", "failed"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const roomStatusEnum = pgEnum("room_status", ["dirty", "clean", "out_of_order", "maintenance", "ready", "roll", "out", "clean_inspected"]);
export const inspectionKindEnum = pgEnum("inspection_kind", ["room", "process"]);
export const workOrderStatusEnum = pgEnum("work_order_status", ["pending", "in_progress", "on_hold", "completed", "cancelled"]);
export const pmFrequencyEnum = pgEnum("pm_frequency", ["days_counter", "days_rented"]);
export const pmStatusEnum = pgEnum("pm_status", ["pending", "in_progress", "completed", "skipped"]);
export const lostFoundStatusEnum = pgEnum("lost_found_status", ["logged", "stored", "returned", "expired_cleared"]);
export const reportTypeEnum = pgEnum("report_type", ["ra_average_times", "inspections", "square_foot", "daily_reset"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  canReceivePanicAlerts: boolean("can_receive_panic_alerts").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rooms table
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  type: text("type").notNull(),
  floor: integer("floor"),
  status: roomStatusEnum("status").default("dirty"),
  squareFootage: integer("square_footage"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: taskTypeEnum("type").notNull(),
  status: taskStatusEnum("status").default("pending"),
  priority: priorityEnum("priority").default("medium"),
  roomId: varchar("room_id").references(() => rooms.id),
  assigneeId: varchar("assignee_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  dueAt: timestamp("due_at"),
  startedAt: timestamp("started_at"),
  pausedAt: timestamp("paused_at"),
  finishedAt: timestamp("finished_at"),
  verifiedById: varchar("verified_by_id").references(() => users.id),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task photos table
export const taskPhotos = pgTable("task_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inspections table
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: inspectionKindEnum("kind").notNull(),
  roomId: varchar("room_id").references(() => rooms.id),
  inspectorId: varchar("inspector_id").references(() => users.id).notNull(),
  checklist: jsonb("checklist").notNull(),
  score: integer("score"),
  passFail: boolean("pass_fail"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Work orders table
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: priorityEnum("priority").default("medium"),
  roomId: varchar("room_id").references(() => rooms.id),
  assigneeId: varchar("assignee_id").references(() => users.id),
  status: workOrderStatusEnum("status").default("pending"),
  slaDueAt: timestamp("sla_due_at"),
  parts: jsonb("parts"),
  laborMins: integer("labor_mins"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PM Templates table
export const pmTemplates = pgTable("pm_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  frequency: pmFrequencyEnum("frequency").notNull(),
  interval: integer("interval").notNull(),
  checklist: jsonb("checklist").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// PM Instances table
export const pmInstances = pgTable("pm_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => pmTemplates.id).notNull(),
  dueAt: timestamp("due_at").notNull(),
  status: pmStatusEnum("status").default("pending"),
  assigneeId: varchar("assignee_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Panic events table
export const panicEvents = pgTable("panic_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  recipients: jsonb("recipients").notNull(),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lost & Found items table
export const lostFoundItems = pgTable("lost_found_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  locationFound: text("location_found").notNull(),
  storageArea: text("storage_area"),
  status: lostFoundStatusEnum("status").default("logged"),
  expireAt: timestamp("expire_at"),
  foundById: varchar("found_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Report runs table
export const reportRuns = pgTable("report_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: reportTypeEnum("type").notNull(),
  params: jsonb("params").notNull(),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Room Comments
export const roomComments = pgTable("room_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  comment: text("comment").notNull(),
  priority: priorityEnum("priority").default("low"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
  createdAt: true,
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPMTemplateSchema = createInsertSchema(pmTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertPMInstanceSchema = createInsertSchema(pmInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPanicEventSchema = createInsertSchema(panicEvents).omit({
  id: true,
  createdAt: true,
});

export const insertLostFoundItemSchema = createInsertSchema(lostFoundItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportRunSchema = createInsertSchema(reportRuns).omit({
  id: true,
  createdAt: true,
});

export const insertRoomCommentSchema = createInsertSchema(roomComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskPhoto = typeof taskPhotos.$inferSelect;
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type PMTemplate = typeof pmTemplates.$inferSelect;
export type InsertPMTemplate = z.infer<typeof insertPMTemplateSchema>;
export type PMInstance = typeof pmInstances.$inferSelect;
export type InsertPMInstance = z.infer<typeof insertPMInstanceSchema>;
export type PanicEvent = typeof panicEvents.$inferSelect;
export type InsertPanicEvent = z.infer<typeof insertPanicEventSchema>;
export type ReportRun = typeof reportRuns.$inferSelect;
export type InsertReportRun = z.infer<typeof insertReportRunSchema>;
export type RoomComment = typeof roomComments.$inferSelect;
export type InsertRoomComment = z.infer<typeof insertRoomCommentSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginSchema>;
