import { Router } from "express";
import { getPool, sql } from "../lib/azureDb";
import { requireNurse } from "../lib/auth";

const router = Router();

const mapSlot = (r: Record<string, unknown>) => ({
  id: String(r["SlotID"]),
  nurse_id: String(r["NurseID"]),
  nurse_name: String(r["NurseName"] ?? ""),
  date: r["SlotDate"] ? new Date(r["SlotDate"] as string).toISOString().slice(0, 10) : "",
  start_time: String(r["StartTime"] ?? "09:00"),
  end_time: String(r["EndTime"] ?? "17:00"),
});

// GET /slots — any authenticated user (patients need this for virtual booking)
router.get("/", async (req, res) => {
  const { nurseId } = req.query;
  try {
    // Try Azure SQL first
    const pool = await getPool();
    const request = pool.request();
    let query = "SELECT * FROM NurseSlots";
    if (nurseId) {
      query += " WHERE NurseID = @nurseId ORDER BY SlotDate";
      request.input("nurseId", sql.Int, Number(nurseId));
    } else {
      query += " ORDER BY SlotDate";
    }
    const result = await request.query(query);
    return res.json(result.recordset.map(r => mapSlot(r as Record<string, unknown>)));
  } catch {
    // Azure SQL failed — fall back to Replit Postgres
    try {
      const { db, nurseSlotsTable } = await import("@workspace/db");
      const { eq, asc } = await import("drizzle-orm");
      let rows;
      if (nurseId) {
        rows = await db.select().from(nurseSlotsTable)
          .where(eq(nurseSlotsTable.nurse_id, nurseId as string))
          .orderBy(asc(nurseSlotsTable.date));
      } else {
        rows = await db.select().from(nurseSlotsTable).orderBy(asc(nurseSlotsTable.date));
      }
      return res.json(rows);
    } catch (e2) {
      return res.status(500).json({ error: e2 instanceof Error ? e2.message : "Server error" });
    }
  }
});

// POST /slots — nurse only
router.post("/", requireNurse, async (req, res) => {
  const { nurse_id, nurse_name, date, start_time, end_time } = req.body as Record<string, string>;
  try {
    // Try Azure SQL first
    const pool = await getPool();
    const result = await pool.request()
      .input("nurseId", sql.Int, Number(nurse_id))
      .input("nurseName", sql.NVarChar(100), nurse_name || "")
      .input("slotDate", sql.Date, new Date(date + "T12:00:00"))
      .input("startTime", sql.NVarChar(10), start_time || "09:00")
      .input("endTime", sql.NVarChar(10), end_time || "17:00")
      .query("INSERT INTO NurseSlots (NurseID, NurseName, SlotDate, StartTime, EndTime) OUTPUT INSERTED.* VALUES (@nurseId, @nurseName, @slotDate, @startTime, @endTime)");
    const r = result.recordset[0] as Record<string, unknown>;
    return res.status(201).json(mapSlot(r));
  } catch {
    // Azure SQL failed — fall back to Replit Postgres
    try {
      const { db, nurseSlotsTable } = await import("@workspace/db");
      const { randomUUID } = await import("crypto");
      const id = randomUUID();
      const [row] = await db.insert(nurseSlotsTable)
        .values({ id, nurse_id, nurse_name, date, start_time, end_time })
        .returning();
      return res.status(201).json(row);
    } catch (e2) {
      return res.status(500).json({ error: e2 instanceof Error ? e2.message : "Failed to create slot" });
    }
  }
});

// DELETE /slots/:id — nurse only
router.delete("/:id", requireNurse, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input("id", sql.Int, Number(req.params.id))
      .query("DELETE FROM NurseSlots WHERE SlotID = @id");
    return res.status(204).send();
  } catch {
    try {
      const { db, nurseSlotsTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      await db.delete(nurseSlotsTable).where(eq(nurseSlotsTable.id, String(req.params["id"])));
      return res.status(204).send();
    } catch (e2) {
      return res.status(500).json({ error: e2 instanceof Error ? e2.message : "Failed to delete slot" });
    }
  }
});

export default router;
