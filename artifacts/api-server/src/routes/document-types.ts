import { Router } from "express";
import { db } from "@workspace/db";
import { documentTypesTable, checklistItemsTable } from "@workspace/db";
import { CreateDocumentTypeBody, UpdateDocumentTypeBody, ListDocumentTypesQueryParams } from "@workspace/api-zod";
import { eq, and, count } from "drizzle-orm";

const router = Router();

router.get("/document-types", async (req, res): Promise<void> => {
  try {
    const parsed = ListDocumentTypesQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    let query = db.select().from(documentTypesTable).$dynamic();
    const conditions = [];
    if (params.category && params.category !== "all") {
      conditions.push(eq(documentTypesTable.category, params.category));
    }
    if (params.status && params.status !== "all") {
      conditions.push(eq(documentTypesTable.isActive, params.status === "active"));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const types = await query.orderBy(documentTypesTable.name);

    // Get usage counts
    const usageCounts = await db
      .select({ documentTypeId: checklistItemsTable.documentTypeId, count: count() })
      .from(checklistItemsTable)
      .groupBy(checklistItemsTable.documentTypeId);
    const countMap = new Map(usageCounts.map((u) => [u.documentTypeId, u.count]));

    const enriched = types.map((t) => ({ ...t, usageCount: countMap.get(t.id) ?? 0 }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/document-types", async (req, res): Promise<void> => {
  try {
    const parsed = CreateDocumentTypeBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
    const [dt] = await db.insert(documentTypesTable).values(parsed.data!).returning();
    res.status(201).json({ ...dt, usageCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/document-types/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const [dt] = await db.select().from(documentTypesTable).where(eq(documentTypesTable.id, id));
    if (!dt) res.status(404).json({ error: "Document type not found" }); return;
    const [usage] = await db.select({ count: count() }).from(checklistItemsTable).where(eq(checklistItemsTable.documentTypeId, id));
    res.json({ ...dt, usageCount: usage?.count ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/document-types/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const parsed = UpdateDocumentTypeBody.safeParse(req.body);
    if (!parsed.success) res.status(400).json({ error: "Invalid input" }); return;
    const [updated] = await db.update(documentTypesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(documentTypesTable.id, id))
      .returning();
    if (!updated) res.status(404).json({ error: "Document type not found" }); return;
    const [usage] = await db.select({ count: count() }).from(checklistItemsTable).where(eq(checklistItemsTable.documentTypeId, id));
    res.json({ ...updated, usageCount: usage?.count ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/document-types/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const [usage] = await db.select({ count: count() }).from(checklistItemsTable).where(eq(checklistItemsTable.documentTypeId, id));
    if (usage && usage.count > 0) {
      res.json({
        success: false,
        message: `This document type is being used in ${usage.count} records and cannot be deleted. Please deactivate it instead.`,
      });
      return;
    }
    await db.delete(documentTypesTable).where(eq(documentTypesTable.id, id));
    res.json({ success: true, message: "Document type deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/document-types/:id/toggle-active", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid ID" }); return;
    const [dt] = await db.select().from(documentTypesTable).where(eq(documentTypesTable.id, id));
    if (!dt) res.status(404).json({ error: "Document type not found" }); return;
    const [updated] = await db.update(documentTypesTable)
      .set({ isActive: !dt.isActive, updatedAt: new Date() })
      .where(eq(documentTypesTable.id, id))
      .returning();
    const [usage] = await db.select({ count: count() }).from(checklistItemsTable).where(eq(checklistItemsTable.documentTypeId, id));
    res.json({ ...updated, usageCount: usage?.count ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
