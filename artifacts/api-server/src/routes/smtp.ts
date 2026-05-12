import { Router } from "express";
import { db } from "@workspace/db";
import { smtpSettingsTable } from "@workspace/db";
import { UpdateSmtpSettingsBody, TestSmtpSettingsBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { getTransporter } from "../lib/email";

const router = Router();

async function ensureSmtp() {
  const [smtp] = await db.select().from(smtpSettingsTable).limit(1);
  if (!smtp) {
    const [created] = await db.insert(smtpSettingsTable).values({ secure: false }).returning();
    return created;
  }
  return smtp;
}

router.get("/smtp-settings", async (req, res) => {
  try {
    const smtp = await ensureSmtp();
    const { password: _pw, ...safe } = smtp;
    res.json(safe);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/smtp-settings", async (req, res) => {
  try {
    const parsed = UpdateSmtpSettingsBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
    const smtp = await ensureSmtp();
    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (!parsed.data.password) delete updateData.password;
    const [updated] = await db.update(smtpSettingsTable)
      .set(updateData)
      .where(eq(smtpSettingsTable.id, smtp.id))
      .returning();
    const { password: _pw, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/smtp-settings/test", async (req, res) => {
  try {
    const parsed = TestSmtpSettingsBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
    const transporter = await getTransporter();
    await transporter.sendMail({
      to: parsed.data.toEmail,
      subject: "DocTrackr - Test Email",
      text: "This is a test email from DocTrackr. Your SMTP settings are working correctly.",
    });
    res.json({ success: true, message: "Test email sent successfully" });
  } catch (err: unknown) {
    req.log.error(err);
    res.json({ success: false, message: err instanceof Error ? err.message : "Failed to send test email" });
  }
});

export default router;
