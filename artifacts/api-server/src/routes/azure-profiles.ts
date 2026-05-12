import { Router } from "express";
import { getPool, sql } from "../lib/azureDb";
import { requireNurse } from "../lib/auth";

const router = Router();

type UserRole = "nurse" | "patient";

const mapPatient = (p: Record<string, unknown>) => ({
  id: String(p["PatientID"]),
  name: String(p["PatientName"] ?? "").trim(),
  surname: (p["PatientSurname"] as string)?.trim() || null,
  email: (p["Patient_Email"] as string)?.trim() || null,
  phone: (p["Patient_ContactNo"] as string)?.trim() || null,
  dob: p["DOB"] ? new Date(p["DOB"] as string).toISOString().slice(0, 10) : null,
  gender: (p["Gender"] as string) || null,
  address: (p["Address"] as string) || null,
  role: "patient" as UserRole,
  sanc_hpcsa: null,
  is_student: false,
});

const mapNurse = (u: Record<string, unknown>) => ({
  id: String(u["UserID"]),
  name: String(u["Name"] ?? "").trim(),
  surname: (u["Surname"] as string)?.trim() || null,
  email: (u["Email"] as string)?.trim() || null,
  phone: (u["ContactNo"] as string)?.trim() || null,
  dob: (u["DOB"] as string)?.trim() || null,
  gender: null,
  address: null,
  role: "nurse" as UserRole,
  sanc_hpcsa: (u["SANC_HPCSA"] as string)?.trim() || null,
  is_student: false,
});

// Nurses list — any authenticated user can see (needed for booking dropdown)
router.get("/nurses", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM Users WHERE UserRole = 'N'");
    return res.json(result.recordset.map(r => mapNurse(r as Record<string, unknown>)));
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// Patient list — nurses only, reads from Patients table
router.get("/patients", requireNurse, async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT * FROM Patients ORDER BY PatientName");
    return res.json(result.recordset.map(r => mapPatient(r as Record<string, unknown>)));
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// Profile update — own profile only for patients; nurses can edit any nurse profile
router.patch("/:id", async (req, res) => {
  try {
    const auth = req.auth!;
    const targetId = req.params.id;

    if (auth.role === "patient" && targetId !== auth.userId) {
      return res.status(403).json({ error: "Cannot modify another user's profile" });
    }

    const { name, surname, phone, dob, address, gender } = req.body as Record<string, string>;
    const pool = await getPool();

    if (auth.role === "patient") {
      // Update Patients table
      const dobDate = dob ? new Date(dob) : null;
      await pool.request()
        .input("id", sql.Int, Number(targetId))
        .input("name", sql.NVarChar(50), (name ?? "").slice(0, 50))
        .input("surname", sql.NVarChar(50), (surname ?? "").slice(0, 50))
        .input("contactNo", sql.NChar(10), (phone ?? "").padEnd(10).slice(0, 10))
        .input("dob", dobDate ? sql.Date : sql.Date, dobDate)
        .input("address", sql.NVarChar(50), (address ?? "").slice(0, 50))
        .input("gender", sql.NVarChar(10), (gender ?? "").slice(0, 10))
        .query(`UPDATE Patients SET PatientName=@name, PatientSurname=@surname,
                Patient_ContactNo=@contactNo, DOB=@dob, Address=@address, Gender=@gender
                WHERE PatientID=@id`);

      const r = await pool.request()
        .input("id", sql.Int, Number(targetId))
        .query("SELECT * FROM Patients WHERE PatientID=@id");
      return res.json(mapPatient(r.recordset[0] as Record<string, unknown>));
    }

    // Nurse — update Users table
    await pool.request()
      .input("id", sql.Int, Number(targetId))
      .input("name", sql.NVarChar(50), (name ?? "").slice(0, 50))
      .input("surname", sql.NVarChar(50), (surname ?? "").slice(0, 50))
      .input("contactNo", sql.NVarChar(10), (phone ?? "").slice(0, 10))
      .input("dob", sql.NVarChar(50), (dob ?? "").slice(0, 50))
      .query("UPDATE Users SET Name=@name, Surname=@surname, ContactNo=@contactNo, DOB=@dob WHERE UserID=@id");

    const r = await pool.request()
      .input("id", sql.Int, Number(targetId))
      .query("SELECT * FROM Users WHERE UserID=@id");
    return res.json(mapNurse(r.recordset[0] as Record<string, unknown>));
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

export default router;
