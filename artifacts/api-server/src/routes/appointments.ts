import { Router } from "express";
import { db, appointmentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { patientId } = req.query;
    let rows;
    if (patientId) {
      rows = await db.select().from(appointmentsTable)
        .where(eq(appointmentsTable.patient_id, patientId as string))
        .orderBy(desc(appointmentsTable.created_at));
    } else {
      rows = await db.select().from(appointmentsTable).orderBy(desc(appointmentsTable.created_at));
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
    const [row] = await db.insert(appointmentsTable).values({
      id,
      ...data,
      status: data.status ?? "pending",
      paid: data.paid ?? false,
    }).returning();
    return res.status(201).json(row);
  } catch (err: unknown) {
    req.log.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [row] = await db.update(appointmentsTable)
      .set(req.body)
      .where(eq(appointmentsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

export default router;
