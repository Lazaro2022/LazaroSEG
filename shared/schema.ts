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
});

export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  totalDocuments: integer("total_documents").default(0).notNull(),
  completedDocuments: integer("completed_documents").default(0).notNull(),
  completionPercentage: integer("completion_percentage").default(0).notNull(),
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
});

export const insertServerSchema = createInsertSchema(servers).pick({
  userId: true,
  totalDocuments: true,
  completedDocuments: true,
  completionPercentage: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;

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
