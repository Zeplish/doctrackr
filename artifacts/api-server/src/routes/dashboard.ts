import { Router } from "express";
import { db } from "@workspace/db";
import { checklistItemsTable, documentTypesTable, studentsTable, employeesTable, emailLogsTable } from "@workspace/db";
import { GetDashboardExpiringSoonQueryParams, GetDashboardOverdueQueryParams, GetDashboardMissingQueryParams } from "@workspace/api-zod";
import { eq, and, isNull, isNotNull, count, gte, lte, sql } from "drizzle-orm";
import { computeDocumentStatus, computeDaysUntilExpiry } from "../lib/checklist-status";
import { startOfMonth, endOfMonth } from "date-fns";

const router = Router();

async function buildAllChecklistItems() {
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
    .leftJoin(employeesTable, eq(checklistItemsTable.employeeId, employeesTable.id));

  return rows.map((r) => {
    const item = r.item;
    const person = item.personType === "student" ? r.student : r.employee;
    const expiryDate = item.expiryDate;
    return {
      id: item.id,
      personType: item.personType,
      personId: item.personType === "student" ? item.studentId : item.employeeId,
      personName: person?.fullName ?? "",
      personEmail: item.personType === "student" ? r.student?.parent1Email : r.employee?.email,
      personStatus: person?.status ?? "active",
      documentTypeId: r.docType.id,
      documentTypeName: r.docType.name,
      documentTypeCategory: r.docType.category,
      templateFormUrl: r.docType.templateFormUrl ?? null,
      expiryDate,
      status: computeDocumentStatus(expiryDate),
      daysUntilExpiry: computeDaysUntilExpiry(expiryDate),
      notes: item.notes ?? null,
      lastReminderSentAt: item.lastReminderSentAt?.toISOString() ?? null,
      nextReminderDueAt: item.nextReminderDueAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  });
}

router.get("/dashboard/stats", async (req, res) => {
  try {
    const allItems = await buildAllChecklistItems();
    const activeItems = allItems.filter((i) => i.personStatus === "active");

    const missingDocuments = activeItems.filter((i) => i.status === "missing").length;
    const expiringIn30Days = activeItems.filter((i) => i.status === "expiring_soon").length;
    const dueToday = activeItems.filter((i) => i.status === "due_today").length;
    const overdueDocuments = activeItems.filter((i) => i.status === "overdue").length;

    const [{ count: totalActiveStudents }] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.status, "active"));
    const [{ count: totalActiveEmployees }] = await db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.status, "active"));

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const [{ count: remindersSentThisMonth }] = await db
      .select({ count: count() })
      .from(emailLogsTable)
      .where(and(
        eq(emailLogsTable.emailStatus, "sent"),
        sql`${emailLogsTable.sentAt} >= ${monthStart.toISOString()}`,
        sql`${emailLogsTable.sentAt} <= ${monthEnd.toISOString()}`
      ));

    const [{ count: failedEmails }] = await db
      .select({ count: count() })
      .from(emailLogsTable)
      .where(eq(emailLogsTable.emailStatus, "failed"));

    res.json({
      missingDocuments,
      expiringIn30Days,
      dueToday,
      overdueDocuments,
      totalActiveStudents,
      totalActiveEmployees,
      remindersSentThisMonth,
      failedEmails,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/expiring-soon", async (req, res) => {
  try {
    const parsed = GetDashboardExpiringSoonQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    let items = await buildAllChecklistItems();
    items = items.filter((i) => (i.status === "expiring_soon" || i.status === "due_today") && i.personStatus === "active");
    if (params.personType && params.personType !== "all") {
      items = items.filter((i) => i.personType === params.personType);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter((i) => i.personName.toLowerCase().includes(s));
    }
    items.sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999));
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/overdue", async (req, res) => {
  try {
    const parsed = GetDashboardOverdueQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    let items = await buildAllChecklistItems();
    items = items.filter((i) => i.status === "overdue" && i.personStatus === "active");
    if (params.personType && params.personType !== "all") {
      items = items.filter((i) => i.personType === params.personType);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter((i) => i.personName.toLowerCase().includes(s));
    }
    items.sort((a, b) => (a.daysUntilExpiry ?? -999) - (b.daysUntilExpiry ?? -999));
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/missing", async (req, res) => {
  try {
    const parsed = GetDashboardMissingQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    let items = await buildAllChecklistItems();
    items = items.filter((i) => i.status === "missing" && i.personStatus === "active");
    if (params.personType && params.personType !== "all") {
      items = items.filter((i) => i.personType === params.personType);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter((i) => i.personName.toLowerCase().includes(s));
    }
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
