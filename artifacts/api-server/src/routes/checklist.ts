import { Router } from "express";
import { db } from "@workspace/db";
import {
  checklistItemsTable, documentTypesTable, studentsTable, employeesTable, emailLogsTable, organizationTable, smtpSettingsTable, reminderSettingsTable,
} from "@workspace/db";
import {
  UpdateChecklistItemBody, BulkUpdateChecklistItemsBody, ListChecklistItemsQueryParams,
} from "@workspace/api-zod";
import { eq, and, or, ilike, isNull, isNotNull, lte, gte, sql } from "drizzle-orm";
import { computeDocumentStatus, computeDaysUntilExpiry } from "../lib/checklist-status";
import { getTransporter, buildStudentReminderEmail, buildEmployeeReminderEmail, sendReminderEmail } from "../lib/email";
import { format, parseISO } from "date-fns";

const router = Router();

async function buildChecklistItem(item: Record<string, unknown>, student: Record<string, unknown> | null, employee: Record<string, unknown> | null, docType: Record<string, unknown>) {
  const personType = item.personType as string;
  const expiryDate = item.expiryDate as string | null;
  const person = personType === "student" ? student : employee;
  return {
    id: item.id,
    personType,
    personId: personType === "student" ? (item.studentId ?? (person as Record<string, unknown>)?.id) : (item.employeeId ?? (person as Record<string, unknown>)?.id),
    personName: (person as Record<string, unknown>)?.fullName ?? "",
    personEmail: personType === "student" ? (person as Record<string, unknown>)?.parent1Email : (person as Record<string, unknown>)?.email,
    personStatus: (person as Record<string, unknown>)?.status ?? "active",
    documentTypeId: docType.id,
    documentTypeName: docType.name,
    documentTypeCategory: docType.category,
    templateFormUrl: docType.templateFormUrl ?? null,
    expiryDate,
    status: computeDocumentStatus(expiryDate),
    daysUntilExpiry: computeDaysUntilExpiry(expiryDate),
    notes: item.notes ?? null,
    lastReminderSentAt: item.lastReminderSentAt ? (item.lastReminderSentAt as Date).toISOString() : null,
    nextReminderDueAt: item.nextReminderDueAt ? (item.nextReminderDueAt as Date).toISOString() : null,
    createdAt: (item.createdAt as Date).toISOString(),
    updatedAt: (item.updatedAt as Date).toISOString(),
  };
}

