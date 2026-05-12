import { Router } from "express";
import { db, medicalDocumentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { patientId } = req.query;
    let rows;
    if (patientId) {
      rows = await db.select().from(medicalDocumentsTable)
        .where(eq(medicalDocumentsTable.patient_id, patientId as string))
        .orderBy(desc(medicalDocumentsTable.created_at));
    } else {
      rows = await db.select().from(medicalDocumentsTable).orderBy(desc(medicalDocumentsTable.created_at));
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
    const [row] = await db.insert(medicalDocumentsTable).values({ id, ...data }).returning();
    return res.status(201).json(row);
  } catch (err: unknown) {
    req.log.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

export default router;
