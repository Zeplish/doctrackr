import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { employeesTable } from "./employees";
import { documentTypesTable } from "./document-types";

export const checklistItemsTable = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  personType: text("person_type").notNull(), // student | employee
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employeesTable.id, { onDelete: "cascade" }),
  documentTypeId: integer("document_type_id").notNull().references(() => documentTypesTable.id),
  expiryDate: text("expiry_date"), // ISO date string
  lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
  nextReminderDueAt: timestamp("next_reminder_due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertChecklistItemSchema = createInsertSchema(checklistItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type ChecklistItem = typeof checklistItemsTable.$inferSelect;
