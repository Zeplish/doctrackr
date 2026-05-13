import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, checklistItemsTable, documentTypesTable } from "@workspace/db";
import { CreateStudentBody, UpdateStudentBody, ListStudentsQueryParams } from "@workspace/api-zod";
import { eq, and, or, ilike } from "drizzle-orm";

const router = Router();

async function createChecklistForStudent(studentId: number) {
  const docTypes = await db.select().from(documentTypesTable).where(
    and(
      eq(documentTypesTable.isActive, true),
      or(
        eq(documentTypesTable.category, "student"),
        eq(documentTypesTable.category, "both")
      )
    )
  );
  if (docTypes.length === 0) return;
  await db.insert(checklistItemsTable).values(
    docTypes.map((dt) => ({
      personType: "student",
      studentId,
      documentTypeId: dt.id,
    }))
  );
}

router.get("/students", async (req, res): Promise<void> => {
  try {
    const parsed = ListStudentsQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    let query = db.select().from(studentsTable).$dynamic();
    const conditions = [];
    if (params.status && params.status !== "all") {
      conditions.push(eq(studentsTable.status, params.status));
    }
    if (params.search) {
      conditions.push(ilike(studentsTable.fullName, `%${params.search}%`));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const students = await query.orderBy(studentsTable.createdAt);
    res.json(students);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/students", async (req, res): Promise<void> => {
  try {
    const parsed = CreateStudentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
    const [student] = await db.insert(studentsTable).values(parsed.data!).returning();
    await createChecklistForStudent(student.id);
    res.status(201).json(student);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }

    const checklist = await db
      .select({
        id: checklistItemsTable.id,
        personType: checklistItemsTable.personType,
        personId: checklistItemsTable.studentId,
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
      .where(eq(checklistItemsTable.studentId, id))
      .orderBy(documentTypesTable.name);

    const { computeDocumentStatus, computeDaysUntilExpiry } = await import("../lib/checklist-status");

    const enriched = checklist.map((item) => ({
      ...item,
      personId: student.id,
      personName: student.fullName,
      personEmail: student.parent1Email,
      personStatus: student.status,
      status: computeDocumentStatus(item.expiryDate),
      daysUntilExpiry: computeDaysUntilExpiry(item.expiryDate),
      lastReminderSentAt: item.lastReminderSentAt?.toISOString() ?? null,
      nextReminderDueAt: item.nextReminderDueAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    res.json({ ...student, checklistItems: enriched });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/students/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const parsed = UpdateStudentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const [updated] = await db.update(studentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(studentsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Student not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(studentsTable).where(eq(studentsTable.id, id));
    res.json({ success: true, message: "Student deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
