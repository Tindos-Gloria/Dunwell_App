import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/nurses", async (req, res) => {
  try {
    const nurses = await db.select().from(profilesTable).where(eq(profilesTable.role, "nurse"));
    return res.json(nurses.map(({ password_hash: _, ...p }) => p));
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.get("/patients", async (req, res) => {
  try {
    const patients = await db.select().from(profilesTable).where(eq(profilesTable.role, "patient"));
    return res.json(patients.map(({ password_hash: _, ...p }) => p));
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

export default router;