router.get("/checklist", async (req, res): Promise<void> => {
  try {
    const parsed = ListChecklistItemsQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};

    const rows = await db
      .select({
        item: checklistItemsTable,
        docType: documentTypesTable,
        student: studentsTable,
        employee: employeesTable,
      })
      .from(checklistItemsTable)
      .innerJoin(documentTypesTable, eq(checklistItemsTable.documentTypeId, documentTypesTable.id))
      .leftJoin(studentsTable, eq(checklistItemsTable.studentId, studentsTable.id))
      .leftJoin(employeesTable, eq(checklistItemsTable.employeeId, employeesTable.id))
      .orderBy(documentTypesTable.name);

    let items = await Promise.all(rows.map((r) => buildChecklistItem(r.item as unknown as Record<string, unknown>, r.student as unknown as Record<string, unknown> | null, r.employee as unknown as Record<string, unknown> | null, r.docType as unknown as Record<string, unknown>)));

    if (params.personType && params.personType !== "all") {
      items = items.filter((i) => i.personType === params.personType);
    }
    if (params.status && params.status !== "all") {
      items = items.filter((i) => i.status === params.status);
    }
    if (params.documentTypeId) {
      items = items.filter((i) => i.documentTypeId === params.documentTypeId);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter((i) => (i.personName as string).toLowerCase().includes(s) || (i.documentTypeName as string).toLowerCase().includes(s));
    }
    if (params.peopleStatus && params.peopleStatus !== "all") {
      items = items.filter((i) => i.personStatus === params.peopleStatus);
    }

    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/checklist/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const [row] = await db
      .select({ item: checklistItemsTable, docType: documentTypesTable, student: studentsTable, employee: employeesTable })
      .from(checklistItemsTable)
      .innerJoin(documentTypesTable, eq(checklistItemsTable.documentTypeId, documentTypesTable.id))
      .leftJoin(studentsTable, eq(checklistItemsTable.studentId, studentsTable.id))
      .leftJoin(employeesTable, eq(checklistItemsTable.employeeId, employeesTable.id))
      .where(eq(checklistItemsTable.id, id));
    if (!row) res.status(404).json({ error: "Checklist item not found" }); return;
    const item = await buildChecklistItem(row.item as unknown as Record<string, unknown>, row.student as unknown as Record<string, unknown> | null, row.employee as unknown as Record<string, unknown> | null, row.docType as unknown as Record<string, unknown>);
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/checklist/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const parsed = UpdateChecklistItemBody.safeParse(req.body);
    if (!parsed.success) res.status(400).json({ error: "Invalid input" }); return;
    const [updated] = await db.update(checklistItemsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(checklistItemsTable.id, id))
      .returning();
    if (!updated) res.status(404).json({ error: "Checklist item not found" }); return;
    const [row] = await db
      .select({ item: checklistItemsTable, docType: documentTypesTable, student: studentsTable, employee: employeesTable })
      .from(checklistItemsTable)
      .innerJoin(documentTypesTable, eq(checklistItemsTable.documentTypeId, documentTypesTable.id))
      .leftJoin(studentsTable, eq(checklistItemsTable.studentId, studentsTable.id))
      .leftJoin(employeesTable, eq(checklistItemsTable.employeeId, employeesTable.id))
      .where(eq(checklistItemsTable.id, id));
    const item = await buildChecklistItem(row.item as unknown as Record<string, unknown>, row.student as unknown as Record<string, unknown> | null, row.employee as unknown as Record<string, unknown> | null, row.docType as unknown as Record<string, unknown>);
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/checklist/bulk-update", async (req, res): Promise<void> => {
  try {
    const parsed = BulkUpdateChecklistItemsBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const updated = [];
    for (const item of parsed.data!.items) {
      const [upd] = await db.update(checklistItemsTable)
        .set({ expiryDate: item.expiryDate, notes: item.notes, updatedAt: new Date() })
        .where(eq(checklistItemsTable.id, item.id))
        .returning();
      if (upd) {
        const [row] = await db
          .select({ item: checklistItemsTable, docType: documentTypesTable, student: studentsTable, employee: employeesTable })
          .from(checklistItemsTable)
          .innerJoin(documentTypesTable, eq(checklistItemsTable.documentTypeId, documentTypesTable.id))
          .leftJoin(studentsTable, eq(checklistItemsTable.studentId, studentsTable.id))
          .leftJoin(employeesTable, eq(checklistItemsTable.employeeId, employeesTable.id))
          .where(eq(checklistItemsTable.id, item.id));
        if (row) {
          updated.push(await buildChecklistItem(row.item as unknown as Record<string, unknown>, row.student as unknown as Record<string, unknown> | null, row.employee as unknown as Record<string, unknown> | null, row.docType as unknown as Record<string, unknown>));
        }
      }
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/checklist/:id/send-reminder", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [row] = await db
      .select({ item: checklistItemsTable, docType: documentTypesTable, student: studentsTable, employee: employeesTable })
      .from(checklistItemsTable)
      .innerJoin(documentTypesTable, eq(checklistItemsTable.documentTypeId, documentTypesTable.id))
      .leftJoin(studentsTable, eq(checklistItemsTable.studentId, studentsTable.id))
      .leftJoin(employeesTable, eq(checklistItemsTable.employeeId, employeesTable.id))
      .where(eq(checklistItemsTable.id, id));

    if (!row) { res.status(404).json({ error: "Checklist item not found" }); return; }

    const [org] = await db.select().from(organizationTable).limit(1);
    const [smtp] = await db.select().from(smtpSettingsTable).limit(1);

    if (!smtp?.host) {
      res.json({ success: false, message: "SMTP not configured. Please configure email settings first." }); return;
    }

    const item = row.item;
    const docType = row.docType;
    const expiryDate = item.expiryDate ? format(parseISO(item.expiryDate as string), "MMMM d, yyyy") : "N/A";
    const status = computeDocumentStatus(item.expiryDate);

    let emailStatus = "sent";
    let errorMessage: string | undefined;
    let ccEmail: string | undefined;

    try {
      const transporter = await getTransporter();
      if (item.personType === "student" && row.student) {
        const s = row.student!;
        const { subject, html } = buildStudentReminderEmail({
          orgName: org?.name ?? "DocTrackr",
          senderName: org?.senderName ?? null,
          primaryColor: org?.primaryColor ?? null,
          studentName: s.fullName,
          documentType: docType.name,
          expiryDate,
          status,
          orgPhone: org?.phone ?? null,
          orgEmail: org?.email ?? null,
          orgWebsite: org?.website ?? null,
          emailFooter: org?.emailFooter ?? null,
          logoUrl: org?.logoUrl ?? null,
          customTemplate: org?.studentEmailTemplate ?? null,
        });
        const to = [s.parent1Email as string];
        if (s.parent2Email) to.push(s.parent2Email as string);
        const cc = await sendReminderEmail({ transporter, smtp, org: org ?? { adminCcEmail: null }, to, subject, html });
        ccEmail = cc;
        await db.insert(emailLogsTable).values({
          recipientEmail: to.join(", "),
          ccEmail: ccEmail ?? null,
          personType: "student",
          personId: s!.id,
          personName: s!.fullName,
          checklistItemId: id,
          documentTypeId: docType.id,
          documentTypeName: docType.name,
          emailSubject: subject,
          emailStatus: "sent",
          reminderType: "manual",
        });
      } else if (item.personType === "employee" && row.employee) {
        const e = row.employee!;
        const { subject, html } = buildEmployeeReminderEmail({
          orgName: org?.name ?? "DocTrackr",
          senderName: org?.senderName ?? null,
          primaryColor: org?.primaryColor ?? null,
          employeeName: e.fullName,
          documentType: docType.name,
          expiryDate,
          emailFooter: org?.emailFooter ?? null,
          logoUrl: org?.logoUrl ?? null,
          customTemplate: org?.employeeEmailTemplate ?? null,
        });
        const cc = await sendReminderEmail({ transporter, smtp, org: org ?? { adminCcEmail: null }, to: [e.email], subject, html });
        ccEmail = cc;
        await db.insert(emailLogsTable).values({
          recipientEmail: e.email,
          ccEmail: ccEmail ?? null,
          personType: "employee",
          personId: e.id,
          personName: e.fullName,
          checklistItemId: id,
          documentTypeId: docType.id,
          documentTypeName: docType.name,
          emailSubject: subject,
          emailStatus: "sent",
          reminderType: "manual",
        });
      }
    } catch (err: unknown) {
      emailStatus = "failed";
      errorMessage = err instanceof Error ? (err as Error).message : "Unknown error";
      req.log.error({ err }, "Failed to send reminder email");
    }

    await db.update(checklistItemsTable)
      .set({ lastReminderSentAt: new Date(), updatedAt: new Date() })
      .where(eq(checklistItemsTable.id, id));

    if (emailStatus === "sent") {
      res.json({ success: true, message: "Reminder sent successfully" });
    } else {
      res.json({ success: false, message: `Failed to send: ${errorMessage}` });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
