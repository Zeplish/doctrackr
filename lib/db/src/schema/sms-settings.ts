import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const smsSettingsTable = pgTable("sms_settings", {
  id: serial("id").primaryKey(),
  accountSid: text("account_sid"),
  authToken: text("auth_token"),
  fromNumber: text("from_number"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSmsSettingsSchema = createInsertSchema(smsSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSmsSettings = z.infer<typeof insertSmsSettingsSchema>;
export type SmsSettings = typeof smsSettingsTable.$inferSelect;
