import { Router } from "express";
import { db, medicalDocumentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireNurse } from "../lib/auth";

const router = Router();

// GET /documents — patient sees only own; nurse sees all (or filtered by patientId)
router.get("/", async (req, res) => {
  try {
    const auth = req.auth!;

    if (auth.role === "patient") {
      // Always scope to own patient ID regardless of query params
      const rows = await db.select().from(medicalDocumentsTable)
        .where(eq(medicalDocumentsTable.patient_id, auth.userId))
        .orderBy(desc(medicalDocumentsTable.created_at));
      return res.json(rows);
    }

    // Nurse: optional filter by patientId
    const { patientId } = req.query;
    const rows = patientId
      ? await db.select().from(medicalDocumentsTable)
          .where(eq(medicalDocumentsTable.patient_id, String(patientId)))
          .orderBy(desc(medicalDocumentsTable.created_at))
      : await db.select().from(medicalDocumentsTable)
          .orderBy(desc(medicalDocumentsTable.created_at));
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// POST /documents — nurse only
router.post("/", requireNurse, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const id = randomUUID();
    const [row] = await db.insert(medicalDocumentsTable).values({
      id,
      patient_id: String(body["patient_id"] ?? ""),
      patient_name: String(body["patient_name"] ?? ""),
      nurse_id: String(body["nurse_id"] ?? ""),
      nurse_name: String(body["nurse_name"] ?? ""),
      type: String(body["type"] ?? "") as "sick_note" | "prescription" | "referral",
      data: (body["data"] ?? null) as Record<string, unknown> | null,
    }).returning();
    return res.status(201).json(row);
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

export default router;
