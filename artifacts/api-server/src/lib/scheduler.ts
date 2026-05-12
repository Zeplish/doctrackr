import * as cron from "node-cron";
import { db } from "@workspace/db";
import {
  checklistItemsTable,
  documentTypesTable,
  studentsTable,
  employeesTable,
  emailLogsTable,
  organizationTable,
  smtpSettingsTable,
  reminderSettingsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { format, parseISO, isBefore, addDays, startOfDay } from "date-fns";
import {
  computeDocumentStatus,
  computeNextReminderDate,
} from "./checklist-status";
import {
  getTransporter,
  buildStudentReminderEmail,
  buildEmployeeReminderEmail,
  sendReminderEmail,
} from "./email";
import { logger } from "./logger";

let scheduledTask: cron.ScheduledTask | null = null;

export async function runReminderJob(): Promise<void> {
  logger.info("Running automated reminder job");

  const [settings] = await db.select().from(reminderSettingsTable).limit(1);
  const [org] = await db.select().from(organizationTable).limit(1);
  const [smtp] = await db.select().from(smtpSettingsTable).limit(1);

  if (!smtp?.host) {
    logger.warn("Skipping reminder job: SMTP not configured");
    return;
  }

  const daysBeforeExpiry = settings?.daysBeforeExpiry ?? 30;
  const repeatEveryDays = settings?.repeatEveryDays ?? 3;
  const overdueRepeatDays = settings?.overdueRepeatDays ?? 7;

  const rows = await db
    .select({
      item: checklistItemsTable,
      docType: documentTypesTable,
      student: studentsTable,
      employee: employeesTable,
    })
    .from(checklistItemsTable)
    .innerJoin(
      documentTypesTable,
      eq(checklistItemsTable.documentTypeId, documentTypesTable.id),
    )
    .leftJoin(studentsTable, eq(checklistItemsTable.studentId, studentsTable.id))
    .leftJoin(
      employeesTable,
      eq(checklistItemsTable.employeeId, employeesTable.id),
    );

  const today = startOfDay(new Date());
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const item = row.item;
    const personStatus =
      item.personType === "student"
        ? row.student?.status
        : row.employee?.status;

    if (personStatus !== "active") {
      skipped++;
      continue;
    }

    const status = computeDocumentStatus(item.expiryDate);
    if (status === "valid" || status === "missing") {
      skipped++;
      continue;
    }

    const nextReminderDate = computeNextReminderDate(
      item.expiryDate,
      daysBeforeExpiry,
      repeatEveryDays,
      overdueRepeatDays,
      item.lastReminderSentAt ?? null,
    );

    if (!nextReminderDate || isBefore(today, startOfDay(nextReminderDate))) {
      skipped++;
      continue;
    }

    const expiryDateFormatted = item.expiryDate
      ? format(parseISO(item.expiryDate), "MMMM d, yyyy")
      : "N/A";

    const reminderType =
      status === "overdue"
        ? "overdue"
        : status === "due_today"
          ? "overdue"
          : "automatic";

    try {
      const transporter = await getTransporter();

      if (item.personType === "student" && row.student) {
        const s = row.student;
        const { subject, html } = buildStudentReminderEmail({
          orgName: org?.name ?? "DocTrackr",
          senderName: org?.senderName ?? null,
          primaryColor: org?.primaryColor ?? null,
          studentName: s.fullName,
          documentType: row.docType.name,
          expiryDate: expiryDateFormatted,
          status,
          orgPhone: org?.phone ?? null,
          orgEmail: org?.email ?? null,
          orgWebsite: org?.website ?? null,
          emailFooter: org?.emailFooter ?? null,
          logoUrl: org?.logoUrl ?? null,
        });

        const to = [s.parent1Email];
        if (s.parent2Email) to.push(s.parent2Email);

        const ccEmail = await sendReminderEmail({
          transporter,
          smtp,
          org: org ?? { adminCcEmail: null },
          to,
          subject,
          html,
        });

        await db.insert(emailLogsTable).values({
          recipientEmail: to.join(", "),
          ccEmail: ccEmail ?? null,
          personType: "student",
          personId: s.id,
          personName: s.fullName,
          checklistItemId: item.id,
          documentTypeId: row.docType.id,
          documentTypeName: row.docType.name,
          emailSubject: subject,
          emailStatus: "sent",
          reminderType,
        });

        await db
          .update(checklistItemsTable)
          .set({
            lastReminderSentAt: new Date(),
            nextReminderDueAt: addDays(new Date(), repeatEveryDays),
            updatedAt: new Date(),
          })
          .where(eq(checklistItemsTable.id, item.id));

        sent++;
      } else if (item.personType === "employee" && row.employee) {
        const e = row.employee;
        const { subject, html } = buildEmployeeReminderEmail({
          orgName: org?.name ?? "DocTrackr",
          senderName: org?.senderName ?? null,
          primaryColor: org?.primaryColor ?? null,
          employeeName: e.fullName,
          documentType: row.docType.name,
          expiryDate: expiryDateFormatted,
          emailFooter: org?.emailFooter ?? null,
          logoUrl: org?.logoUrl ?? null,
        });

        const ccEmail = await sendReminderEmail({
          transporter,
          smtp,
          org: org ?? { adminCcEmail: null },
          to: [e.email],
          subject,
          html,
        });

        await db.insert(emailLogsTable).values({
          recipientEmail: e.email,
          ccEmail: ccEmail ?? null,
          personType: "employee",
          personId: e.id,
          personName: e.fullName,
          checklistItemId: item.id,
          documentTypeId: row.docType.id,
          documentTypeName: row.docType.name,
          emailSubject: subject,
          emailStatus: "sent",
          reminderType,
        });

        await db
          .update(checklistItemsTable)
          .set({
            lastReminderSentAt: new Date(),
            nextReminderDueAt: addDays(new Date(), repeatEveryDays),
            updatedAt: new Date(),
          })
          .where(eq(checklistItemsTable.id, item.id));

        sent++;
      }
    } catch (err) {
      failed++;
      logger.error(err, `Failed to send reminder for checklist item ${item.id}`);

      try {
        await db.insert(emailLogsTable).values({
          recipientEmail:
            item.personType === "student"
              ? (row.student?.parent1Email ?? "unknown")
              : (row.employee?.email ?? "unknown"),
          ccEmail: null,
          personType: item.personType,
          personId:
            item.personType === "student"
              ? (row.student?.id ?? 0)
              : (row.employee?.id ?? 0),
          personName:
            item.personType === "student"
              ? (row.student?.fullName ?? "Unknown")
              : (row.employee?.fullName ?? "Unknown"),
          checklistItemId: item.id,
          documentTypeId: row.docType.id,
          documentTypeName: row.docType.name,
          emailSubject: `Reminder: ${row.docType.name}`,
          emailStatus: "failed",
          reminderType,
        });
      } catch (logErr) {
        logger.error(logErr, "Failed to log failed reminder");
      }
    }
  }

  logger.info(
    { sent, skipped, failed },
    "Reminder job completed",
  );
}

export async function startScheduler(): Promise<void> {
  const [settings] = await db.select().from(reminderSettingsTable).limit(1);
  const cronTime = settings?.cronTime ?? "0 9 * * *";

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  try {
    scheduledTask = cron.schedule(cronTime, async () => {
      try {
        await runReminderJob();
      } catch (err) {
        logger.error(err, "Uncaught error in reminder job");
      }
    });
    logger.info({ cronTime }, "Reminder scheduler started");
  } catch (err) {
    logger.error(err, "Failed to start reminder scheduler — invalid cron expression");
  }
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("Reminder scheduler stopped");
  }
}
