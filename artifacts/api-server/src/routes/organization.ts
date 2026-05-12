import { Router } from "express";
import { db } from "@workspace/db";
import { organizationTable } from "@workspace/db";
import { UpdateOrganizationBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

async function ensureOrg() {
  const [org] = await db.select().from(organizationTable).limit(1);
  if (!org) {
    const [created] = await db.insert(organizationTable).values({ name: "Step Ahead Day Care" }).returning();
    return created;
  }
  return org;
}

router.get("/organization", async (req, res): Promise<void> => {
  try {
    const org = await ensureOrg();
    res.json(org);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/organization", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateOrganizationBody.safeParse(req.body);
    if (!parsed.success) res.status(400).json({ error: "Invalid input" }); return;
    const org = await ensureOrg();
    const [updated] = await db.update(organizationTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(organizationTable.id, org.id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
