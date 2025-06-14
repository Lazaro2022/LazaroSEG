import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  initials: text("initials").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  processNumber: varchar("process_number", { length: 20 }).notNull().unique(),
  prisonerName: text("prisoner_name").notNull(),
  type: text("type").notNull(), // "Certidão", "Relatório", "Ofício"
  deadline: timestamp("deadline").notNull(),
  status: text("status").notNull(), // "Em Andamento", "Concluído", "Vencido", "Urgente"
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
  isArchived: boolean("is_archived").default(false).notNull(),
});

export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  totalDocuments: integer("total_documents").default(0).notNull(),
  completedDocuments: integer("completed_documents").default(0).notNull(),
  completionPercentage: integer("completion_percentage").default(0).notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  systemName: text("system_name").notNull().default("Lazarus CG - Sistema de Controle"),
  institution: text("institution").notNull().default("Unidade Prisional - Manaus/AM"),
  adminName: text("admin_name").notNull().default("Lazarus"),
  timezone: text("timezone").notNull().default("america/manaus"),
  language: text("language").notNull().default("pt-br"),
  urgentDays: integer("urgent_days").notNull().default(2),
  warningDays: integer("warning_days").notNull().default(7),
  autoArchive: boolean("auto_archive").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  initials: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  processNumber: true,
  prisonerName: true,
  type: true,
  deadline: true,
  status: true,
  assignedTo: true,
}).extend({
  deadline: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

export const insertServerSchema = createInsertSchema(servers).pick({
  userId: true,
  totalDocuments: true,
  completedDocuments: true,
  completionPercentage: true,
}).partial({
  totalDocuments: true,
  completedDocuments: true,
  completionPercentage: true,
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).pick({
  systemName: true,
  institution: true,
  adminName: true,
  timezone: true,
  language: true,
  urgentDays: true,
  warningDays: true,
  autoArchive: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;

export type DocumentWithUser = Document & {
  assignedUser?: User;
};

export type ServerWithUser = Server & {
  user: User;
};

export type DashboardStats = {
  totalDocuments: number;
  inProgress: number;
  completed: number;
  overdue: number;
};



export type DocumentTypeStats = {
  certidoes: number;
  relatorios: number;
  oficios: number;
};

export type MonthlyStats = {
  month: string;
  created: number;
  completed: number;
  completionRate: number;
};

export type YearlyComparison = {
  currentYear: {
    year: number;
    totalDocuments: number;
    completedDocuments: number;
    completionRate: number;
  };
  previousYear: {
    year: number;
    totalDocuments: number;
    completedDocuments: number;
    completionRate: number;
  };
  growthRate: number;
};
