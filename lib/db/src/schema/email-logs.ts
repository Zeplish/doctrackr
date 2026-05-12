import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { checklistItemsTable } from "./checklist-items";
import { documentTypesTable } from "./document-types";

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipientEmail: text("recipient_email").notNull(),
  ccEmail: text("cc_email"),
  personType: text("person_type").notNull(), // student | employee
  personId: integer("person_id").notNull(),
  personName: text("person_name").notNull(),
  checklistItemId: integer("checklist_item_id").references(() => checklistItemsTable.id, { onDelete: "set null" }),
  documentTypeId: integer("document_type_id").references(() => documentTypesTable.id, { onDelete: "set null" }),
  documentTypeName: text("document_type_name").notNull(),
  emailSubject: text("email_subject").notNull(),
  emailStatus: text("email_status").notNull().default("sent"), // sent | failed
  errorMessage: text("error_message"),
  reminderType: text("reminder_type").notNull().default("automatic"), // automatic | manual | overdue
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogsTable).omit({ id: true });
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogsTable.$inferSelect;
