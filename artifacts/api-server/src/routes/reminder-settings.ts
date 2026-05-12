import { Router } from "express";
import { db } from "@workspace/db";
import { reminderSettingsTable } from "@workspace/db";
import { UpdateReminderSettingsBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

async function ensureSettings() {
  const [s] = await db.select().from(reminderSettingsTable).limit(1);
  if (!s) {
    const [created] = await db.insert(reminderSettingsTable).values({}).returning();
    return created;
  }
  return s;
}

router.get("/reminder-settings", async (req, res) => {
  try {
    const settings = await ensureSettings();
    res.json(settings);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/reminder-settings", async (req, res) => {
  try {
    const parsed = UpdateReminderSettingsBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
    const settings = await ensureSettings();
    const [updated] = await db.update(reminderSettingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(reminderSettingsTable.id, settings.id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
