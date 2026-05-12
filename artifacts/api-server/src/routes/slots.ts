import { Router } from "express";
import { db, nurseSlotsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { nurseId } = req.query;
    let rows;
    if (nurseId) {
      rows = await db.select().from(nurseSlotsTable)
        .where(eq(nurseSlotsTable.nurse_id, nurseId as string))
        .orderBy(asc(nurseSlotsTable.date));
    } else {
      rows = await db.select().from(nurseSlotsTable).orderBy(asc(nurseSlotsTable.date));
    }
    return res.json(rows);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const id = randomUUID();
    const [row] = await db.insert(nurseSlotsTable).values({ id, ...data }).returning();
    return res.status(201).json(row);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(nurseSlotsTable).where(eq(nurseSlotsTable.id, req.params.id));
    return res.status(204).send();
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

export default router;
