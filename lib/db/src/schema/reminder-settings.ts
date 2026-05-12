import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reminderSettingsTable = pgTable("reminder_settings", {
  id: serial("id").primaryKey(),
  daysBeforeExpiry: integer("days_before_expiry").notNull().default(30),
  repeatEveryDays: integer("repeat_every_days").notNull().default(3),
  overdueRepeatDays: integer("overdue_repeat_days").notNull().default(7),
  cronTime: text("cron_time").notNull().default("0 9 * * *"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReminderSettingsSchema = createInsertSchema(reminderSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReminderSettings = z.infer<typeof insertReminderSettingsSchema>;
export type ReminderSettings = typeof reminderSettingsTable.$inferSelect;
