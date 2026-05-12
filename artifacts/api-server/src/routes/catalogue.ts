import { Router } from "express";
import { getPool, sql } from "../lib/azureDb";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM Catalogue ORDER BY Type, Name");
    return res.json(result.recordset.map((r: Record<string, unknown>) => ({
      id: String(r["CatalougeID"]),
      type: String(r["Type"] ?? ""),
      name: String(r["Name"] ?? ""),
      price: Number(r["Price"] ?? 0),
      discount: Number(r["discount"] ?? 0),
    })));
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

export default router;
