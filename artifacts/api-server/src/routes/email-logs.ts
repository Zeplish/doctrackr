import { Router } from "express";
import { db } from "@workspace/db";
import { emailLogsTable } from "@workspace/db";
import { ListEmailLogsQueryParams } from "@workspace/api-zod";
import { eq, and, desc, count, sql } from "drizzle-orm";

const router = Router();

router.get("/email-logs", async (req, res) => {
  try {
    const parsed = ListEmailLogsQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = db.select().from(emailLogsTable).$dynamic();
    let countQuery = db.select({ count: count() }).from(emailLogsTable).$dynamic();
    const conditions = [];

    if (params.personType && params.personType !== "all") {
      conditions.push(eq(emailLogsTable.personType, params.personType));
    }
    if (params.personId) {
      conditions.push(eq(emailLogsTable.personId, params.personId));
    }
    if (params.checklistItemId) {
      conditions.push(eq(emailLogsTable.checklistItemId, params.checklistItemId));
    }
    if (params.status && params.status !== "all") {
      conditions.push(eq(emailLogsTable.emailStatus, params.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;
    const items = await query.orderBy(desc(emailLogsTable.sentAt)).limit(limit).offset(offset);

    res.json({ items, total, page, limit });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
