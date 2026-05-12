import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  classRoom: text("class_room"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  parent1Name: text("parent1_name").notNull(),
  parent1Email: text("parent1_email").notNull(),
  parent1Phone: text("parent1_phone"),
  parent2Name: text("parent2_name"),
  parent2Email: text("parent2_email"),
  parent2Phone: text("parent2_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
