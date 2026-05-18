import { Router } from "express";
import { db } from "@workspace/db";
import { smsSettingsTable, smsLogsTable } from "@workspace/db";
import { UpdateSmsSettingsBody, TestSmsSettingsBody, ListSmsLogsQueryParams } from "@workspace/api-zod";
import { eq, desc, count } from "drizzle-orm";
import { ensureSmsSettings, sendSms } from "../lib/sms";

const router = Router();

router.get("/sms-settings", async (req, res): Promise<void> => {
  try {
    const settings = await ensureSmsSettings();
    const { authToken: _t, ...safe } = settings;
    res.json(safe);
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
    await sendSms(parsed.data!.toPhone, "DocTrackr: This is a test message. Your SMS settings are working correctly.");
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
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    const offset = (page - 1) * limit;

    const allLogs = await db.select().from(smsLogsTable).orderBy(desc(smsLogsTable.sentAt));

    let filtered = allLogs;
    if (params.personType && params.personType !== "all") {
      filtered = filtered.filter((l) => l.personType === params.personType);
    }
    if (params.status && params.status !== "all") {
      filtered = filtered.filter((l) => l.smsStatus === params.status);
    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    res.json({ items, total, page, limit });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
