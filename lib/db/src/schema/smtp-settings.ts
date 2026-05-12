import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const smtpSettingsTable = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host"),
  port: integer("port").default(587),
  username: text("username"),
  password: text("password"),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  secure: boolean("secure").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSmtpSettingsSchema = createInsertSchema(smtpSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;
export type SmtpSettings = typeof smtpSettingsTable.$inferSelect;
