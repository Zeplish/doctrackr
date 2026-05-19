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
    const data = parsed.data!;

    const effectiveEnabled = data.enabled !== undefined ? data.enabled : settings.enabled;
    if (effectiveEnabled) {
      const hasAccountSid = data.accountSid || settings.accountSid;
      const hasFromNumber = data.fromNumber || settings.fromNumber;
      const hasAuthToken = data.authToken || settings.authToken;
      if (!hasAccountSid || !hasFromNumber || !hasAuthToken) {
        res.status(400).json({ error: "Account SID, Auth Token, and From Number are required before enabling SMS." });
        return;
      }
    }

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (!data.authToken) delete updateData.authToken;
    const [updated] = await db.update(smsSettingsTable)
      .set(updateData)
      .where(eq(smsSettingsTable.id, settings.id))
      .returning();
    const { authToken, ...safe } = updated;
    res.json({ ...safe, authTokenSet: Boolean(authToken) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

router.post("/sms-settings/test", async (req, res): Promise<void> => {
  try {
    const parsed = TestSmsSettingsBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { toPhone } = parsed.data!;
    if (!E164_REGEX.test(toPhone)) {
      res.json({ success: false, message: "Invalid phone number. Use E.164 format (e.g. +12125551234)." });
      return;
    }
    await sendSms(toPhone, "DocTrackr: This is a test message. Your SMS settings are working correctly.", { skipEnabledCheck: true });
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
