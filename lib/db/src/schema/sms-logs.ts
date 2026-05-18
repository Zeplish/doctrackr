import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const smsLogsTable = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  recipientPhone: text("recipient_phone").notNull(),
  personType: text("person_type").notNull(),
  personId: integer("person_id").notNull(),
  personName: text("person_name").notNull(),
  checklistItemId: integer("checklist_item_id").notNull(),
  documentTypeId: integer("document_type_id").notNull(),
  documentTypeName: text("document_type_name").notNull(),
  messageBody: text("message_body").notNull(),
  smsStatus: text("sms_status").notNull().default("sent"),
  errorMessage: text("error_message"),
  reminderType: text("reminder_type").notNull().default("automatic"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SmsLog = typeof smsLogsTable.$inferSelect;
