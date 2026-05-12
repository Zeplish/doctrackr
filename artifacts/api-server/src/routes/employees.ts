import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, checklistItemsTable, documentTypesTable } from "@workspace/db";
import { CreateEmployeeBody, UpdateEmployeeBody, ListEmployeesQueryParams } from "@workspace/api-zod";
import { eq, and, or, ilike } from "drizzle-orm";

const router = Router();

async function createChecklistForEmployee(employeeId: number) {
  const docTypes = await db.select().from(documentTypesTable).where(
    and(
      eq(documentTypesTable.isActive, true),
      or(
        eq(documentTypesTable.category, "employee"),
        eq(documentTypesTable.category, "both")
      )
    )
  );
  if (docTypes.length === 0) return;
  await db.insert(checklistItemsTable).values(
    docTypes.map((dt) => ({
      personType: "employee",
      employeeId,
      documentTypeId: dt.id,
    }))
  );
}

router.get("/employees", async (req, res): Promise<void> => {
  try {
    const parsed = ListEmployeesQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    let query = db.select().from(employeesTable).$dynamic();
    const conditions = [];
    if (params.status && params.status !== "all") {
      conditions.push(eq(employeesTable.status, params.status));
    }
    if (params.search) {
      conditions.push(ilike(employeesTable.fullName, `%${params.search}%`));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const employees = await query.orderBy(employeesTable.createdAt);
    res.json(employees);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/employees", async (req, res): Promise<void> => {
  try {
    const parsed = CreateEmployeeBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
    const [employee] = await db.insert(employeesTable).values(parsed.data!).returning();
    await createChecklistForEmployee(employee.id);
    res.status(201).json(employee);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employees/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    if (!employee) res.status(404).json({ error: "Employee not found" }); return;

    const checklist = await db
      .select({
        id: checklistItemsTable.id,
        personType: checklistItemsTable.personType,
        personId: checklistItemsTable.employeeId,
        documentTypeId: checklistItemsTable.documentTypeId,
        documentTypeName: documentTypesTable.name,
        documentTypeCategory: documentTypesTable.category,
        templateFormUrl: documentTypesTable.templateFormUrl,
        expiryDate: checklistItemsTable.expiryDate,
        notes: checklistItemsTable.notes,
        lastReminderSentAt: checklistItemsTable.lastReminderSentAt,
        nextReminderDueAt: checklistItemsTable.nextReminderDueAt,
        createdAt: checklistItemsTable.createdAt,
        updatedAt: checklistItemsTable.updatedAt,
      })
      .from(checklistItemsTable)
      .innerJoin(documentTypesTable, eq(checklistItemsTable.documentTypeId, documentTypesTable.id))
      .where(eq(checklistItemsTable.employeeId, id))
      .orderBy(documentTypesTable.name);

    const { computeDocumentStatus, computeDaysUntilExpiry } = await import("../lib/checklist-status");

    const enriched = checklist.map((item) => ({
      ...item,
      personId: employee.id,
      personName: employee.fullName,
      personEmail: employee.email,
      personStatus: employee.status,
      status: computeDocumentStatus(item.expiryDate),
      daysUntilExpiry: computeDaysUntilExpiry(item.expiryDate),
      lastReminderSentAt: item.lastReminderSentAt?.toISOString() ?? null,
      nextReminderDueAt: item.nextReminderDueAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    res.json({ ...employee, checklistItems: enriched });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/employees/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const parsed = UpdateEmployeeBody.safeParse(req.body);
    if (!parsed.success) res.status(400).json({ error: "Invalid input" }); return;
    const [updated] = await db.update(employeesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(employeesTable.id, id))
      .returning();
    if (!updated) res.status(404).json({ error: "Employee not found" }); return;
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
