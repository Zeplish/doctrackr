import { Router } from "express";
import { db } from "@workspace/db";
import { smsSettingsTable, smsLogsTable } from "@workspace/db";
import { UpdateSmsSettingsBody, TestSmsSettingsBody, ListSmsLogsQueryParams } from "@workspace/api-zod";
import { eq, and, desc, count } from "drizzle-orm";
import { ensureSmsSettings, sendSms } from "../lib/sms";

const router = Router();

router.get("/sms-settings", async (req, res): Promise<void> => {
  try {
    const settings = await ensureSmsSettings();
    const { authToken, ...safe } = settings;
    res.json({ ...safe, authTokenSet: Boolean(authToken) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/sms-settings", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateSmsSettingsBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const settings = await ensureSmsSettings();
    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (!parsed.data!.authToken) delete updateData.authToken;
    const [updated] = await db.update(smsSettingsTable)
      .set(updateData)
      .where(eq(smsSettingsTable.id, settings.id))
      .returning();
    const { authToken: _t, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sms-settings/test", async (req, res): Promise<void> => {
  try {
    const parsed = TestSmsSettingsBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    await sendSms(parsed.data!.toPhone, "DocTrackr: This is a test message. Your SMS settings are working correctly.", { skipEnabledCheck: true });
    res.json({ success: true, message: "Test SMS sent successfully" });
  } catch (err: unknown) {
    req.log.error(err);
    res.json({ success: false, message: err instanceof Error ? err.message : "Failed to send test SMS" });
  }
});

router.get("/sms-logs", async (req, res): Promise<void> => {
  try {
    const parsed = ListSmsLogsQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const offset = (page - 1) * limit;

    let query = db.select().from(smsLogsTable).$dynamic();
    let countQuery = db.select({ count: count() }).from(smsLogsTable).$dynamic();
    const conditions = [];

    if (params.personType && params.personType !== "all") {
      conditions.push(eq(smsLogsTable.personType, params.personType));
    }
    if (params.status && params.status !== "all") {
      conditions.push(eq(smsLogsTable.smsStatus, params.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;
    const items = await query.orderBy(desc(smsLogsTable.sentAt)).limit(limit).offset(offset);

    res.json({ items, total, page, limit });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
