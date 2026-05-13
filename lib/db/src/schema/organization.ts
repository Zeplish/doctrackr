import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizationTable = pgTable("organization", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Step Ahead Day Care"),
  logoUrl: text("logo_url"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  emailFooter: text("email_footer"),
  primaryColor: text("primary_color").default("#2563eb"),
  secondaryColor: text("secondary_color").default("#1e40af"),
  tagline: text("tagline").default("Never miss an important document renewal."),
  adminCcEmail: text("admin_cc_email"),
  studentEmailTemplate: text("student_email_template"),
  employeeEmailTemplate: text("employee_email_template"),
  authUsername: text("auth_username"),
  authPasswordHash: text("auth_password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrganizationSchema = createInsertSchema(organizationTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationTable.$inferSelect;
