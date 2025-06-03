import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  systemName: text("system_name").notNull().default("Lazarus CG - Sistema de Controle"),
  institution: text("institution").notNull().default("Unidade Prisional - Manaus/AM"),
  timezone: text("timezone").notNull().default("america/manaus"),
  language: text("language").notNull().default("pt-br"),
  urgentDays: integer("urgent_days").notNull().default(2),
  warningDays: integer("warning_days").notNull().default(7),
  autoArchive: boolean("auto_archive").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).pick({
  systemName: true,
  institution: true,
  timezone: true,
  language: true,
  urgentDays: true,
  warningDays: true,
  autoArchive: true,
});

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;